import {
  TurnContext,
  TaskModuleRequest,
  TaskModuleResponse,
  CardFactory,
  MessageFactory,
  InvokeResponse,
  StatusCodes,
  Attachment,
  MessagingExtensionActionResponse,
  Activity,
  MessagingExtensionQuery,
  MessagingExtensionResponse,
  MessagingExtensionAttachment,
} from "botbuilder";
import { Router } from "express";
import * as fs from "fs";
import config from "../config";
import { IMessagingExtensionAction } from "../task-modules";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";
import * as _ from "lodash";
import format from "string-template";
import { UserDataTable } from "../storage/user-table";

type InvokeData = {
  nextStep:
    | "moreWebview"
    | "moreCard"
    | "doneEmpty"
    | "doneMessage"
    | "doneCard";
  title?: string;
  url?: string;
  card?: string;
  width?: string;
  height?: string;
  fallbackUrl?: string;
  optInData?: string;
  doneMessage?: string;
  doneCard?: string;

  // from card:
  widthCustom?: string;
  heightCustom?: string;
  contentType?: InitialContentType;

  // user-hydrated info
  q1?: string;
  q2?: string;
};

type InitialContentType = "webview" | "card";

export class TaskModuleFullTest
  implements IMessagingExtensionAction, ITeamsScenario
{
  private readonly commandId = "launchTaskModule";
  private readonly tabEntityId = "tab-task-module";
  private readonly botId = config.microsoftAppID;
  private readonly defaultTeamsRuntime = "https://teams.microsoft.com";
  private readonly teamsAppId = config.teamsAppId;
  private readonly routePathDialogContent = "dialogContent";
  private readonly routePathInitTab = "initTab";
  private readonly taskModuleWebviewUrl = `${config.host}/task/${this.commandId}/${this.routePathDialogContent}`;

  private router = Router();

  constructor() {
    this.bindServerRoutes();
  }

  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerTaskModule(this.commandId, this);
    teamsBot.registerTextCommand(/^task/i, (ctx) => this.sendConfigCard(ctx));
    teamsBot.registerInvoke(this.commandId, (ctx) =>
      this.handleOnMessageBack(ctx)
    );
    teamsBot.registerMessageExtensionQuery(
      "taskModuleCardQuery",
      (ctx, query) => this.handleMEQuery(ctx, query)
    );
  }

  public getRouter() {
    return this.router;
  }

  public fetch(
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse> {
    const payloadData: InvokeData = request.data ?? {};

    // opt-in data from card
    const optInData = {
      q1: payloadData.q1,
      q2: payloadData.q2,
    };

    const theme = request.context.theme || undefined;

    switch (payloadData.contentType) {
      case "webview":
        const taskInfo1 = this.invokeRtnContinueUrl(
          payloadData.width,
          payloadData.height,
          payloadData.title,
          payloadData.fallbackUrl,
          optInData,
          undefined,
          theme
        );
        return Promise.resolve(taskInfo1);

      case "card":
      default:
        const taskInfo2 = this.invokeRtnContinueCard(
          payloadData.width,
          payloadData.height,
          payloadData.title,
          payloadData.fallbackUrl,
          optInData
        );
        return Promise.resolve(taskInfo2);
    }
  }

  public submit(
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<MessagingExtensionActionResponse> {
    const userInputs = request.data;
    const context = request.context;
    const optInData = userInputs.optInData
      ? JSON.parse(userInputs.optInData)
      : {};

    let width: any = userInputs.width;
    if (width) {
      width =
        width === "useCustom"
          ? parseFloat(userInputs.widthCustom) || undefined
          : parseFloat(userInputs.width) || userInputs.width;
    }

    let height: any = userInputs.height;
    if (height) {
      height =
        height === "useCustom"
          ? parseFloat(userInputs.heightCustom) || undefined
          : parseFloat(userInputs.height) || userInputs.height;
    }

    const theme = context.theme;

    switch (userInputs.nextStep) {
      case "moreWebview":
        const taskInfo1 = this.invokeRtnContinueUrl(
          width,
          height,
          userInputs.title,
          userInputs.fallbackUrl,
          optInData,
          userInputs.url,
          theme
        );
        return Promise.resolve(taskInfo1);

      case "moreCard":
        const taskInfo2 = this.invokeRtnContinueCard(
          width,
          height,
          userInputs.title,
          userInputs.fallbackUrl,
          optInData,
          userInputs.card
        );
        return Promise.resolve(taskInfo2);

      case "doneEmpty":
        const taskInfo3 = this.invokeRtnDoneEmtpy();
        return Promise.resolve(taskInfo3);

      case "doneCard":
        const taskInfo4 = this.invokeRtnDoneCard(
          userInputs,
          ctx.activity.name === "composeExtension/submitAction"
        );
        return Promise.resolve(taskInfo4);

      case "doneMessage":
      default:
        const text =
          userInputs.doneMessage ?? "Thanks for your action! (default message)";
        const taskInfo5 = this.invokeRtnDoneMessage(text);
        return Promise.resolve(taskInfo5);
    }
  }

  private async handleMEQuery(
    ctx: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    const attachments: MessagingExtensionAttachment[] = [];

    // hero card for task module
    const heroTaskModule = this.heroCardForTaskModule(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      this.botId
    );
    attachments.push({
      ...heroTaskModule,
      preview: CardFactory.thumbnailCard(`Hero Card for task module`),
    });

    // adaptive card for task module
    const adaptiveTaskModule = this.adaptiveCardForTaskModule(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      this.botId
    );
    attachments.push({
      ...adaptiveTaskModule,
      preview: CardFactory.thumbnailCard(`Adaptive Card for task module`),
    });

    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments,
      },
    };
  }

  private bindServerRoutes() {
    this.router.get(`/${this.routePathInitTab}`, (req, res) => {
      const html = fs
        .readFileSync(__dirname + "/task-module-full-test-init-tab.html")
        .toString();

      const cardPayload = createContinueCard(this.commandId);
      const body = format(html, {
        BOT_ID: this.botId,
        DEFAULT_CARD: JSON.stringify(cardPayload, null, 2),
        OPT_IN_DATA: "{OPT_IN_DATA}", // keep it there
      });

      res.set("Content-Type", "text/html");
      res.send(body);
      res.end();
    });

    this.router.get(`/${this.routePathDialogContent}`, (req, res) => {
      let data = req.query.data as any;
      if (data) {
        data = JSON.parse(decodeURIComponent(data));
      } else {
        data = {};
      }
      const html = fs
        .readFileSync(__dirname + "/task-module-full-test-dialog-content.html")
        .toString();

      const body = format(html, {
        TEAMS_APP_ID: this.teamsAppId,
        OPT_IN_DATA: JSON.stringify(data),
        BOT_ID: this.botId,
        DEFAULT_TEXT_COLOR: "#252424",
      });

      res.set("Content-Type", "text/html");
      res.send(body);
      res.end();
    });
  }

  private async sendConfigCard(ctx: TurnContext) {
    const card = createConfigCard(this.botId, this.commandId);
    await ctx.sendActivity(MessageFactory.attachment(card));
  }

  private async handleOnMessageBack(ctx: TurnContext): Promise<InvokeResponse> {
    const payload = ctx.activity.value;

    const parseParam = (name: string) => {
      let v = payload[name];
      if (v === "useCustom") {
        v = payload[name + "Custom"];
      }
      return v;
    };

    const teamsRuntime = parseParam("teamsRuntime") || this.defaultTeamsRuntime;
    const w = parseParam("width");
    const h = parseParam("height");
    const title = payload.title || "default dialog title";
    const fallbackUrl = payload.fallbackUrl;
    const contentType = payload.contentType as InitialContentType;
    const completionBotId = payload.completionBotId;
    await this.sendContent(
      ctx,
      teamsRuntime,
      w,
      h,
      title,
      fallbackUrl,
      contentType,
      completionBotId
    );

    return { status: StatusCodes.OK };
  }

  private async sendContent(
    ctx: TurnContext,
    teamsRuntime: string,
    width: any,
    height: any,
    title: string,
    fallbackUrl: string,
    contentType: InitialContentType,
    completionBotId: string
  ) {
    const acCard = this.adaptiveCardForTaskModule(
      teamsRuntime,
      contentType,
      width,
      height,
      title,
      fallbackUrl,
      completionBotId
    );

    const heroCard = this.heroCardForTaskModule(
      teamsRuntime,
      contentType,
      width,
      height,
      title,
      fallbackUrl,
      completionBotId
    );

    const deeplink = this.generateDeeplink(
      teamsRuntime,
      contentType,
      width,
      height,
      title,
      fallbackUrl,
      completionBotId
    );
    const deeplinkMsg: Partial<Activity> = {
      ...MessageFactory.text(`Deeplink: <a href='${deeplink}'>${deeplink}</a>`),
      textFormat: "xml",
    };

    const tabLink = this.generateDeeplinkToTab(teamsRuntime);
    const tabLinkMsg: Partial<Activity> = {
      ...MessageFactory.text(`Tab link: <a href='${tabLink}'>${tabLink}</a>`),
      textFormat: "xml",
    };

    await ctx.sendActivities([
      MessageFactory.attachment(acCard),
      MessageFactory.attachment(heroCard),
      deeplinkMsg,
      tabLinkMsg,
    ]);
  }

  private generateDeeplink(
    teamsRuntime: string,
    contentType: InitialContentType,
    width?: any,
    height?: any,
    title?: string,
    fallbackUrl?: string,
    completionBotId?: string
  ): string {
    let deeplink = `${teamsRuntime}/l/task/${this.teamsAppId}?`;
    width && (deeplink += `&width=${width}`);
    height && (deeplink += `&height=${height}`);
    title && (deeplink += `&title=${encodeURIComponent(title)}`);
    fallbackUrl &&
      (deeplink += `&fallbackUrl=${encodeURIComponent(fallbackUrl)}`);
    switch (contentType) {
      case "webview":
        const url = this.taskModuleWebviewUrl;
        deeplink += `&url=${encodeURIComponent(url)}`;
        break;

      case "card":
        const card = createContinueCard(this.commandId).content;
        const cardStrMin = JSON.stringify(card);
        deeplink += `&card=${encodeURIComponent(cardStrMin)}`;
        break;
    }

    if (completionBotId) {
      deeplink += `&completionBotId=${encodeURIComponent(completionBotId)}`;
    }

    return deeplink;
  }

  private generateDeeplinkToTab(teamsRuntime: string): string {
    const deeplink = `${teamsRuntime}/l/entity/${this.teamsAppId}/${this.tabEntityId}`;
    return deeplink;
  }

  private adaptiveCardForTaskModule(
    teamsRuntime: string = this.defaultTeamsRuntime,
    contentType: InitialContentType = "card",
    width?: any,
    height?: any,
    title?: string,
    fallbackUrl?: string,
    completionBotId?: string
  ) {
    const deeplinkUrl = this.generateDeeplink(
      teamsRuntime,
      contentType,
      width,
      height,
      title,
      fallbackUrl,
      completionBotId
    );

    const actionData = {
      msteams: {
        type: "task/fetch",
      },
      width: parseFloat(width) || width,
      height: parseFloat(height) || height,
      title,
      fallbackUrl,
      contentType,
      commandId: this.commandId,
    };

    return CardFactory.adaptiveCard({
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      type: "AdaptiveCard",
      version: "1.0",
      body: [
        {
          type: "TextBlock",
          text: "Task Module Launcher - Adaptive Card",
          size: "large",
          weight: "bolder",
        },
        {
          type: "TextBlock",
          text: "Question 1",
        },
        {
          type: "Input.Text",
          placeholder: "Enter question here",
          id: "q1",
        },
        {
          type: "TextBlock",
          text: "Question 2",
        },
        {
          type: "Input.Text",
          placeholder: "Enter question here",
          id: "q2",
        },
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "Action.Submit",
          data: actionData,
        },
        {
          type: "Action.OpenUrl",
          title: "Deeplink",
          url: deeplinkUrl,
        },
        {
          type: "Action.ShowCard",
          title: "Show Data",
          card: {
            body: [
              {
                type: "TextBlock",
                text: "Action.Submit data",
                size: "medium",
                weight: "bolder",
                spacing: "extraLarge",
              },
              {
                type: "TextBlock",
                wrap: true,
                text: JSON.stringify(actionData, null, 2),
              },
              {
                type: "TextBlock",
                text: "Action.OpenUrl",
                size: "medium",
                weight: "bolder",
                spacing: "extraLarge",
              },
              {
                type: "TextBlock",
                wrap: true,
                text: deeplinkUrl,
              },
            ],
          },
        },
      ],
    });
  }

  private heroCardForTaskModule(
    teamsRuntime: string = this.defaultTeamsRuntime,
    contentType: InitialContentType = "card",
    width?: any,
    height?: any,
    title?: string,
    fallbackUrl?: string,
    completionBotId?: string
  ): Attachment {
    const payload = {
      type: "task/fetch",
      width: parseFloat(width) || width,
      height: parseFloat(height) || height,
      title,
      fallbackUrl,
      contentType,
      commandId: this.commandId,
    };

    const deeplinkUrl = this.generateDeeplink(
      teamsRuntime,
      contentType,
      width,
      height,
      title,
      fallbackUrl,
      completionBotId
    );

    return CardFactory.heroCard(
      "Task Module Launcher - Hero Card",
      `<b>Invoke Payload:</b> <br/><pre>${JSON.stringify(
        payload,
        null,
        2
      )}</pre><b>OpenUrl deeplink:</b><br/>${deeplinkUrl}`,
      undefined,
      [
        {
          type: "invoke",
          title: "Invoke",
          value: JSON.stringify(payload),
        },
        {
          type: "openUrl",
          title: "Deeplink",
          value: deeplinkUrl,
        },
      ]
    );
  }

  private invokeRtnContinueUrl(
    width?: any,
    height?: any,
    title?: string,
    fallbackUrl?: string,
    optInData?: any,
    overwriteUrl?: string,
    theme?: string
  ): TaskModuleResponse {
    let url: string;

    if (overwriteUrl) {
      url = overwriteUrl;
    } else {
      const params = {};
      if (optInData && !_.isEmpty(optInData)) {
        params["data"] = encodeURIComponent(JSON.stringify(optInData));
      }
      if (theme) {
        params["theme"] = theme;
      }

      url = this.taskModuleWebviewUrl;
      if (!_.isEmpty(params)) {
        const qsp = [];
        _.each(params, (v, k) => qsp.push(`${k}=${v}`));
        url += "?" + qsp.join("&");
      }
    }

    console.log(`Task Module Continue URL = ${url}`);

    return {
      task: {
        type: "continue",
        value: {
          title,
          width,
          height,
          fallbackUrl,
          url,
        },
      },
    };
  }

  private invokeRtnContinueCard(
    width?: any,
    height?: any,
    title?: string,
    fallbackUrl?: string,
    optInData?: any,
    overwriteCard?: string
  ): TaskModuleResponse {
    let card: Attachment;

    if (overwriteCard) {
      card = CardFactory.adaptiveCard(JSON.parse(overwriteCard));
    } else {
      card = createContinueCard(
        this.commandId,
        optInData ? JSON.stringify(optInData) : undefined
      );
    }

    return {
      task: {
        type: "continue",
        value: {
          title,
          width,
          height,
          fallbackUrl,
          card,
        },
      },
    };
  }

  private invokeRtnDoneEmtpy(): TaskModuleResponse {
    return null;
  }

  private invokeRtnDoneMessage(text: string): TaskModuleResponse {
    return {
      task: {
        type: "message",
        value: text,
      },
    };
  }

  private invokeRtnDoneCard(
    userInputs?: InvokeData,
    isCECreateResult?: boolean
  ): MessagingExtensionActionResponse {
    let card: any;
    if (userInputs) {
      if (userInputs.doneCard) {
        card = JSON.parse(userInputs.doneCard);
      } else {
        card = {
          $schema: "https://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.0.0",
          fallbackText: "fallback text for sample 01",
          speak: "This is adaptive card sample 1",
          body: [
            {
              type: "Container",
              items: [
                {
                  type: "TextBlock",
                  text: "Card generated!",
                  weight: "bolder",
                  size: "large",
                  horizontalAlignment: "center",
                },
                {
                  type: "TextBlock",
                  text: "Your resulting payload:",
                  isSubtle: true,
                },
                {
                  type: "Container",
                  style: "emphasis",
                  items: [
                    {
                      type: "TextBlock",
                      text: JSON.stringify(userInputs, null, 2),
                      color: "dark",
                      wrap: true,
                    },
                  ],
                },
              ],
            },
          ],
        };
      }
    } else {
      card = {
        $schema: "https://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.0.0",
        body: [
          {
            type: "Container",
            items: [
              {
                type: "TextBlock",
                text: "Card generated!",
                weight: "bolder",
                size: "large",
                horizontalAlignment: "center",
              },
              {
                type: "TextBlock",
                text: "Nothing to generate. So just say thanks to you!",
              },
            ],
          },
        ],
      };
    }

    const taskResult = {
      task: {
        type: "cardResult" as any,
        attachments: [CardFactory.adaptiveCard(card)],
      },
    };

    const ceCreateResult: MessagingExtensionActionResponse = {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: [CardFactory.adaptiveCard(card)],
      },
    };

    return isCECreateResult ? ceCreateResult : taskResult;
  }
}

const createConfigCard = (BOT_ID: string, INTENT: string) =>
  CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.0",
    body: [
      {
        type: "TextBlock",
        text: "Task module launcher generator",
        size: "large",
        weight: "bolder",
        horizontalAlignment: "center",
      },
      {
        type: "TextBlock",
        text: "What's your runtime?",
        size: "medium",
        weight: "bolder",
      },
      {
        type: "Input.ChoiceSet",
        id: "teamsRuntime",
        style: "expanded",
        value: "https://teams.microsoft.com",
        choices: [
          {
            type: "Choice",
            title: "https://teams.microsoft.com",
            value: "https://teams.microsoft.com",
          },
          {
            type: "Choice",
            title: "https://local.teams.office.com",
            value: "https://local.teams.office.com",
          },
          {
            type: "Choice",
            title: "Other",
            value: "useCustom",
          },
        ],
      },
      {
        type: "Input.Text",
        id: "teamsRuntimeCustom",
        placeholder: "e.g., https://teams.microsoft.com",
      },
      {
        type: "TextBlock",
        text: "Initial height",
        size: "medium",
        weight: "bolder",
        spacing: "extraLarge",
      },
      {
        type: "Input.ChoiceSet",
        id: "height",
        style: "expanded",
        choices: [
          {
            type: "Choice",
            title: "large",
            value: "large",
          },
          {
            type: "Choice",
            title: "medium",
            value: "medium",
          },
          {
            type: "Choice",
            title: "small",
            value: "small",
          },
          {
            type: "Choice",
            title: "Custom",
            value: "useCustom",
          },
        ],
      },
      {
        type: "Input.Number",
        id: "heightCustom",
        placeholder: "units in 'vh'",
      },
      {
        type: "TextBlock",
        text: "Initial width",
        size: "medium",
        weight: "bolder",
        spacing: "extraLarge",
      },
      {
        type: "Input.ChoiceSet",
        id: "width",
        style: "expanded",
        choices: [
          {
            type: "Choice",
            title: "large",
            value: "large",
          },
          {
            type: "Choice",
            title: "medium",
            value: "medium",
          },
          {
            type: "Choice",
            title: "small",
            value: "small",
          },
          {
            type: "Choice",
            title: "Custom",
            value: "useCustom",
          },
        ],
      },
      {
        type: "Input.Number",
        id: "widthCustom",
        placeholder: "units in 'vw'",
      },
      {
        type: "TextBlock",
        text: "Dialog title",
        size: "medium",
        weight: "bolder",
        spacing: "extraLarge",
      },
      {
        type: "Input.Text",
        id: "title",
      },
      {
        type: "TextBlock",
        text: "Fallback URL",
        size: "medium",
        weight: "bolder",
        spacing: "extraLarge",
      },
      {
        type: "Input.Text",
        id: "fallbackUrl",
        placeholder: "URL will be opened on mobiles",
      },
      {
        type: "TextBlock",
        text: "Completion Bot Id",
        size: "medium",
        weight: "bolder",
        spacing: "extraLarge",
      },
      {
        type: "Input.Text",
        id: "completionBotId",
        value: BOT_ID,
        placeholder: "Optional. Used to generate deeplink if any.",
      },
      {
        type: "TextBlock",
        text: "Initial content type",
        size: "medium",
        weight: "bolder",
        spacing: "extraLarge",
      },
      {
        type: "Input.ChoiceSet",
        id: "contentType",
        value: "card",
        style: "expanded",
        choices: [
          {
            type: "Choice",
            title: "Webview",
            value: "webview",
          },
          {
            type: "Choice",
            title: "Card",
            value: "card",
          },
        ],
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        title: "Generate",
        data: {
          intent: INTENT,
        },
      },
    ],
  });

const createContinueCard = (commandId: string, OPT_IN_DATA?: string) =>
  CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.0",
    body: [
      {
        type: "TextBlock",
        text: "Choose your next step",
        size: "large",
        weight: "bolder",
        horizontalAlignment: "center",
      },
      {
        type: "ColumnSet",
        spacing: "extraLarge",
        columns: [
          {
            type: "Column",
            items: [
              {
                type: "Input.ChoiceSet",
                id: "nextStep",
                style: "expanded",
                value: "moreWebview",
                choices: [
                  {
                    type: "Input.Choice",
                    title: "1. More Webview URL",
                    value: "moreWebview",
                  },
                  {
                    type: "Input.Choice",
                    title: "2. More Card payload",
                    value: "moreCard",
                    placeholder:
                      "adaptive card payload to overwrite the default (the current card)",
                  },
                  {
                    type: "Input.Choice",
                    title: "3. Done - Empty",
                    value: "doneEmpty",
                  },
                  {
                    type: "Input.Choice",
                    title: "4. Done - Message",
                    value: "doneMessage",
                  },
                  {
                    type: "Input.Choice",
                    title: "5. Done - Card",
                    value: "doneCard",
                  },
                ],
              },
              {
                type: "Input.Text",
                id: "url",
                placeholder: "overwrite to redirect to other URL",
              },
              {
                type: "Input.Text",
                id: "card",
                isMultiline: true,
              },
              {
                type: "Input.Text",
                id: "doneMessage",
                placeholder: "message to display on dialog",
              },
              {
                type: "Input.Text",
                id: "doneCard",
                placeholder:
                  "adaptive card payload to overwrite the default (we'll generate it!)",
                isMultiline: true,
              },
            ],
          },
          {
            type: "Column",
            items: [
              {
                type: "TextBlock",
                text: "Next dialog title",
                size: "medium",
                weight: "bolder",
                spacing: "extraLarge",
              },
              {
                type: "Input.Text",
                id: "title",
              },
              {
                type: "TextBlock",
                text: "Next dialog width",
                size: "medium",
                weight: "bolder",
                spacing: "extraLarge",
              },
              {
                type: "Input.ChoiceSet",
                id: "width",
                style: "expanded",
                choices: [
                  {
                    type: "Choice",
                    title: "large",
                    value: "large",
                  },
                  {
                    type: "Choice",
                    title: "medium",
                    value: "medium",
                  },
                  {
                    type: "Choice",
                    title: "small",
                    value: "small",
                  },
                  {
                    type: "Choice",
                    title: "Custom",
                    value: "useCustom",
                  },
                ],
              },
              {
                type: "Input.Number",
                id: "widthCustom",
                placeholder: "units in 'vw'",
              },
              {
                type: "TextBlock",
                text: "Next dialog height",
                size: "medium",
                weight: "bolder",
                spacing: "extraLarge",
              },
              {
                type: "Input.ChoiceSet",
                id: "height",
                style: "expanded",
                choices: [
                  {
                    type: "Choice",
                    title: "large",
                    value: "large",
                  },
                  {
                    type: "Choice",
                    title: "medium",
                    value: "medium",
                  },
                  {
                    type: "Choice",
                    title: "small",
                    value: "small",
                  },
                  {
                    type: "Choice",
                    title: "Custom",
                    value: "useCustom",
                  },
                ],
              },
              {
                type: "Input.Number",
                id: "heightCustom",
                placeholder: "units in 'vh'",
              },
              {
                type: "TextBlock",
                text: "Fallback URL",
                size: "medium",
                weight: "bolder",
                spacing: "extraLarge",
              },
              {
                type: "Input.Text",
                id: "fallbackUrl",
                placeholder: "URL will be opened on mobiles",
              },
            ],
          },
        ],
      },
      {
        type: "TextBlock",
        text: "Opt-In Data",
        size: "medium",
        weight: "bolder",
        spacing: "extraLarge",
      },
      {
        type: "Input.Text",
        id: "optInData",
        isMultiline: true,
        placeholder: "No data. You may put some here in JSON format",
        ...(OPT_IN_DATA && { value: OPT_IN_DATA }),
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        title: "Next",
        data: {
          commandId,
        },
      },
    ],
  });
