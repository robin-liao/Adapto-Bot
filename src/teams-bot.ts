// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  AdaptiveCardInvokeResponse,
  AdaptiveCardInvokeValue,
  AppBasedLinkQuery,
  Attachment,
  BotHandler,
  CardFactory,
  ConversationState,
  FileConsentCard,
  FileConsentCardResponse,
  FileDownloadInfo,
  FileDownloadInfoAttachment,
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
import { DOWNLOAD_INFO_CONTENT_TYPE, IBotFileHandler } from "./bot-file-helper";
import { CardGenerator } from "./card-gen";
import { GPTBot } from "./ai/gpt-bot";
import { outgoingWebhookRouter } from "./outgoing-webhook-router";
import { AuthBot } from "./scenarios/auth-bot";
import { CardUpdate } from "./scenarios/card-update";
import { DefaultBot } from "./scenarios/default-bot";
import { FileBot } from "./scenarios/file-bot";
import { MentionBot } from "./scenarios/mention-bot";
import { MessageExtensionBot } from "./scenarios/message-extension-bot";
import { SearchBot } from "./scenarios/search-bot";
import { SMEMessageExtension } from "./scenarios/sme-message-extension";
import { TaskModuleAppJIT } from "./scenarios/task-module-app-jit";
import { TaskModuleFullTest } from "./scenarios/task-module-full-test";
import { WorkBot } from "./scenarios/work-bot";
import {
  UniversalSearchRequest,
  UniversalSearchResponse,
} from "./search.interface";
import { ConvSetting, ConvSettingTable } from "./storage/setting-table";
import { IAdaptiveCardTab } from "./tabs";
import { IMessagingExtensionAction, ITaskModule } from "./task-modules";
import {
  getConversationId,
  OneOnOneHelper,
  printableJson,
  sleep,
} from "./utils";
import { TaskModuleAdaptiveCardList } from "./task-modules/ac-sample-list";
import { ActivityGenerator } from "./scenarios/activity-generator";
import { WebRTCBot } from "./ai/wrtc-bot";
import WebSocket from "ws";
import * as _ from "lodash";

export interface ITeamsScenario {
  accept(teamsBot: IScenarioBuilder);
}

export interface IScenarioBuilder {
  registerTextCommand(pattern: RegExp, handler: TextCommandCallback);
  registerInvoke(intent: string, handler: InvokeCallback);
  registerACv2Handler(intent: string, handler: ACv2Callback);
  registerUniversalSearch(dataset: string, handler: InvokeSearchCallback);
  registerTaskModule(commandId: string, task: ITaskModule);
  registerTab(tabEntityId: string, tab: IAdaptiveCardTab);
  registerTabRouter(tabEntityId: string, router: Router);
  registerMessageExtensionQuery(
    commandId: string,
    handler: MessageExtensionQueryCallback
  );
  registerMessageExtensionSetting(
    commandId: string,
    handler: MessageExtensionSettingHandler
  );
  registerFileHandler(handler: IBotFileHandler);
  registerWebSocketHandler<T>(
    eventTarget: string,
    handler: WebScoketCallback<T>
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
  private readonly acv2Handler = new AdaptiveCardV2Handler();
  private readonly fileHandlers: IBotFileHandler[] = [];
  private readonly wsHandler = new WebSocketHandler();

  constructor(conversationState: ConversationState) {
    super();
    this.setupHandlers();
    this.setupScenarios();
  }

  public onWebSocketConnection(ws: WebSocket) {
    this.wsHandler.onConnection(ws);
  }

  public getTabRouter() {
    return this.tabHandler.tabRouter;
  }

  public getTaskModuleRouter() {
    return this.tmHandler.taskModuleRouter;
  }

  public getMessageExtensionSettingRouter() {
    return this.msgExtHandler.settingRouter;
  }

  public getOutgoingWebhookRouter() {
    return outgoingWebhookRouter;
  }

  public registerTextCommand(pattern: RegExp, handler: TextCommandCallback) {
    this.textCmdHandler.register(pattern, handler);
  }

  public registerInvoke(intent: string, handler: InvokeCallback) {
    this.invokeHandler.register(intent, handler);
  }

  public registerUniversalSearch(
    dataset: string,
    handler: InvokeSearchCallback
  ) {
    this.invokeHandler.registerUniversalSearch(dataset, handler);
  }

  public registerACv2Handler(intent: string, handler: ACv2Callback) {
    this.acv2Handler.register(intent, handler);
  }

  public registerTaskModule(cmdID: string, task: ITaskModule) {
    this.tmHandler.register(cmdID, task);
  }

  public registerTab(tabEntityId: string, tab: IAdaptiveCardTab) {
    this.tabHandler.register(tabEntityId, tab);
  }

  public registerTabRouter(tabEntityId: string, router: Router) {
    this.tabHandler.registerRouter(tabEntityId, router);
  }

  public registerMessageExtensionQuery(
    commandId: string,
    handler: MessageExtensionQueryCallback
  ) {
    this.msgExtHandler.register(commandId, handler);
  }

  public registerMessageExtensionSetting(
    commandId: string,
    handler: MessageExtensionSettingHandler
  ) {
    this.msgExtHandler.registerSetting(commandId, handler);
  }

  public registerFileHandler(handler: IBotFileHandler) {
    if (!this.fileHandlers.includes(handler)) {
      this.fileHandlers.push(handler);
    }
  }

  public registerWebSocketHandler<T>(
    eventTarget: string,
    handler: WebScoketCallback<T>
  ) {
    this.wsHandler.register(eventTarget, handler);
  }

  protected async onInvokeActivity(ctx: TurnContext): Promise<InvokeResponse> {
    const result = await super.onInvokeActivity(ctx);
    return result.status === StatusCodes.NOT_IMPLEMENTED
      ? this.handleInvoke(ctx)
      : result;
  }

  protected async onAdaptiveCardInvoke(
    ctx: TurnContext,
    { action: { data } }: AdaptiveCardInvokeValue
  ): Promise<AdaptiveCardInvokeResponse> {
    const res = await this.acv2Handler.dispatch(ctx, data);
    return (
      res ?? {
        statusCode: StatusCodes.NOT_FOUND,
        type: "application/vnd.microsoft.activity.message",
        value: {},
      }
    );
  }

  protected async handleTeamsAppBasedLinkQuery(
    ctx: TurnContext,
    query: AppBasedLinkQuery
  ): Promise<MessagingExtensionResponse> {
    await sleep(5000);
    return Promise.resolve<MessagingExtensionResponse>({
      composeExtension: {
        attachments: [
          {
            content: {
              type: "AdaptiveCard",
              body: [
                {
                  color: null,
                  horizontalAlignment: null,
                  isSubtle: false,
                  maxLines: 0,
                  size: "large",
                  text: "Adatum Corporation",
                  weight: "bolder",
                  wrap: false,
                  separator: false,
                  type: "TextBlock",
                },
                {
                  color: null,
                  horizontalAlignment: null,
                  isSubtle: false,
                  maxLines: 0,
                  size: "medium",
                  text: "Customer Card",
                  weight: null,
                  wrap: true,
                  spacing: "none",
                  separator: false,
                  type: "TextBlock",
                },
                {
                  altText: "Specifies the picture for Customer Card",
                  horizontalAlignment: "center",
                  size: "stretch",
                  style: "person",
                  url: "https://us-api.asm.skype.com/v1/objects/0-wus-d2-10a3eec86072a6fdf698ad27317ab9d7/views/img_preview",
                  height: "175px",
                  spacing: "none",
                  separator: false,
                  type: "Image",
                },
                {
                  facts: [
                    { title: "No.:", value: "10000" },
                    { title: "Balance ($):", value: "0" },
                    { title: "Contact Name:", value: "Robert Townes" },
                    { title: "Balance Due ($):", value: "0" },
                  ],
                  separator: false,
                  type: "FactSet",
                },
              ],
              actions: [
                {
                  url: "https://teams.microsoft.com/l/stage/84c2de91-84e8-4bbf-b15d-9ef33245ad29/0?context=%7B%22contentUrl%22%3A%22https%3A%2F%2Fbusinesscentral.dynamics.com%2Fd0ba1a99-176f-4fac-b3ab-9c267ea124d5%2FProduction%2Fteams%3Fpage%3D21%26company%3DCRONUS%20USA%252C%20Inc.%26dc%3D0%26bookmark%3D21%253bEgAAAAJ7BTEAMAAwADAAMA%253d%253d%22%2C%22websiteUrl%22%3A%22https%3A%2F%2Fbusinesscentral.dynamics.com%3A443%2Fd0ba1a99-176f-4fac-b3ab-9c267ea124d5%2FProduction%3Fpage%3D21%26company%3DCRONUS%2520USA%252C%2520Inc.%26dc%3D0%26bookmark%3D21%253bEgAAAAJ7BTEAMAAwADAAMA%253d%253d%22%2C%22name%22%3A%22Adatum%20Corporation%22%7D",
                  title: "Details",
                  type: "Action.OpenUrl",
                },
              ],
              version: "1.2",
            },
            contentType: "application/vnd.microsoft.card.adaptive",
            preview: {
              content: { title: "Customer Card", text: "" },
              contentType: "application/vnd.microsoft.card.hero",
            },
          },
        ],
        suggestedActions: {
          actions: [
            { title: "", type: "setCachePolicy", value: `{"type":"no-cache"}` },
          ],
        },
        type: "result",
        attachmentLayout: "list",
      },
      responseType: "composeExtension",
    } as any);
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

  protected async handleTeamsMessagingExtensionConfigurationQuerySettingUrl(
    ctx: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    const cmdId = query.commandId;
    return this.msgExtHandler.handleTeamsMessagingExtensionConfigurationQuerySettingUrl(
      cmdId,
      ctx,
      query
    );
  }

  protected async handleTeamsMessagingExtensionConfigurationSetting(
    ctx: TurnContext,
    settings: any
  ): Promise<void> {
    const cmdId = ctx.activity.value.commandId as string;
    await this.msgExtHandler.handleTeamsMessagingExtensionConfigurationSetting(
      cmdId,
      ctx,
      settings
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

  protected handleTeamsMessagingExtensionSubmitAction(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    const { commandId } = request;
    return this.tmHandler.handleTeamsMessagingExtensionSubmitAction(
      commandId,
      ctx,
      request
    );
  }

  protected async handleTeamsMessagingExtensionBotMessagePreviewEdit(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    const { commandId } = request;
    return this.tmHandler.handleTeamsMessagingExtensionSubmitAction(
      commandId,
      ctx,
      request,
      "edit"
    );
  }

  protected async handleTeamsMessagingExtensionBotMessagePreviewSend(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    const { commandId } = request;
    return this.tmHandler.handleTeamsMessagingExtensionSubmitAction(
      commandId,
      ctx,
      request,
      "send"
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

  protected async handleTeamsFileConsentAccept(
    ctx: TurnContext,
    fileConsentCardResponse: FileConsentCardResponse
  ): Promise<void> {
    const proms = this.fileHandlers.map((h) =>
      h.handleTeamsFileConsentAccept?.(ctx, fileConsentCardResponse)
    );
    await Promise.all(proms);
  }

  protected async handleTeamsFileConsentDecline(
    ctx: TurnContext,
    fileConsentCardResponse: FileConsentCardResponse
  ): Promise<void> {
    const proms = this.fileHandlers.map((h) =>
      h.handleTeamsFileConsentDecline?.(ctx, fileConsentCardResponse)
    );
    await Promise.all(proms);
  }

  private setupHandlers() {
    this.onMessage((ctx, next) => {
      OneOnOneHelper.saveOneOnOneConvRef(ctx);
      return ctx.activity.value
        ? this.handleOnMessageBack(ctx, next)
        : ctx.activity.attachments?.some(
            (x) => x.contentType === DOWNLOAD_INFO_CONTENT_TYPE
          )
        ? this.handleOnMessageWithFileDownload(ctx, next)
        : this.handleOnMessage(ctx, next);
    });
    this.registerOnTeamsEvents();
  }

  private setupScenarios() {
    new DefaultBot().accept(this);
    new CardUpdate().accept(this);
    new FileBot().accept(this);
    new WorkBot().accept(this);
    new MessageExtensionBot().accept(this);
    new SearchBot().accept(this);
    new TaskModuleFullTest().accept(this);
    new MentionBot().accept(this);
    new TaskModuleAppJIT().accept(this);
    new GPTBot().accept(this);
    new AuthBot().accept(this);
    new SMEMessageExtension().accept(this);
    new TaskModuleAdaptiveCardList().accept(this);
    new ActivityGenerator().accept(this);
    new WebRTCBot().accept(this);
  }

  private async handleOnMessage(ctx: TurnContext, next: () => Promise<void>) {
    const dispatched = await this.textCmdHandler.dispatch(ctx);
    if (!dispatched) {
      try {
        const json = JSON.parse(ctx.activity.text.trim());
        if (json.contentType && json.content) {
          await this.sendCard(ctx, {
            contentType: json.contentType,
            content: json.content,
          });
        } else {
          const card = CardFactory.adaptiveCard(json);
          await this.sendCard(ctx, card);
        }
      } catch {
        await this.echo(ctx);
      }
    }
    next();
  }

  private async handleOnMessageBack(
    ctx: TurnContext,
    next: () => Promise<void>
  ) {
    const res = await this.handleInvoke(ctx);
    if (res.status === StatusCodes.NOT_FOUND) {
      await this.echo(ctx);
      await sleep(1000);
    }
    next();
  }

  private async handleOnMessageWithFileDownload(
    ctx: TurnContext,
    next: () => Promise<void>
  ) {
    const attachments = ctx.activity.attachments?.filter(
      (x) => x.contentType === DOWNLOAD_INFO_CONTENT_TYPE
    ) as FileDownloadInfoAttachment[];
    const files = attachments.map((x) => x.content);
    const proms = this.fileHandlers.map((h) =>
      h.onMessageWithFileDownloadInfo?.(ctx, files)
    );
    await Promise.all(proms);
    next();
  }

  public async handleInvoke(ctx: TurnContext): Promise<InvokeResponse> {
    if (ctx.activity.name) {
      switch (ctx.activity.name) {
        case "composeExtension/fetchCommands":
        case "message/submitAction":
          return { status: StatusCodes.OK };
      }
    }

    const res = await this.invokeHandler.dispatch(ctx);
    return res ?? { status: StatusCodes.NOT_FOUND };
  }

  protected async dispatchConversationUpdateActivity(
    ctx: TurnContext
  ): Promise<void> {
    OneOnOneHelper.saveOneOnOneConvRef(ctx);
    return super.dispatchConversationUpdateActivity(ctx);
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
    const send = () => {
      try {
        return ctx.sendActivity({
          summary: "Hey you got a card message!",
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
      } catch (err) {
        console.error(err);
      }
    };

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

type MessageExtensionSettingHandler = {
  querySettingUrl: MessageExtensionQueryCallback;
  updateSettings: (ctx: TurnContext, settings: any) => Promise<void>;
  getRouter?: () => Router;
};

class MessageExtensionHandler {
  private router = Router();

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

  private lookup: { [cmdId: string]: MessageExtensionQueryCallback } = {};
  private lookupSettings: { [cmdId: string]: MessageExtensionSettingHandler } =
    {};

  public get settingRouter() {
    return this.router;
  }

  public register(cmdID: string, handler: MessageExtensionQueryCallback) {
    this.lookup[cmdID] = handler;
  }

  public registerSetting(
    cmdID: string,
    handler: MessageExtensionSettingHandler
  ) {
    if (handler.getRouter) {
      this.router.use(`/${cmdID}`, handler.getRouter());
    }
    this.lookupSettings[cmdID] = handler;
  }

  public handleTeamsMessagingExtensionQuery(
    commandId: string,
    ctx: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    const x = this.lookup[commandId];
    return x ? x(ctx, query) : Promise.resolve({});
  }

  public handleTeamsMessagingExtensionConfigurationQuerySettingUrl(
    commandId: string,
    ctx: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    const x = this.lookupSettings[commandId];
    return x?.querySettingUrl
      ? x.querySettingUrl(ctx, query)
      : Promise.resolve({});
  }

  public handleTeamsMessagingExtensionConfigurationSetting(
    commandId: string,
    ctx: TurnContext,
    settings: any
  ): Promise<void> {
    const x = this.lookupSettings[commandId];
    return x?.updateSettings
      ? x.updateSettings(ctx, settings)
      : Promise.resolve();
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
type InvokeSearchCallback = (
  request: UniversalSearchRequest,
  ctx: TurnContext
) => Promise<InvokeResponse<UniversalSearchResponse>>;

class InvokeHandler {
  private lookup: { [intent: string]: InvokeCallback } = {};
  private lookupSearch: { [dataset: string]: InvokeSearchCallback } = {};

  public register(intent: string, handler: InvokeCallback) {
    if (this.lookup[intent]) {
      throw new Error(`Invoke handler for intent "${intent}" already exists`);
    }
    this.lookup[intent] = handler;
  }

  public registerUniversalSearch(
    dataset: string,
    handler: InvokeSearchCallback
  ) {
    if (this.lookupSearch[dataset]) {
      throw new Error(
        `Invoke search handler for intent "${dataset}" already exists`
      );
    }
    this.lookupSearch[dataset] = handler;
  }

  public async dispatch(ctx: TurnContext): Promise<InvokeResponse | undefined> {
    const intentQry: string = ctx.activity.value?.intent;
    if (this.lookup[intentQry]) {
      return this.lookup[intentQry]?.(ctx);
    } else if (ctx.activity.name === "application/search") {
      const datasetQry = (ctx.activity.value as UniversalSearchRequest)
        ?.dataset;
      if (this.lookupSearch[datasetQry]) {
        return this.lookupSearch[datasetQry]?.(ctx.activity.value, ctx);
      }
    }
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

  public handleTeamsMessagingExtensionSubmitAction(
    commandId: string,
    ctx: TurnContext,
    request: MessagingExtensionAction,
    userPreviewResponse?: "edit" | "send"
  ): Promise<MessagingExtensionActionResponse> {
    const tm = this.lookup[commandId] as IMessagingExtensionAction;
    return tm
      ? userPreviewResponse
        ? tm.onBotMessagePreviewResponse?.(ctx, request, userPreviewResponse)
        : tm.submit(ctx, request)
      : Promise.resolve({});
  }
}

class TabHandler {
  private lookup: { [tabEntityId: string]: IAdaptiveCardTab } = {};
  private router = Router();

  public get tabRouter() {
    return this.router;
  }

  public register(tabEntityId: string, tab: IAdaptiveCardTab) {
    this.lookup[tabEntityId] = tab;
  }

  public registerRouter(tabEntityId: string, router: Router) {
    this.router.use(`/${tabEntityId}`, router);
  }

  public handleTeamsTabFetch(
    tabEntityId: string,
    ctx: TurnContext,
    request: TabRequest
  ): Promise<TabResponse> {
    const tab = this.lookup[tabEntityId];
    return tab ? tab.tabFetch(ctx, request) : Promise.resolve({ tab: {} });
  }

  public handleTeamsTabSubmit(
    tabEntityId: string,
    ctx: TurnContext,
    request: TabRequest
  ): Promise<TabResponse> {
    const tab = this.lookup[tabEntityId];
    return tab ? tab.tabSubmit(ctx, request) : Promise.resolve({ tab: {} });
  }
}

type ACv2Callback = (
  ctx: TurnContext,
  data: any
) => Promise<AdaptiveCardInvokeResponse>;

class AdaptiveCardV2Handler {
  private lookup: { [intent: string]: ACv2Callback } = {};

  public register(intent: string, handler: ACv2Callback) {
    if (this.lookup[intent]) {
      throw new Error(`Invoke handler for intent "${intent}" already exists`);
    }
    this.lookup[intent] = handler;
  }

  public async dispatch(
    ctx: TurnContext,
    data: any
  ): Promise<AdaptiveCardInvokeResponse | undefined> {
    const intentQry: string = data.intent;
    if (this.lookup[intentQry]) {
      return this.lookup[intentQry]?.(ctx, data);
    }
  }
}

type WSFunc = {
  handshake: (ws: WebSocket, args: { convId: string }) => void;
  subscribe: (ws: WebSocket, args: { eventTarget: string }) => void;
  publish: (
    ws: WebSocket,
    args: { eventTarget: string; eventData: any }
  ) => void;
};

type WSFuncArgs<F extends keyof WSFunc> = Parameters<WSFunc[F]>[1];

type WSRequest = {
  func: string;
  args: any;
};

type WSConn = {
  ws: WebSocket;
  state: {
    init: boolean;
    convId: string;
    subscribed: string[];
  };
};

export type WebScoketCallback<T = any> = {
  setSend: (fn: (convId: string, data: T) => void) => void;
  onMessage: (convId: string, event: T) => void;
};

class WebSocketHandler {
  private wsConns: WSConn[] = [];
  private lookup: { [eventTarget: string]: WebScoketCallback } = {};
  private wsFunc: WSFunc;

  constructor() {
    this.wsFunc = {
      handshake: (ws, { convId }) => {
        const conn = this.wsConns.find((v) => v.ws === ws);
        console.log("[handshake] conn: ", !!conn);
        conn.state = {
          init: true,
          convId,
          subscribed: ["systemEvent"],
        };
      },
      subscribe: (ws, { eventTarget }) => {
        const conn = this.wsConns.find((v) => v.ws === ws);
        console.log("[subscribe] conn: ", !!conn);
        if (!conn.state.subscribed.includes(eventTarget)) {
          conn.state.subscribed.push(eventTarget);
        }
      },
      publish: (ws, { eventTarget, eventData }) => {
        const conn = this.wsConns.find((v) => v.ws === ws);
        console.log("[post] conn: ", !!conn);
        this.lookup[eventTarget]?.onMessage(conn.state.convId, eventData);
      },
    };
  }

  public register<T>(eventTarget: string, handler: WebScoketCallback<T>) {
    this.lookup[eventTarget] = handler;
    handler.setSend((toConvId, data) => {
      this.wsConns.forEach(({ ws, state: { init, convId, subscribed } }) => {
        if (init && convId === toConvId && subscribed.includes(eventTarget)) {
          ws.send(JSON.stringify({ eventTarget, eventData: data }));
        }
      });
    });
  }

  public onConnection(ws: WebSocket) {
    const existing = this.wsConns.find((v) => v.ws === ws);
    if (existing) {
      return;
    }
    this.wsConns.push({
      ws,
      state: { init: false, convId: "", subscribed: [] },
    });

    ws.on("message", (msg) => {
      const { func, args } = JSON.parse(msg.toString()) as WSRequest;
      switch (func as keyof WSFunc) {
        case "handshake":
          this.wsFunc.handshake(ws, args as WSFuncArgs<"handshake">);
          break;
        case "subscribe":
          this.wsFunc.subscribe(ws, args as WSFuncArgs<"subscribe">);
          break;
        case "publish":
          this.wsFunc.publish(ws, args as WSFuncArgs<"publish">);
          break;
      }
      // this.lookup[channel]?.onMessage(event);
    });
  }
}
