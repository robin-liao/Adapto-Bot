import {
  CardFactory,
  Mention,
  MessageFactory,
  MessagingExtensionAction,
  MessagingExtensionActionResponse,
  StatusCodes,
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
    this.registerIdCardScenario(teamsBot);
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
                  text: "Choose user(s) to mention (current context) - with Choices:",
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
                  text: "Choose user(s) to mention (current context) - Search Only:",
                },
                {
                  type: "Input.ChoiceSet",
                  id: "selectedUsersCurrent",
                  style: "people",
                  choices: [],
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
      const mri = this.parseMentionedUsers(ctx, args.join(" ")) ?? args[0];
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

  private registerIdCardScenario(teamsBot: IScenarioBuilder) {
    teamsBot.registerTextCommand(/^idcard/i, async (ctx, cmd, args) => {
      const card = {
        type: "AdaptiveCard",
        version: "1.0",
        body: [
          {
            type: "TextBlock",
            size: "Medium",
            text: "Choose user(s) to share contact (global context):",
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
            isMultiSelect: false,
            placeholder: "Search global user(s)",
            isRequired: true,
          },
          {
            type: "Input.Text",
            isRequired: true,
            id: "displayName",
            placeholder: "Enter display name (Rquired)",
          },
        ],
        actions: [
          {
            type: "Action.Submit",
            title: "Submit",
            data: {
              intent: "idcard",
            },
          },
        ],
      };
      await ctx.sendActivity({
        attachments: [CardFactory.adaptiveCard(card)],
      });
    });

    teamsBot.registerInvoke("idcard", async (ctx) => {
      const selectedMris =
        (ctx.activity.value.selectedUsersGlobal as string)?.split(",") ?? [];

      await ctx.sendActivity(
        MessageFactory.text(
          `You have selected the following users: ${JSON.stringify(
            selectedMris
          )}`
        )
      );

      const displayName = ctx.activity.value.displayName ?? "Unknown";
      const mention: Mention = {
        type: "mention",
        text: `<at>${displayName}</at>`,
        mentioned: {
          id: selectedMris[0],
          name: displayName,
        },
      };

      await ctx.sendActivity({
        type: "message",
        textFormat: "xml",
        text: `
        <p>
          <span contenteditable="false" title="ID card" type="(idcard)" class="animated-emoticon-20-idcard" itemscope="Share_Contact_Card">
            <img itemscope itemtype="http://schema.skype.com/Emoji" itemid="idcard" src="${this.idCardIcon}" title="ID card" alt="🪪" style="width:20px;height:20px;">
          </span>
          <at>${mention.text}</at>
          &nbsp;
        </p>`,
        entities: [mention],
      });
      return { status: StatusCodes.OK };
    });
  }

  private parseMentionedUsers(ctx: TurnContext, message: string): string {
    message = message.trim();
    const mentionedEntities = ctx.activity.entities?.filter(
      (entity) => entity.type === "mention"
    );
    const mentionedUser = mentionedEntities?.filter(
      (entity) => entity.text === message
    );
    if (mentionedUser && mentionedUser.length > 0) {
      return mentionedUser[0].mentioned.id;
    }
  }

  private get idCardIcon() {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAABNdJREFUeF7tml1sFFUUx/9ndmnwkxiCgaDGiomfGA3xAY1KgBhFd25n7JbEhER9MzE8ocSg4ieKBuNHYvTFNx9ku7N7Z7QmRCUaX/yI9KGIRqLYNAYIEKVokN2dYwa7Zbed7cxO72w77szj7jnn/s/vnnvnfgyhyx/q8vyRAkgroMsJpEOgywsgnQTTIZAOgS4nkA6BmQognx9a8k+ttoWYV4FwM4DFCSmY4wDvY2jfcgWvO07uWCvdLSugz7Q3MfhtgBYlJOlWMk+4jEecki79DHwBCMPeDMKbCU+8ST4R+stFvTg1p2kAcnm7V6vhZwCZ/xMAAKfcCvVOHQ7TAOim8w6BH21I/jCYtlay2p6hwn2HkwBlQ/7jpQuq7t0g3glgaV0zgZ8pW+KFxhymARCmPQrg8kknwsZyUd+dhMSnaux7wB5gxocNv38nLf3WIAA1AFrdqCdz+qJCYeBUEgEYhrXYpey5NwDjpCzpTZO6XwVwY7LS0hO9VhCmPWM+ygDcn3eWZ6rudhCtBbACwCjA33AVj9m2ODJXFdQRALop7yRQGcAlPokeJ7e2vlw2hucCQuwA8vndF56pLTwUsEo8xFW+ybbFeKchxA5AN50dBH4yRGI7pKVvC2Gn1CR2AMKQX4LojkDVjM9kSV8fZCdMpx/ML4JwTZBt0/+Mn0D0lLRyg42/xw/AtMcALA8Wy2PSEpPri1b2wrQPALg2OJ6vxX5p6Td2GsBXAG4PFBy2Agx7PwjXB8bzM2D8IEv6DR0FEHoOYLwiS3rgXHF2CIBfBnB1WxDmagiseWjvwkV/jg8HjNljlUxm5VzsJWKfA7xeMs3ishqygwDd5tNrozXA+MjSv2+rRxUZdwRAXaswnQcZvFYDehk8RqB9ZUt/Q1EukcJ0FEAkhTE7pQDi2AwZhnUpa9l1LtMKDW42TCcyk8sa/4IKPrdt8XsYHxU2yiugr99Zxy5/OhtxDBa2JezZxAjrqxyAMOy9IKwJK8DXjnhYFsUts4oR0lk9AFP+oeKovNVBy7zfCwjT/hvAeSE7oKVZT+Z0tlAY8I7fmh4x35fCwrRHADSttyPA+E1a+pV+frMCAIxIS18Z614g9Np/JirE78qiaDx6n7SOvBcADgC0TVq5UqwAvFdgjbIjBCyJ0PNnXVyi65xi7seo/u34KZ8EvcYnzgC/aEfIpC3za7IknojkG8EpFgCeDsNwVrvEuwCsDquLwM+VLfFsWHsVdrEBqIszDPsul3AvEV3FzL0TR+Le6vAgEX51mQ5q4JFahYqOk/PeIB19YgfQ0WwiNBYFgHcNdkG9rUoms2wuDjIi5DrN5b9zigWN+45xaekXNxr63Qw1vecJvLVsiVdVCOp0jD5TPs2g5yfb9VmC+12P7yRw8yzNeElD9a1SyTza6SSitGeaQ5fVuLIZRI83+TO2y5J+Dggw/UPJibLxbnp6ojQ+j33+6sn0XFEo3HNixiHg/SkM52EQvz+Pk2lXGhMhH+oTmXpkYTobAfc9FTu/dtUqtj9KGm0qD+b2+MWd8e7fW/a6yGwholUMePt3v9tfxXqVhDsC8DCYvj5zfnbXJx9sONkqaqI/flCBKgWggmKSY6QVkOTeU6E9rQAVFJMcI62AJPeeCu1pBaigmOQYXV8B/wITMWBflDVLfAAAAABJRU5ErkJggg==";
  }
}
