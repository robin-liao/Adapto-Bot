import { CardFactory, MessageFactory, TurnContext } from "botbuilder-core";
import {
  Activity,
  MessagingExtensionAction,
  MessagingExtensionQuery,
  MessagingExtensionResponse,
  MessagingExtensionResult,
  TabRequest,
  TabResponse,
  TaskModuleResponse,
} from "botframework-schema";
import _ from "lodash";
import { UserDataTable } from "../storage/user-table";
import { IAdaptiveCardTab } from "../tabs";
import { ITaskModule } from "../task-modules";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";
import { OneOnOneHelper, printableJson } from "../utils";

export class MessageExtensionBot
  implements ITeamsScenario, ITaskModule, IAdaptiveCardTab
{
  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerTaskModule("shareMessage", this);
    teamsBot.registerTab("tab-message-ext", this);
    teamsBot.registerMessageExtensionQuery("userDefinedMEQuery", (ctx, query) =>
      this.handleUserDefinedMEQuery(ctx, query)
    );
  }

  public fetch(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<TaskModuleResponse> {
    return Promise.resolve<TaskModuleResponse>({
      task: {
        type: "continue",
        value: {
          card: getContinueCard(request.commandId!, ctx.activity),
        },
      } as any,
    });
  }

  public async submit(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<TaskModuleResponse> {
    const card = getReminderCard(
      request.data.activity,
      request.messagePayload.linkToMessage
    );
    const message = MessageFactory.attachment(card);
    await OneOnOneHelper.sendOneOnOneMessage(ctx, message);
    return {};
  }

  public async tabFetch(
    ctx: TurnContext,
    request: TabRequest
  ): Promise<TabResponse> {
    const userId = ctx.activity.from.id;
    const userTbl = new UserDataTable(userId);
    const overwrite = (await userTbl.get("meQueryOverwrite"))?.meQueryOverwrite;
    const card = getMEQueryOverwriteCard(overwrite);
    return {
      tab: {
        type: "continue",
        value: {
          cards: [{ card: { ...card.content } }],
        },
      },
    };
  }

  public async tabSubmit(
    ctx: TurnContext,
    request: TabRequest
  ): Promise<TabResponse> {
    const userId = ctx.activity.from.id;
    const userTbl = new UserDataTable(userId);

    const input = ctx.activity.value.data;
    const attachmentLayout = input?.attachmentLayout ?? "list";

    const meQueryOverwrite: MessagingExtensionResult = {
      attachmentLayout,
      attachments: [],
    };

    const cards = JSON.parse(input.attachments);
    if (cards) {
      meQueryOverwrite.attachments = cards;
    }
    await userTbl.update({ meQueryOverwrite });

    return { tab: {} };
  }

  private async handleUserDefinedMEQuery(
    ctx: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    const userId = ctx.activity.from.id;
    const userTbl = new UserDataTable(userId);

    const { attachmentLayout = "list", attachments = [] } =
      (await userTbl.get("meQueryOverwrite"))?.meQueryOverwrite ?? {};

    return {
      composeExtension: {
        type: "result",
        attachmentLayout,
        attachments,
      },
    };
  }
}

const getContinueCard = (commandId: string, activity: Partial<Activity>) =>
  CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.2",
    body: [
      {
        type: "TextBlock",
        text: "Activity Payload",
        size: "Large",
        weight: "Bolder",
      },
      {
        type: "RichTextBlock",
        inlines: [
          {
            type: "TextRun",
            fontType: "Monospace",
            text: printableJson(activity, {
              indentChar: "　",
              colorize: false,
            }),
          },
        ],
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        title: "Send to Me",
        data: {
          commandId,
          activity,
        },
      },
    ],
  });

const getReminderCard = (activity: Partial<Activity>, url: string) =>
  CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.2",
    body: [
      {
        type: "TextBlock",
        text: "Activity Payload",
        size: "Large",
        weight: "Bolder",
      },
      {
        type: "TextBlock",
        text: "sent by ME action",
        weight: "Lighter",
      },
    ],
    actions: [
      {
        type: "Action.OpenUrl",
        title: "Link to Message",
        url,
      },
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
                  text: printableJson(activity, {
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

const getMEQueryOverwriteCard = (overwrite?: MessagingExtensionResult) => {
  const layout = overwrite?.attachmentLayout ?? "list";
  const attachments = overwrite?.attachments ?? [];

  const card = CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.2",
    body: [
      {
        type: "TextBlock",
        text: "ME Query Overwrite",
        size: "Large",
        weight: "Bolder",
      },
      {
        type: "TextBlock",
        text: "Layout",
        weight: "Bolder",
      },
      {
        id: "attachmentLayout",
        type: "Input.ChoiceSet",
        isMultiSelect: false,
        value: layout,
        choices: [
          {
            title: "Grid",
            value: "grid",
          },
          {
            title: "List",
            value: "list",
          },
        ],
      },
      {
        type: "TextBlock",
        text: "Card Payloads",
        weight: "Bolder",
      },
      {
        id: "attachments",
        type: "Input.Text",
        isMultiline: true,
        placeholder: "Paste JSON array of cards, i.e., [ ... ]",
        ...(!_.isEmpty(attachments) && {
          value: JSON.stringify(attachments),
        }),
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        title: "Update",
      },
    ],
  });
  return card;
};
