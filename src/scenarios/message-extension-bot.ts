import { CardFactory, MessageFactory, TurnContext } from "botbuilder-core";
import {
  Activity,
  MessagingExtensionAction,
  TaskModuleResponse,
} from "botframework-schema";
import { ITaskModule } from "../task-modules";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";
import { OneOnOneHelper, printableJson } from "../utils";

export class MessageExtensionBot implements ITeamsScenario, ITaskModule {
  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerTaskModule("shareMessage", this);
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
