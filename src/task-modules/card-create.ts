import {
  TurnContext,
  MessagingExtensionAction,
  MessagingExtensionActionResponse,
  TaskModuleTaskInfo,
  MessageFactory,
  Activity,
  CardFactory,
} from "botbuilder";
import { IMessagingExtensionAction } from ".";
import { CardGenerator } from "../card-gen";

export class TaskModuleCardCreate implements IMessagingExtensionAction {
  constructor(private commandId: string) {}

  public async fetch(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    return {
      task: {
        type: "continue",
        value: {
          title: "Create a card",
          width: "large",
          height: "large",
          card: CardGenerator.adaptive.getJsonCardOfId(25),
        } as TaskModuleTaskInfo,
      } as any,
    };
  }

  public async submit(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    const {
      cardType,
      cardPayload,
      returnAs,
      summary,
      textFormat,
      textContent: text,
      extraPayload,
      botMessagePreviewResponse,
      codeCardPayload,
      codeCardLang,
      codeCardTitle,
      mediaCardURL,
      mediaCardPoster,
      mediaCardMIME,
    } = request.data;
    const attachments = [];

    if (codeCardPayload) {
      attachments.push(
        this.getCodeCard(cardPayload, codeCardLang, codeCardTitle)
      );
    } else if (mediaCardURL) {
      attachments.push(
        this.getMediaCard(mediaCardURL, mediaCardPoster, mediaCardMIME)
      );
    } else if (cardPayload) {
      attachments.push({
        contentType: cardType,
        content: JSON.parse(cardPayload),
      });
    }
    if (
      this.commandId === "createWithPreview" &&
      attachments[0] &&
      !botMessagePreviewResponse
    ) {
      const activityPreview = MessageFactory.attachment(
        attachments[0]
      ) as Activity;
      activityPreview.summary = JSON.stringify(request.data);
      return {
        composeExtension: {
          type: "botMessagePreview",
          activityPreview,
        },
      };
    }

    if ((returnAs as string).includes("asBotCard")) {
      await ctx.sendActivity({
        attachments,
        ...(summary && { summary }),
        ...(text && { text }),
        ...(textFormat && { textFormat }),
        ...(extraPayload && JSON.parse(extraPayload)),
        channelData: {
          notification: { alert: true },
        },
      });
    }

    if ((returnAs as string).includes("asMECard")) {
      return {
        composeExtension: {
          type: "result",
          attachmentLayout: "list",
          attachments,
        },
      };
    }
  }

  public async onBotMessagePreviewResponse(
    ctx: TurnContext,
    request: MessagingExtensionAction,
    userResponse: "edit" | "send"
  ): Promise<MessagingExtensionActionResponse> {
    if (userResponse === "send") {
      request.data = {
        ...JSON.parse(request.botActivityPreview[0].summary),
        botMessagePreviewResponse: userResponse,
      };
      return this.submit(ctx, request);
    } else if (userResponse === "edit") {
      return this.fetch(ctx, request);
    }
  }

  private getCodeCard(
    codeCardPayload: string,
    codeCardLang?: string,
    codeCardTitle?: string
  ) {
    return CardFactory.adaptiveCard({
      $schema: "https://adaptivecards.io/schemas/adaptive-card.json",
      type: "AdaptiveCard",
      version: "1.6",
      msTeams: {
        width: "full",
      },
      body: [
        ...(codeCardTitle
          ? [
              {
                type: "TextBlock",
                text: codeCardTitle,
                size: "large",
                weight: "bolder",
              },
            ]
          : []),
        {
          type: "CodeBlock",
          language: codeCardLang ?? "text",
          startLineNumber: 1,
          codeSnippet: codeCardPayload,
        },
      ],
    });
  }

  private getMediaCard(
    mediaCardURL: string,
    mediaCardPoster?: string,
    mediaCardMIME?: string
  ) {
    return CardFactory.adaptiveCard({
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      type: "AdaptiveCard",
      version: "1.3",
      fallbackText:
        "This card requires Media to be viewed. Ask your platform to update to Adaptive Cards v1.1 for this and more!",
      body: [
        {
          type: "Media",
          ...(mediaCardPoster && { poster: mediaCardPoster }),
          sources: [
            {
              mimeType: mediaCardMIME ?? "video/mp4",
              url: mediaCardURL,
            },
          ],
        },
      ],
    });
  }
}
