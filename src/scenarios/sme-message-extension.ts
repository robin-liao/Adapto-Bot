import {
  TurnContext,
  MessagingExtensionQuery,
  MessagingExtensionResponse,
  CardFactory,
  MessagingExtensionAttachment,
} from "botbuilder";
import { ITeamsScenario, IScenarioBuilder } from "../teams-bot";

export class SMEMessageExtension implements ITeamsScenario {
  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerMessageExtensionQuery("query-api-yelp", (ctx, query) =>
      this.handleQueryAPI(ctx, query)
    );

    teamsBot.registerMessageExtensionQuery(
      "query-openai-wolfram-alpha",
      (ctx, query) => this.handleQueryAPI(ctx, query)
    );
  }

  private async handleQueryAPI(
    ctx: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    const queryTxt = (query.parameters?.[0].value as string) || undefined;

    const card = CardFactory.adaptiveCard({
      type: "AdaptiveCard",
      version: "1.0",
      body: [
        {
          type: "TextBlock",
          text: queryTxt,
        },
      ],
    });

    const meCard: MessagingExtensionAttachment = {
      preview: CardFactory.heroCard(queryTxt),
      ...card,
    };

    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: [meCard],
      },
    };
  }
}
