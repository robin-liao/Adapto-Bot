import {
  TurnContext,
  MessagingExtensionAction,
  MessagingExtensionActionResponse,
  TaskModuleTaskInfo,
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
    const { cardType, cardPayload, returnAs, summary, textFormat, textContent: text } = request.data;
    const attachments = cardPayload ? [{
      contentType: cardType,
      content: JSON.parse(cardPayload),
    }] : [];
    if ((returnAs as string).includes("asBotCard")) {
      await ctx.sendActivity({
        attachments,
        ...(summary && {summary}),
        ...(text && {text}),
        ...(textFormat && {textFormat}),
      });
    }
    if ((returnAs as string).includes("asMECard")) {
      return {
        composeExtension: {
          type: "result",
          attachmentLayout: "list",
          attachments
        },
      };
    }
  }
}
