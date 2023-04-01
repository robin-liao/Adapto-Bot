import {
  CardFactory,
  MessagingExtensionAttachment,
  MessagingExtensionQuery,
  MessagingExtensionResponse,
  TurnContext,
} from "botbuilder";
import request from "request";
import { SMERequest, SMEResponse } from "../sme-router";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";
import axios from "axios";
import * as _ from "lodash";
import { OpenAI } from "../openai-api";
import { XMLParser } from "fast-xml-parser";

export class SMEMessageExtension implements ITeamsScenario {
  private readonly cmdIdYelp = "query-api-yelp";
  private readonly cmdIdWolframAlpha = "query-openai-wolfram-alpha";
  private readonly wolframAlphaAppId = "VVJ72P-7GHL9A3AP8";

  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerMessageExtensionQuery(this.cmdIdYelp, (ctx, query) =>
      this.handleQueryYelp(ctx, query)
    );

    teamsBot.registerMessageExtensionQuery(
      this.cmdIdWolframAlpha,
      (ctx, query) => this.handleQueryWolframAlpha(ctx, query)
    );
  }

  private async handleQueryYelp(
    ctx: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    const manifestUrl =
      "https://copilotdemo.blob.core.windows.net/sme/api-manifest.json";
    const manifest = await this.httpGet(manifestUrl);
    const apiEndpoint = this.findEndpoint(manifest) + "/" + this.cmdIdYelp;
    const response = await this.performQuery(apiEndpoint, query);
    return {
      composeExtension: response,
    };
  }

  private async handleQueryWolframAlpha(
    ctx: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    const manifestUrl =
      "https://copilotdemo.blob.core.windows.net/sme/openai-manifest.json";
    const manifest = await this.httpGet(manifestUrl);
    const { apiSpec, requestPrompt, responsePrompt } =
      await this.parseOpenAIManifest(manifest, this.cmdIdWolframAlpha);

    // sample: make a bar chart with 100, 30, 80, and 51
    const queryTxt = (query.parameters?.[0].value as string) || undefined;

    // open AI input
    const inputPrompt = this.composePrompt(requestPrompt, {
      apispec: JSON.stringify(apiSpec),
      input: queryTxt,
    });
    const inputConverted = await OpenAI.gpt(inputPrompt);

    // perform Wolfram Alpha
    const apiEndpoint =
      this.parseXMLAndGetResult(inputConverted) +
      `&appid=${this.wolframAlphaAppId}`;
    const wolframRes = (await this.httpGet(apiEndpoint, false)) as string;

    // open AI output
    const outputPrompt = this.composePrompt(responsePrompt, {
      input: wolframRes,
    });
    const outputConverted = await OpenAI.gpt(outputPrompt, 0.9, 2000);
    const output = JSON.parse(
      this.parseXMLAndGetResult(outputConverted)
    ) as any[];

    // prepare ME results
    const { title, images = [] } = output[1];
    const meCard: MessagingExtensionAttachment = {
      preview: CardFactory.thumbnailCard(title, images),
      ...CardFactory.adaptiveCard(output[0]),
    };

    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: [meCard],
      },
    };
  }

  private async httpGet(url: string, parseJson = true) {
    return await new Promise((resolve, reject) => {
      request(url, (err, res, body) =>
        err ? reject(err) : resolve(parseJson ? JSON.parse(body) : body)
      );
    });
  }

  private findEndpoint(manifest: any) {
    return manifest.composeExtensions[0]?.apiEndpoint;
  }

  private async parseOpenAIManifest(manifest: any, lookupCmdId) {
    const me = manifest.composeExtensions[0];
    const apiSpec: any = await this.httpGet(me.apiSpecUrl);
    const command = (me.commands as any[]).find(
      (cmd) => cmd.id === lookupCmdId
    );
    const requestPrompt: string = command.requestDescriptionForModel;
    const responsePrompt: string = command.responseDescriptionForModel;
    return { apiSpec, requestPrompt, responsePrompt };
  }

  private async performQuery(
    apiEndpoint: string,
    query: SMERequest
  ): Promise<SMEResponse> {
    const res = await axios.post(apiEndpoint, query);
    const json = res.data;
    return json;
  }

  private composePrompt(
    promptPattern: string,
    subValues: { [key: string]: string }
  ) {
    let res = promptPattern;
    _.each(subValues, (val, key) => {
      res = res.replace(`{{$${key}}}`, val);
    });
    return res;
  }

  private parseXMLAndGetResult(xml: string) {
    const parser = new XMLParser();
    const jObj = parser.parse(xml);
    return jObj.result;
  }
}
