import {
  CardFactory,
  Mention,
  MessageFactory,
  MessagingExtensionAction,
  MessagingExtensionActionResponse,
  TaskModuleTaskInfo,
  TeamsChannelAccount,
  TeamsInfo,
  TurnContext,
} from "botbuilder";
import _ from "lodash";
import { CardGenerator } from "../card-gen";
import {
  IMessagingExtensionAction,
  respondTaskModuleError,
} from "../task-modules";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";

export class MentionBot implements ITeamsScenario, IMessagingExtensionAction {
  public accept(teamsBot: IScenarioBuilder) {
    this.registerTextCommands(teamsBot);
    teamsBot.registerTaskModule("cardMention", this);
  }

  public async fetch(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    const members: TeamsChannelAccount[] = [];
    try {
      const users = await TeamsInfo.getMembers(ctx);
      members.push(...users);
    } catch (e) {
      return respondTaskModuleError(e.message, true, true);
    }

    const choices = members.map((user) => ({
      type: "Input.Choice",
      title: user.name,
      value: user.aadObjectId || (user as any).objectId,
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
                  text: "Choose user(s) to mention (current context):",
                },
                {
                  type: "Input.ChoiceSet",
                  id: "selectedUsersCurrent",
                  style: "people",
                  choices,
                  "choices.data": {
                    type: "Data.Query",
                    dataset: "graph.microsoft.com/users?scope=currentContext",
                  },
                  isMultiSelect: true,
                  placeholder: "Search user(s)",
                },
                {
                  type: "TextBlock",
                  size: "Medium",
                  text: "Choose user(s) to mention (global context):",
                },
                {
                  type: "Input.ChoiceSet",
                  id: "selectedUsersGlobal",
                  style: "people",
                  choices: [],
                  "choices.data": {
                    type: "Data.Query",
                    dataset: "graph.microsoft.com/users",
                  },
                  isMultiSelect: true,
                  placeholder: "Search global user(s)",
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
    const {
      selectedUsersCurrent = "",
      selectedUsersGlobal = "",
      returnAs,
      members = [],
    } = request.data;

    if (!selectedUsersCurrent && !selectedUsersGlobal) {
      return;
    }

    const selectedMriListCurrent = (selectedUsersCurrent as string)
      .split(",")
      .filter(_.identity);

    const selectedMriListGlobal = (selectedUsersGlobal as string)
      .split(",")
      .filter(_.identity);

    const selectedMriList = [
      ...selectedMriListCurrent,
      ...selectedMriListGlobal,
    ];

    const users: TeamsChannelAccount[] = selectedMriList
      .map((mri) => members.find((m) => m.aadObjectId === mri))
      .filter(_.identity);

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

  private registerTextCommands(teamsBot: IScenarioBuilder) {
    teamsBot.registerTextCommand(/^mention/i, async (ctx, cmd, args) => {
      const mri = args[0];
      if (mri) {
        const mentioned = await TeamsInfo.getMember(ctx, mri);
        const mention: Mention = {
          type: "mention",
          mentioned,
          text: `<at>${mentioned.name}</at>`,
        };

        const textMsg = MessageFactory.text(`Hello ${mention.text}`);
        textMsg.entities = [mention];

        const card = CardGenerator.adaptive.mention(mentioned);
        const cardMsg = MessageFactory.attachment(card);

        const cardDummy = CardFactory.heroCard(
          "Dummy card",
          "Dummy card to test at-mention in the text coming together with card"
        );
        const cardTextMsg = MessageFactory.list(
          [cardDummy, cardDummy],
          `Hello <at>${mentioned.name}</at>`
        );
        cardTextMsg.attachmentLayout = "carousel";
        cardTextMsg.entities = [mention];

        await ctx.sendActivities([textMsg, cardMsg, cardTextMsg]);
      } else {
        await ctx.sendActivity(
          MessageFactory.text(
            `Use command <pre>info members</pre> to list users ande use <pre>mention AAD_OBJECT_ID</pre> to at-mention a user`
          )
        );
      }
    });
  }
}
