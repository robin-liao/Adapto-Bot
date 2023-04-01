import {
  MessagingExtensionQuery,
  MessagingExtensionResponse,
  TurnContext,
} from "botbuilder";
import request from "request";
import { SMERequest, SMEResponse } from "../sme-router";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";
import axios from "axios";
export class SMEMessageExtension implements ITeamsScenario {
  private readonly cmdId = "query-api-yelp";

  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerMessageExtensionQuery(this.cmdId, (ctx, query) =>
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
    const apiEndpoint = this.findEndpoint(manifest) + "/" + this.cmdId;
    const response = await this.performQuery(apiEndpoint, query);
    return {
      composeExtension: response,
    };
  }

  private async getManifest() {
    const url =
      "https://copilotdemo.blob.core.windows.net/sme/api-manifest.json";

    return await new Promise((resolve, reject) => {
      request(url, (err, res, body) =>
        err ? reject(err) : resolve(JSON.parse(body))
      );
    });
  }

  private findEndpoint(manifest: any) {
    return manifest.composeExtensions[0]?.apiEndpoint;
  }

  private async performQuery(
    apiEndpoint: string,
    query: SMERequest
  ): Promise<SMEResponse> {
    const res = await axios.post(apiEndpoint, query);
    const json = res.data;
    return json;
  }
}
