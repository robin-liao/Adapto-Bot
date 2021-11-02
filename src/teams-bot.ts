// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  AppBasedLinkQuery,
  Attachment,
  BotHandler,
  CardFactory,
  ConversationState,
  InvokeResponse,
  MessagingExtensionAction,
  MessagingExtensionActionResponse,
  MessagingExtensionQuery,
  MessagingExtensionResponse,
  SigninStateVerificationQuery,
  StatusCodes,
  TabRequest,
  TabResponse,
  TaskModuleRequest,
  TaskModuleResponse,
  TeamsActivityHandler,
  TeamsChannelData,
  TurnContext,
} from "botbuilder";
import { Router } from "express";
import { Auth } from "./auth";
import { CardGenerator } from "./card-gen";
import { CardUpdate } from "./scenarios/card-update";
import { DefaultBot } from "./scenarios/default-bot";
import { ConvSetting, ConvSettingTable } from "./storage/setting-table";
import { IAdaptiveCardTab } from "./tabs";
import { ITaskModule } from "./task-modules";
import { getConversationId, printableJson, sleep } from "./utils";

export interface ITeamsScenario {
  accept(teamsBot: IScenarioBuilder);
}

export interface IScenarioBuilder {
  registerTextCommand(pattern: RegExp, handler: TextCommandCallback);
  registerInvoke(intent: string, handler: InvokeCallback);
  registerTaskModule(commandId: string, task: ITaskModule);
  registerTab(tabEntityId: string, tab: IAdaptiveCardTab);
  registerMessageExtensionQuery(
    commandId: string,
    handler: MessageExtensionQueryCallback
  );

  sendCard(
    ctx: TurnContext,
    card: Attachment,
    alert?: boolean,
    repeat?: number
  ): Promise<string[]>;
}

export class TeamsBot extends TeamsActivityHandler implements IScenarioBuilder {
  private readonly msgExtHandler = new MessageExtensionHandler();
  private readonly textCmdHandler = new TextCommandHandler();
  private readonly tmHandler = new TaskModuleHandler();
  private readonly tabHandler = new TabHandler();
  private readonly invokeHandler = new InvokeHandler();

  constructor(conversationState: ConversationState) {
    super();
    this.setupHandlers();
    this.setupScenarios();
  }

  public getTaskModuleRouter() {
    return this.tmHandler.taskModuleRouter;
  }

  public registerTextCommand(pattern: RegExp, handler: TextCommandCallback) {
    this.textCmdHandler.register(pattern, handler);
  }

  public registerInvoke(intent: string, handler: InvokeCallback) {
    this.invokeHandler.register(intent, handler);
  }

  public registerTaskModule(cmdID: string, task: ITaskModule) {
    this.tmHandler.register(cmdID, task);
  }

  public registerTab(tabEntityId: string, tab: IAdaptiveCardTab) {
    this.tabHandler.register(tabEntityId, tab);
  }

  public registerMessageExtensionQuery(
    commandId: string,
    handler: MessageExtensionQueryCallback
  ) {
    this.msgExtHandler.register(commandId, handler);
  }

  protected async onInvokeActivity(ctx: TurnContext): Promise<InvokeResponse> {
    const result = await super.onInvokeActivity(ctx);
    return result.status === StatusCodes.NOT_IMPLEMENTED
      ? this.handleInvoke(ctx)
      : result;
  }

  protected async handleTeamsAppBasedLinkQuery(
    ctx: TurnContext,
    query: AppBasedLinkQuery
  ): Promise<MessagingExtensionResponse> {
    return Promise.resolve<MessagingExtensionResponse>({
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: [
          {
            ...CardGenerator.adaptive.appBasedLinkCard(query.url),
            preview: {
              contentType: CardFactory.contentTypes.heroCard,
              content: {
                title: "App-Based Link Preview Card",
                subtitle: query.url,
                text: JSON.stringify(query),
              },
            },
          },
        ],
        suggestedActions: {
          actions: [
            {
              type: "setDefaultUrlPreviewType",
              value: "Card",
              title: "",
            },
            {
              type: "setCachePolicy",
              value: `{\"type\":\"no-cache\"}`,
              title: "",
            },
          ],
        },
      },
    });
  }

  protected async handleTeamsMessagingExtensionQuery(
    ctx: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    const cmdId = query.commandId;
    return this.msgExtHandler.handleTeamsMessagingExtensionQuery(
      cmdId,
      ctx,
      query
    );
  }

  protected async handleTeamsMessagingExtensionCardButtonClicked(
    ctx: TurnContext,
    cardData: any
  ): Promise<void> {
    await this.handleInvoke(ctx);
  }

  protected async handleTeamsSigninVerifyState(
    ctx: TurnContext,
    query: SigninStateVerificationQuery
  ): Promise<void> {
    await Auth.verifySigninState(ctx, query.state);
  }

  protected handleTeamsTaskModuleFetch(
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse> {
    const cmdId = request.data?.commandId;
    return this.tmHandler.handleTeamsTaskModuleFetch(cmdId, ctx, request);
  }

  protected handleTeamsTaskModuleSubmit(
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse> {
    const cmdId = request.data?.commandId;
    return this.tmHandler.handleTeamsTaskModuleSubmit(cmdId, ctx, request);
  }

  protected handleTeamsMessagingExtensionFetchTask(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    const { commandId } = request;
    return this.tmHandler.handleTeamsMessagingExtensionFetchTask(
      commandId,
      ctx,
      request
    );
  }

  protected handleTeamsMessagingExtensionSubmitActionDispatch(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    const { commandId } = request;
    return this.tmHandler.handleTeamsMessagingExtensionSubmitActionDispatch(
      commandId,
      ctx,
      request
    );
  }

  protected handleTeamsTabFetch(
    ctx: TurnContext,
    request: TabRequest
  ): Promise<TabResponse> {
    const {
      tabContext: { tabEntityId },
    } = request;
    return this.tabHandler.handleTeamsTabFetch(tabEntityId, ctx, request);
  }

  protected handleTeamsTabSubmit(
    ctx: TurnContext,
    request: TabRequest
  ): Promise<TabResponse> {
    const {
      tabContext: { tabEntityId },
    } = request;
    return this.tabHandler.handleTeamsTabSubmit(tabEntityId, ctx, request);
  }

  private setupHandlers() {
    this.onMessage((ctx, next) =>
      ctx.activity.value
        ? this.handleOnMessageBack(ctx, next)
        : this.handleOnMessage(ctx, next)
    );
    this.registerOnTeamsEvents();
  }

  private setupScenarios() {
    new DefaultBot().accept(this);
    new CardUpdate().accept(this);
  }

  private handleOnMessage: BotHandler = async (ctx, next) => {
    const dispatched = await this.textCmdHandler.dispatch(ctx);
    if (!dispatched) {
      await this.echo(ctx);
    }
    next();
  };

  private handleOnMessageBack: BotHandler = async (ctx, next) => {
    const res = await this.handleInvoke(ctx);
    if (res.status === StatusCodes.NOT_FOUND) {
      await this.echo(ctx);
      await sleep(1000);
    }
    next();
  };

  public async handleInvoke(ctx: TurnContext): Promise<InvokeResponse> {
    if (ctx.activity.name) {
      switch (ctx.activity.name) {
        case "composeExtension/fetchCommands":
          return { status: StatusCodes.OK };
      }
    }

    const res = await this.invokeHandler.dispatch(ctx);
    return res ?? { status: StatusCodes.NOT_FOUND };
  }

  private registerOnTeamsEvents() {
    const sendJSON = async (
      eventName: string,
      obj: any,
      ctx: TurnContext,
      next: () => Promise<void>,
      settingKey?: keyof ConvSetting
    ) => {
      let enable = true;
      const convId = getConversationId(ctx.activity);
      if (settingKey && convId) {
        const setting = await new ConvSettingTable(convId).get();
        enable = !!setting?.[settingKey];
      }

      if (enable) {
        await ctx.sendActivity({
          textFormat: "xml",
          text: `<strong>${eventName}</strong><br/><pre>${JSON.stringify(
            obj,
            null,
            2
          )}</pre>`,
        });
      }
      return next();
    };

    this.onTeamsChannelCreatedEvent((channelInfo, teamInfo, ctx, next) =>
      sendJSON(
        "onTeamsChannelCreatedEvent",
        { channelInfo, teamInfo },
        ctx,
        next,
        "echoAllTeamsEvents"
      )
    );

    this.onTeamsChannelDeletedEvent((channelInfo, teamInfo, ctx, next) =>
      sendJSON(
        "onTeamsChannelDeletedEvent",
        { channelInfo, teamInfo },
        ctx,
        next,
        "echoAllTeamsEvents"
      )
    );

    this.onTeamsChannelRenamedEvent((channelInfo, teamInfo, ctx, next) =>
      sendJSON(
        "onTeamsChannelRenamedEvent",
        { channelInfo, teamInfo },
        ctx,
        next,
        "echoAllTeamsEvents"
      )
    );

    this.onTeamsChannelRestoredEvent((channelInfo, teamInfo, ctx, next) =>
      sendJSON(
        "onTeamsChannelRestoredEvent",
        { channelInfo, teamInfo },
        ctx,
        next,
        "echoAllTeamsEvents"
      )
    );

    this.onTeamsMembersAddedEvent((membersAdded, teamInfo, ctx, next) =>
      sendJSON(
        "onTeamsMembersAddedEvent",
        { membersAdded, teamInfo },
        ctx,
        next,
        "echoAllTeamsEvents"
      )
    );

    this.onTeamsMembersRemovedEvent((membersRemoved, teamInfo, ctx, next) =>
      sendJSON(
        "onTeamsMembersRemovedEvent",
        { membersRemoved, teamInfo },
        ctx,
        next,
        "echoAllTeamsEvents"
      )
    );

    this.onTeamsTeamArchivedEvent((teamInfo, ctx, next) =>
      sendJSON(
        "onTeamsTeamArchivedEvent",
        { teamInfo },
        ctx,
        next,
        "echoAllTeamsEvents"
      )
    );

    this.onTeamsTeamDeletedEvent((teamInfo, ctx, next) =>
      sendJSON(
        "onTeamsTeamDeletedEvent",
        { teamInfo },
        ctx,
        next,
        "echoAllTeamsEvents"
      )
    );

    this.onTeamsTeamHardDeletedEvent((teamInfo, ctx, next) =>
      sendJSON(
        "onTeamsTeamHardDeletedEvent",
        { teamInfo },
        ctx,
        next,
        "echoAllTeamsEvents"
      )
    );

    this.onTeamsTeamRenamedEvent((teamInfo, ctx, next) =>
      sendJSON(
        "onTeamsTeamRenamedEvent",
        { teamInfo },
        ctx,
        next,
        "echoAllTeamsEvents"
      )
    );

    this.onTeamsTeamRestoredEvent((teamInfo, ctx, next) =>
      sendJSON(
        "onTeamsTeamRestoredEvent",
        { teamInfo },
        ctx,
        next,
        "echoAllTeamsEvents"
      )
    );

    this.onTeamsTeamUnarchivedEvent((teamInfo, ctx, next) =>
      sendJSON(
        "onTeamsTeamUnarchivedEvent",
        { teamInfo },
        ctx,
        next,
        "echoAllTeamsEvents"
      )
    );

    this.onReactionsAdded((ctx, next) =>
      sendJSON(
        "onReactionsAdded",
        { reactionsAdded: ctx.activity.reactionsAdded },
        ctx,
        next,
        "echoMessageReaction"
      )
    );

    this.onReactionsRemoved((ctx, next) =>
      sendJSON(
        "onReactionsRemoved",
        { reactionsRemoved: ctx.activity.reactionsRemoved },
        ctx,
        next,
        "echoMessageReaction"
      )
    );
  }

  private async echo(ctx: TurnContext) {
    const convId = getConversationId(ctx.activity);
    if (convId) {
      const setting = await new ConvSettingTable(convId).get();
      if (!setting?.echoMessage) {
        return;
      }
    }
    const card = CardFactory.adaptiveCard({
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
      body: [
        {
          type: "FactSet",
          facts: [
            {
              title: "type",
              value: ctx.activity.type,
            },
            {
              title: "text",
              value: ctx.activity.text,
            },
            ...(ctx.activity.value
              ? [
                  {
                    title: "value",
                    value: JSON.stringify(ctx.activity.value),
                  },
                ]
              : []),
          ],
        },
      ],
      actions: [
        {
          type: "Action.ShowCard",
          title: "Show Full Activity",
          card: {
            type: "AdaptiveCard",
            body: [
              {
                type: "RichTextBlock",
                inlines: [
                  {
                    type: "TextRun",
                    fontType: "Monospace",
                    text: printableJson(ctx.activity, {
                      indentChar: "　",
                      colorize: false,
                    }),
                  },
                ],
              },
            ],
          },
        },
      ],
      msTeams: {
        width: "full",
      },
    });

    await this.sendCard(ctx, card);
    // await ctx.sendActivity({
    //   // textFormat: "xml",
    //   // text: `${prefix ? `<b>${prefix}</b>` : ""}<pre>${JSON.stringify(
    //   //   ctx.activity,
    //   //   null,
    //   //   2
    //   // )}</pre>`,
    //   attachments: [card],
    // });
  }

  public async sendCard(
    ctx: TurnContext,
    card: Attachment,
    alert: boolean = true,
    repeat: number = 1,
    onBehalf: {
      mri: string;
      displayName: string;
    } = {
      mri: "97b1ec61-45bf-453c-9059-6e8984e0cef4",
      displayName: "Robin Liao",
    }
  ): Promise<string[]> {
    const send = () =>
      ctx.sendActivity({
        attachments: [card],
        channelData: {
          notification: { alert },
          ...(onBehalf && {
            onBehalf: [
              {
                itemId: 0,
                mentionType: "person",
                mri: onBehalf.mri,
                displayName: onBehalf.displayName,
              },
            ],
          }),
        } as TeamsChannelData,
      });

    if (repeat <= 1) {
      const res = await send();
      console.log(`MESSAGE_SENT_ID = ${res.id}`);
      return [res.id];
    } else {
      const idToDel: string[] = [];
      for (let i = 0; i < repeat; ++i) {
        const res1 = await ctx.sendActivity(`${i + 1} / ${repeat}`);
        idToDel.push(res1.id);
        await sleep(2000);
        const res2 = await send();
        idToDel.push(res2.id);
        await sleep(5000);
      }

      for (const id of idToDel) {
        await ctx.deleteActivity(id);
      }
      return idToDel;
    }
  }
}

type MessageExtensionQueryCallback = (
  ctx: TurnContext,
  query: MessagingExtensionQuery
) => Promise<MessagingExtensionResponse>;

class MessageExtensionHandler {
  private lookup: { [cmdId: string]: MessageExtensionQueryCallback } = {};

  public register(cmdID: string, handler: MessageExtensionQueryCallback) {
    this.lookup[cmdID] = handler;
  }

  public handleTeamsMessagingExtensionQuery(
    commandId: string,
    ctx: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    const x = this.lookup[commandId];
    return x ? x(ctx, query) : Promise.resolve({});
  }
}

type TextCommandCallback = (
  ctx: TurnContext,
  command: string,
  args: string[]
) => Promise<void>;

class TextCommandHandler {
  private lookup: Map<RegExp, TextCommandCallback> = new Map();

  public register(pattern: RegExp, handler: TextCommandCallback) {
    this.lookup.set(pattern, handler);
  }

  public async dispatch(ctx: TurnContext) {
    let text = TurnContext.removeRecipientMention(ctx.activity);
    text = text?.trim() ?? "";
    for (const [pattern, cb] of this.lookup) {
      if (pattern.test(text)) {
        const [command, ...args] = text.split(/\s+/);
        await cb(ctx, command, args);
        return true;
      }
    }
    return false;
  }
}

type InvokeCallback = (ctx: TurnContext) => Promise<InvokeResponse>;

class InvokeHandler {
  private lookup: { [intent: string]: InvokeCallback } = {};

  public register(intent: string, handler: InvokeCallback) {
    if (this.lookup[intent]) {
      throw new Error(`Invoke handler for intent "${intent}" already exists`);
    }
    this.lookup[intent] = handler;
  }

  public async dispatch(ctx: TurnContext): Promise<InvokeResponse | undefined> {
    const intentQry: string = ctx.activity.value?.intent;
    return this.lookup[intentQry]?.(ctx);
  }
}

class TaskModuleHandler {
  private router = Router();
  private lookup: { [commandId: string]: ITaskModule } = {};

  constructor() {
    // default root
    this.router.get("/", (req, res) => {
      const json = {
        path: req.path,
        query: req.query,
        params: req.params,
      };
      res.send(json);
      res.end();
    });
  }

  public get taskModuleRouter() {
    return this.router;
  }

  public register(cmdID: string, task: ITaskModule) {
    if (task.getRouter) {
      this.router.use(`/${cmdID}`, task.getRouter());
    }
    this.lookup[cmdID] = task;
  }

  public handleTeamsTaskModuleFetch(
    commandId: string,
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse> {
    const tm = this.lookup[commandId];
    return tm ? tm.fetch(ctx, request) : Promise.resolve({});
  }

  public handleTeamsTaskModuleSubmit(
    commandId: string,
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse> {
    const tm = this.lookup[commandId];
    return tm ? tm.submit(ctx, request) : Promise.resolve({});
  }

  public handleTeamsMessagingExtensionFetchTask(
    commandId: string,
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    const tm = this.lookup[commandId];
    return tm ? tm.fetch(ctx, request) : Promise.resolve({});
  }

  public handleTeamsMessagingExtensionSubmitActionDispatch(
    commandId: string,
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    const tm = this.lookup[commandId];
    return tm ? tm.submit(ctx, request) : Promise.resolve({});
  }
}

class TabHandler {
  private lookup: { [tabEntityId: string]: IAdaptiveCardTab } = {};

  public register(tabEntityId: string, tab: IAdaptiveCardTab) {
    this.lookup[tabEntityId] = tab;
  }

  public handleTeamsTabFetch(
    tabEntityId: string,
    ctx: TurnContext,
    request: TabRequest
  ): Promise<TabResponse> {
    const tab = this.lookup[tabEntityId];
    return tab ? tab.fetch(ctx, request) : Promise.resolve({ tab: {} });
  }

  public handleTeamsTabSubmit(
    tabEntityId: string,
    ctx: TurnContext,
    request: TabRequest
  ): Promise<TabResponse> {
    const tab = this.lookup[tabEntityId];
    return tab ? tab.submit(ctx, request) : Promise.resolve({ tab: {} });
  }
}
