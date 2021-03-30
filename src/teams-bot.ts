// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  ActivityTypes,
  ConversationState,
  StatePropertyAccessor,
  TurnContext,
  CardFactory,
  StatusCodes,
  INVOKE_RESPONSE_KEY,
  TeamsActivityHandler,
  BotHandler,
  MessagingExtensionQuery,
  MessagingExtensionResponse,
  InvokeResponse,
  TeamsChannelData,
  MessagingExtensionAttachment,
  ThumbnailCard,
  Attachment,
  MessagingExtensionActionResponse,
  TaskModuleRequest,
  TaskModuleResponse,
  MessagingExtensionAction,
  SigninStateVerificationQuery,
  ActivityFactory,
  Activity,
  MessageFactory,
  TaskModuleMessageResponse,
  TaskModuleTaskInfo,
  TeamsInfo,
  TeamsChannelAccount,
} from "botbuilder";
import { CardGenerator, JsonCardLoader } from "./card-gen";
import {
  sleep,
  printableJson,
  teamsSendProactiveMessage,
  isEmail,
} from "./utils";
import * as _ from "lodash";
import { Auth } from "./auth";
import * as tm from "./task-modules";
import { Router } from "express";

export class TeamsBot extends TeamsActivityHandler {
  private readonly msgExtHandler = new MessageExtensionHandler();
  private readonly textCmdHandler = new TextCommandHandler();
  private readonly tmHandler = new TaskModuleHandler();

  constructor(conversationState: ConversationState) {
    super();
    this.setupHandlers();
  }

  public getTaskModuleRouter() {
    return this.tmHandler.taskModuleRouter;
  }

  protected async onInvokeActivity(ctx: TurnContext): Promise<InvokeResponse> {
    const result = await super.onInvokeActivity(ctx);
    return result.status === StatusCodes.NOT_IMPLEMENTED
      ? this.handleInvoke(ctx)
      : result;
  }

  protected async handleTeamsMessagingExtensionQuery(
    ctx: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    switch (query.commandId) {
      case "queryCards":
        return this.msgExtHandler.handleQueryCards(ctx);
      default:
        return {};
    }
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

  private setupHandlers() {
    this.registerTextCommands();
    this.registerTaskModules();
    this.onMessage((ctx, next) =>
      ctx.activity.value
        ? this.handleOnMessageBack(ctx, next)
        : this.handleOnMessage(ctx, next)
    );
  }

  private handleOnMessage: BotHandler = async (ctx, next) => {
    const dispatched = await this.textCmdHandler.dispatch(ctx);
    if (!dispatched) {
      await this.echo(ctx);
    }
    next();
  };

  private handleOnMessageBack: BotHandler = async (ctx, next) => {
    await this.handleInvoke(ctx);
    await this.echo(ctx);
    await sleep(1000);
    next();
  };

  private async handleInvoke(ctx: TurnContext): Promise<InvokeResponse> {
    if (ctx.activity.name) {
      switch (ctx.activity.name) {
        case "composeExtension/fetchCommands":
          break;
      }
    }
    // await this.echo(ctx);
    const value = ctx.activity.value;
    if (value) {
      switch (value.intent) {
        case "updateCard":
          const activity: Partial<Activity> = {
            type: ActivityTypes.Message,
            id: ctx.activity.replyToId,
          };
          switch (value.update) {
            case "toText":
              activity.text = value.text;
              break;

            case "toAdaptiveCard":
              const newCard = CardGenerator.adaptive.getJsonCardOfId(35);
              activity.attachments = [newCard];
              break;

            default:
              const updateCard = CardGenerator.hero.getJsonCardIncludingName(
                "update"
              );
              updateCard.content.text = value.text;
              activity.attachments = [updateCard];
          }
          await ctx.updateActivity(activity);
          break;

        case "deleteCard":
          await ctx.deleteActivity(ctx.activity.replyToId);
          break;

        case "delay":
          await sleep(value.delay);
          break;
      }
    }
    return { status: StatusCodes.OK };
  }

  private registerTaskModules() {
    this.tmHandler.register("oneStep", new tm.TaskModuleOneStep("oneStep"));
    this.tmHandler.register(
      "createCard",
      new tm.TaskModuleCardCreate("createCard")
    );
    this.tmHandler.register(
      "cardMention",
      new tm.TaskModuleCardMention("cardMention")
    );
    this.tmHandler.register(
      "launchTaskModule",
      new tm.TaskModuleLaunch("launchTaskModule")
    );
  }

  private registerTextCommands() {
    this.textCmdHandler.register(
      /^adaptiveCard markdownEscape/i,
      async (ctx) => {
        const card = CardGenerator.adaptive.markdownEscape();
        await ctx.sendActivity({ attachments: [card] });
      }
    );

    this.textCmdHandler.register(/^image/i, async (ctx) => {
      await ctx.sendActivity({
        textFormat: "markdown",
        text: `__text__ <img src="https://cdn2.iconfinder.com/data/icons/social-icons-33/128/Trello-128.png"/>`,
      });
    });

    this.textCmdHandler.register(/^markdown/i, async (ctx) => {
      await ctx.sendActivity({
        textFormat: "markdown",
        text: "`[TEXT](https://www.microsoft.com)`",
      });
    });

    this.textCmdHandler.register(/^invoke/i, async (ctx) => {
      const card = CardGenerator.hero.invoke();
      await ctx.sendActivity({ attachments: [card] });
    });

    this.textCmdHandler.register(/^messageBack/i, async (ctx) => {
      const card = CardGenerator.thumbnail.messageBack();
      await ctx.sendActivity({
        attachments: [card],
        summary: "a messageBack thumbnail card",
      });
    });

    this.textCmdHandler.register(/^signin/i, async (ctx) => {
      const userId = ctx.activity.from.aadObjectId;
      const card = Auth.getSigninCard(userId);
      await ctx.sendActivity({
        attachments: [card],
        summary: "a signin card",
      });
    });

    this.textCmdHandler.register(/^card/i, async (ctx, _command, args) => {
      const [cardType, name, ...subCommands] = args;

      const types = _.keys(CardGenerator);
      const validType = _.includes(types, cardType);
      if (!validType) {
        await ctx.sendActivity({
          textFormat: "xml",
          text: `<b>Try any of the commands:</b><br/><pre>${types
            .map((type) => `card ${type}`)
            .join("<br/>")}</pre>`,
        });
        return;
      }

      if (!name) {
        const generator: JsonCardLoader = CardGenerator[cardType];
        const names = generator.allJsonCardNames;
        await ctx.sendActivity({
          textFormat: "xml",
          text: `<b>Try any of the commands:</b><br/><pre>card ${cardType} all<br/>${names
            .map((name) => `card ${cardType} ${name}`)
            .join("<br/>")}</pre>`,
        });
        return;
      }

      let repeat = 1;
      if (subCommands?.[0]?.toLowerCase() === "repeat") {
        const num = subCommands?.[1] && parseInt(subCommands?.[1]);
        if (num && num > 0) {
          repeat = num;
        }
      }

      if (name.toLowerCase() === "all") {
        const generator: JsonCardLoader = CardGenerator[cardType];
        const cards = generator.allJsonCards;
        for (const c of cards) {
          await this.sendCard(ctx, c, false, repeat);
        }
        return;
      }

      let card: Attachment;
      switch (cardType.toLowerCase()) {
        case "adaptive":
          card = CardGenerator.adaptive.getJsonCardIncludingName(name);
          break;

        case "hero":
          card = CardGenerator.hero.getJsonCardIncludingName(name);
          break;

        case "thumbnail":
          card = CardGenerator.thumbnail.getJsonCardIncludingName(name);
          break;

        case "o365":
          card = CardGenerator.o365.getJsonCardIncludingName(name);
          break;

        case "profile":
          card = isEmail(name)
            ? CardGenerator.profile.cardFromUpn(name)
            : CardGenerator.profile.getJsonCardIncludingName(name);
          break;

        case "list":
          card = CardGenerator.list.getJsonCardIncludingName(name);
          break;
      }

      card
        ? await this.sendCard(ctx, card, undefined, repeat)
        : await ctx.sendActivity("Card Not Found");
    });

    this.textCmdHandler.register(/^info/i, async (ctx, _command, args) => {
      const [op, ...subCommands] = args;
      if (!op) {
        await ctx.sendActivity({
          textFormat: "xml",
          text: `<b>Try any of the commands:</b><br/><pre>${[
            "team",
            "channels",
            "members",
          ]
            .map((name) => `info ${name}`)
            .join("<br/>")}</pre>`,
        });
        return;
      }

      const sendInfo = (json: any) =>
        ctx.sendActivity({
          textFormat: "xml",
          text: `<pre>${JSON.stringify(json, null, 2)}</pre>`,
        });

      const sendError = async (error: any) => {
        error.message && (await ctx.sendActivity(error.message));
        error.stack && (await ctx.sendActivity(error.stack));
      };

      try {
        switch (op.toLowerCase()) {
          case "team":
            const info1 = await TeamsInfo.getTeamDetails(ctx);
            await sendInfo(info1);
            break;

          case "channels":
            const info2 = await TeamsInfo.getTeamChannels(ctx);
            await sendInfo(info2);
            break;

          case "members":
            const info3 = await TeamsInfo.getMembers(ctx);
            await sendInfo(info3);
            if (subCommands?.[0] === "mention") {
              const card = CardGenerator.adaptive.mention(...info3);
              await this.sendCard(ctx, card);
            }
            break;
        }
      } catch (error) {
        await sendError(error);
      }
    });
  }

  private async echo(ctx: TurnContext) {
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
                    text: printableJson(ctx.activity),
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

    console.log(JSON.stringify(card.content, null, 2));

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

  private async sendCard(
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
  ) {
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
    }
  }
}

class MessageExtensionHandler {
  public async handleQueryCards(
    ctx: TurnContext
  ): Promise<MessagingExtensionResponse> {
    const cards = CardGenerator.adaptive.allJsonCardsWithName;
    const members = await TeamsInfo.getMembers(ctx);
    const mentionCard: MessagingExtensionAttachment = {
      preview: CardFactory.heroCard("mention card"),
      ...CardGenerator.adaptive.mention(...members),
    };
    const invokeCard = CardGenerator.hero.invoke();

    const jsonCards: MessagingExtensionAttachment[] = _.map(
      cards,
      ([name, card]): MessagingExtensionAttachment => ({
        ...card,
        preview: {
          contentType: CardFactory.contentTypes.thumbnailCard,
          content: {
            title: name,
            subtitle: name,
            text: name,
          } as ThumbnailCard,
        },
      })
    );

    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: [...jsonCards, invokeCard, mentionCard],
      },
    };
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

class TaskModuleHandler {
  private router = Router();
  private lookup: { [commandId: string]: tm.ITaskModule } = {};

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

  public register(cmdID: string, task: tm.ITaskModule) {
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
