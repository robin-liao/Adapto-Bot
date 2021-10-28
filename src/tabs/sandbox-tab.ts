import { CardFactory, TurnContext } from "botbuilder-core";
import {
  Attachment,
  TabRequest,
  TabResponse,
  TabResponseCard,
} from "botframework-schema";
import { CardGenerator } from "../card-gen";
import { ConvSettingTable } from "../storage/setting-table";
import { TeamsBot } from "../teams-bot";
import { getConversationId, printableJson } from "../utils";
import { IAdaptiveCardTab } from "./tab.interface";

const cardInput = CardFactory.adaptiveCard({
  type: "AdaptiveCard",
  body: [
    {
      type: "TextBlock",
      text: "Adaptive Card Payload",
      weight: "Bolder",
      size: "large",
    },
    {
      type: "Input.Text",
      id: "cardPayload",
      isMultiline: true,
      placeholder: "paste card payload here",
    },
  ],
  actions: [
    {
      type: "Action.Submit",
      title: "Submit",
      data: {},
    },
  ],
});

const cardError = (json: any) =>
  CardFactory.adaptiveCard({
    type: "AdaptiveCard",
    body: [
      {
        type: "TextBlock",
        text: "Error",
        weight: "Bolder",
        size: "large",
        color: "warning",
      },
      {
        type: "RichTextBlock",
        inlines: [
          {
            type: "TextRun",
            fontType: "Monospace",
            text: printableJson(json, {
              indentChar: "　",
              colorize: false,
            }),
          },
        ],
      },
    ],
    actions: [],
  });

export class SandboxTab implements IAdaptiveCardTab {
  async fetch(ctx: TurnContext, request: TabRequest): Promise<TabResponse> {
    return {
      tab: {
        type: "continue",
        value: {
          cards: [{ card: { ...cardInput.content } }],
        },
      },
    };
  }

  async submit(ctx: TurnContext, request: TabRequest): Promise<TabResponse> {
    const input = ctx.activity.value.data;
    const cards: TabResponseCard[] = [{ card: { ...cardInput.content } }];

    try {
      const card = JSON.parse(input.cardPayload);
      if (card) {
        cards.push({ card });
      }
    } catch {
      const card = cardError(input);
      cards.push({ card: card.content });
    }

    return {
      tab: {
        type: "continue",
        value: {
          cards,
        },
      },
    };
  }
}
