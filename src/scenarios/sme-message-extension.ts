import {
  TurnContext,
  MessagingExtensionQuery,
  MessagingExtensionResponse,
  CardFactory,
  MessagingExtensionAttachment,
} from "botbuilder";
import { ITeamsScenario, IScenarioBuilder } from "../teams-bot";
import request from "request";

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
    const manifest = await this.getManifest();
    const apiEndpoint = this.findEndpoint(manifest);

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

  private async getManifest() {
    const url =
      "https://copilotdemo.blob.core.windows.net/sme/api-manifest.json";

    return await new Promise((resolve, reject) => {
      request(url, (err, res, body) =>
        err ? reject(err) : resolve(res.toJSON)
      );
    });
  }

  private async findEndpoint(manifest: any) {
    return manifest.composeExtensions[0]?.apiEndpoint;
  }
}
