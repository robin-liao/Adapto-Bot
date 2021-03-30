import {
  TurnContext,
  MessagingExtensionAction,
  MessagingExtensionActionResponse,
  TeamsInfo,
  CardFactory,
  TaskModuleTaskInfo,
  TeamsChannelAccount,
} from "botbuilder";
import _ = require("lodash");
import { IMessagingExtensionAction } from ".";
import { CardGenerator } from "../card-gen";
import { respondTaskModuleError } from "./utils";

export class TaskModuleCardMention implements IMessagingExtensionAction {
  constructor(private commandId: string) {}

  public async fetch(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    const members: TeamsChannelAccount[] = [];
    try {
      members.push(...(await TeamsInfo.getMembers(ctx)));
    } catch (e) {
      return respondTaskModuleError(e.message, true, true);
    }

    const choices = members.map((user, i) => ({
      type: "Input.Choice",
      title: user.name,
      value: i.toString(),
    }));

    const card = {
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      type: "AdaptiveCard",
      version: "1.3",
      body: [
        {
          type: "TextBlock",
          size: "large",
          text: "Card renderer",
          weight: "bolder",
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "TextBlock",
                  size: "Medium",
                  text: "Choose user(s) to mention:",
                },
                {
                  type: "Input.ChoiceSet",
                  id: "selectedUsers",
                  style: "expanded",
                  isMultiSelect: true,
                  placeholder: "Choose user(s)",
                  choices,
                },
              ],
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "TextBlock",
                  text: "Return as",
                  size: "Medium",
                },
                {
                  type: "Input.ChoiceSet",
                  id: "returnAs",
                  isMultiSelect: true,
                  value: "asMECard",
                  choices: [
                    {
                      title: "Card in Compose",
                      value: "asMECard",
                    },
                    {
                      title: "Send as Bot Message",
                      value: "asBotCard",
                    },
                  ],
                  placeholder: "Placeholder text",
                  style: "expanded",
                },
              ],
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "Submit",
          data: {
            members,
          },
        },
      ],
    };

    return {
      task: {
        type: "continue",
        value: {
          title: "Create a card",
          width: "large",
          height: "large",
          card: CardFactory.adaptiveCard(card),
        } as TaskModuleTaskInfo,
      } as any,
    };
  }

  public async submit(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    if (!request.data || _.isEmpty(request.data)) {
      return;
    }

    const { selectedUsers, returnAs, members = [] } = request.data;

    if (!selectedUsers) {
      return;
    }

    const selectedIdx = (selectedUsers as string)
      .split(",")
      .map((s) => parseInt(s));
    const users: TeamsChannelAccount[] = selectedIdx.map((i) => members[i]);
    const card = CardGenerator.adaptive.mention(...users);

    if ((returnAs as string).includes("asBotCard")) {
      await ctx.sendActivity({
        attachments: [card],
      });
    }
    if ((returnAs as string).includes("asMECard")) {
      return {
        composeExtension: {
          type: "result",
          attachmentLayout: "list",
          attachments: [card],
        },
      };
    }
  }
}
