import { IAdaptiveCard } from "adaptivecards";
import {
  TurnContext,
  MessagingExtensionAction,
  TaskModuleResponse,
  MessageFactory,
  CardFactory,
  TabRequest,
  TabResponse,
  ActivityTypes,
  InvokeResponse,
  StatusCodes,
} from "botbuilder";
import { WorkTagManager } from "../storage/work-tag-manager";
import { IAdaptiveCardTab } from "../tabs";
import { ITaskModule } from "../task-modules";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";
import { OneOnOneHelper } from "../utils";

export class WorkBot implements ITeamsScenario, ITaskModule, IAdaptiveCardTab {
  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerTaskModule("tagWork", this);
    teamsBot.registerTab("tab-tag-work", this);
    this.registerTextCommands(teamsBot);

    teamsBot.registerInvoke("tagWork-RemoveConvLink", (ctx) =>
      this.invokeRemoveConvLink(ctx)
    );

    teamsBot.registerInvoke("tagWork-DeleteTag", (ctx) =>
      this.invokeDeleteTag(ctx)
    );
  }

  public async fetch(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<TaskModuleResponse> {
    const card = await this.getTagSelectCard(ctx.activity.from.id, request);
    return Promise.resolve<TaskModuleResponse>({
      task: {
        type: "continue",
        value: {
          card,
        },
      } as any,
    });
  }

  public async submit(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<TaskModuleResponse> {
    const {
      selectedTag,
      createdTag,
      createdTag_note = "",
      convLink,
    } = request.data;
    const userId = ctx.activity.from.id;
    const mang = new WorkTagManager(userId);
    if (createdTag) {
      await mang.createTag(createdTag, {
        note: createdTag_note,
        ...(convLink && { convLinks: [convLink] }),
      });
    } else if (selectedTag && convLink) {
      await mang.tagConversation(selectedTag, convLink);
    }

    const updateCard = await this.getTagListCard(userId);
    const updateMsg = MessageFactory.attachment(updateCard);
    await OneOnOneHelper.sendOneOnOneMessage(ctx, updateMsg);

    return {};
  }

  public async tabFetch(
    ctx: TurnContext,
    request: TabRequest
  ): Promise<TabResponse> {
    const userId = ctx.activity.from.id;
    const card = await this.getTagListCard(userId);
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
    throw new Error("Method not implemented.");
  }

  private registerTextCommands(teamsBot: IScenarioBuilder) {
    teamsBot.registerTextCommand(/^tag/i, async (ctx, command, args) => {
      if (args?.[0].toLowerCase() === "list") {
        const userId = ctx.activity.from.id;
        const card = await this.getTagListCard(userId);
        const message = MessageFactory.attachment(card);
        await ctx.sendActivity(message);
      }
    });
  }

  private async invokeRemoveConvLink(
    ctx: TurnContext
  ): Promise<InvokeResponse> {
    const userId = ctx.activity.from.id;
    const mang = new WorkTagManager(userId);
    const { tag, link } = ctx.activity.value;
    await mang.removeConversationLink(tag, link);
    await this.sendUpdateCard(ctx);
    return { status: StatusCodes.OK };
  }

  private async invokeDeleteTag(ctx: TurnContext): Promise<InvokeResponse> {
    const userId = ctx.activity.from.id;
    const mang = new WorkTagManager(userId);
    const { tag } = ctx.activity.value;
    await mang.deleteTag(tag);
    await this.sendUpdateCard(ctx);
    return { status: StatusCodes.OK };
  }

  private async sendUpdateCard(ctx: TurnContext) {
    const userId = ctx.activity.from.id;
    const card = await this.getTagListCard(userId);
    await ctx.updateActivity({
      type: ActivityTypes.Message,
      id: ctx.activity.replyToId,
      attachments: [card],
    });
  }

  private async getTagListCard(userId: string) {
    const mang = new WorkTagManager(userId);
    const tags = await mang.listTags();
    const payload: IAdaptiveCard = {
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
      type: "AdaptiveCard",
      msTeams: {
        width: "full",
      },
      body: tags.map((tagEntry) => ({
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "auto",
            items: [
              {
                type: "Image",
                url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTuFuDadRe2tw4FCHYKNlbL6l6zDH6aOWXvYlB192m6vs0PY8kbEcXvhcodqECeQ6CQez8&usqp=CAU",
                width: "16px",
                height: "16px",
                selectAction: {
                  type: "Action.Submit",
                  data: {
                    intent: "tagWork-DeleteTag",
                    tag: tagEntry.tag,
                  },
                },
              } as any,
            ],
          },
          {
            type: "Column",
            width: "auto",
            items: [
              {
                type: "RichTextBlock",
                inlines: [
                  {
                    type: "TextRun",
                    fontType: "Monospace",
                    text: tagEntry.tag,
                  },
                ],
              },
            ],
          },
          {
            type: "Column",
            width: "stretch",
            items: [
              {
                type: "ColumnSet",
                columns: [
                  {
                    type: "Column",
                    items: [
                      {
                        type: "TextBlock",
                        text: tagEntry.convLinks
                          .map(
                            (link, id) =>
                              `- [conv ${
                                id + 1
                              }](${link}) (${this.getConversationTypeFromLink(
                                link
                              )})`
                          )
                          .join("\r\n"),
                      },
                    ],
                  },
                  {
                    type: "Column",
                    items: tagEntry.convLinks.map((link) => ({
                      type: "Image",
                      url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTuFuDadRe2tw4FCHYKNlbL6l6zDH6aOWXvYlB192m6vs0PY8kbEcXvhcodqECeQ6CQez8&usqp=CAU",
                      width: "16px",
                      height: "16px",
                      selectAction: {
                        type: "Action.Submit",
                        data: {
                          intent: "tagWork-RemoveConvLink",
                          tag: tagEntry.tag,
                          link,
                        },
                      },
                    })),
                  },
                ],
              },
            ],
          },
        ],
      })),
    };

    return CardFactory.adaptiveCard(payload);
  }

  private async getTagSelectCard(
    userId: string,
    request: MessagingExtensionAction
  ) {
    const mang = new WorkTagManager(userId);
    const tags = await mang.listTags();
    const convLink = request.messagePayload.linkToMessage;
    const payload: IAdaptiveCard = {
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
      type: "AdaptiveCard",
      body: [
        { type: "TextBlock", text: "Select Tag", weight: "bolder" },
        {
          id: "selectedTag",
          type: "Input.ChoiceSet",
          style: "filtered",
          choices: tags.map((tagEntry) => ({
            title: `${tagEntry.tag} (${tagEntry.note})`,
            value: tagEntry.tag,
          })),
        } as any,
        { type: "TextBlock", text: "Create Tag", weight: "bolder" },
        {
          id: "createdTag",
          type: "Input.Text",
          placeholder: "Enter new tag",
        },
        {
          id: "createdTag_note",
          type: "Input.Text",
          placeholder: "Notes for new tag",
          isMultiline: true,
        },
      ],
      actions: [
        {
          id: "dummy",
          type: "Action.Submit",
          data: {
            ...(convLink && { convLink }),
          },
        },
      ],
    };
    return CardFactory.adaptiveCard(payload);
  }

  private getConversationTypeFromLink(link: string) {
    return link.includes("context=%7B%22contextType%22:%22chat%22%7D")
      ? "chat"
      : "channel";
  }
}
