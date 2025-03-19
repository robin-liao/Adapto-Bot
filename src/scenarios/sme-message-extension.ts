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
import { OpenAI } from "../ai/openai-api";
import { XMLParser } from "fast-xml-parser";
import { CURLParser } from "parse-curl-js";
import { ParsedCURL } from "parse-curl-js/dist/interface";
import * as ACData from "adaptivecards-templating";

let _manifestOpenAI: any;

export class SMEMessageExtension implements ITeamsScenario {
  private readonly cmdIdYelp = "query-api-yelp";
  private readonly cmdIdWolframAlpha = "query-openai-wolfram-alpha";
  private readonly cmdKlarna = "query-openai-klarna";
  private readonly wolframAlphaAppId = "VVJ72P-7GHL9A3AP8";
  private readonly curlTemplate: { [cmdId: string]: string } = {};

  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerMessageExtensionQuery(this.cmdIdYelp, (ctx, query) =>
      this.handleQueryYelp(ctx, query)
    );

    teamsBot.registerMessageExtensionQuery(
      this.cmdIdWolframAlpha,
      (ctx, query) => this.handleQueryWolframAlpha(ctx, query)
    );

    teamsBot.registerMessageExtensionQuery(this.cmdKlarna, (ctx, query) =>
      this.handleQueryKlarna(ctx, query)
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
    const manifest = await this.getManifestOpenAI();
    const { requestPrompt, responsePrompt } = await this.parseOpenAIManifest(
      manifest,
      this.cmdIdWolframAlpha
    );

    // sample: make a bar chart with 100, 30, 80, and 51
    const queryTxt = (query.parameters?.[0].value as string) || undefined;

    // open AI input
    // const inputPrompt = this.composePrompt(requestPrompt, {
    //   apispec: JSON.stringify(apiSpec),
    //   input: queryTxt,
    // });
    // const inputConverted = await OpenAI.gpt(inputPrompt);

    // perform Wolfram Alpha
    // const apiEndpoint =
    //   this.parseXMLAndGetResult(inputConverted) +
    //   `&appid=${this.wolframAlphaAppId}`;
    const apiEndpoint = `https://www.wolframalpha.com/api/v1/llm-api?input=${encodeURIComponent(
      queryTxt
    )}&appid=${this.wolframAlphaAppId}`;

    console.log("Call Wolfram Alpha API....");
    const wolframRes = (await this.httpGet(apiEndpoint, false)) as string;
    console.log("Call Wolfram Alpha API....Done!");

    // open AI output
    const outputPrompt = this.composePrompt(responsePrompt, {
      input: wolframRes,
    });
    const outputConverted = await OpenAI.gpt(outputPrompt, 0.85, 2000);
    console.log(outputConverted);

    const output = JSON.parse(
      this.parseXMLAndGetResult(outputConverted)
    ) as any[];

    // prepare ME results
    // const { title, images = [] } = output[1];
    const meCard: MessagingExtensionAttachment = {
      preview: CardFactory.thumbnailCard("Result", queryTxt),
      ...CardFactory.adaptiveCard(output),
    };

    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: [meCard],
      },
    };
  }

  private async handleQueryKlarna(
    ctx: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    const manifest = await this.getManifestKlarna();
    const { apiSpecUrl, defaultVals, queryParamName } =
      await this.parseOpenAIManifest(manifest, this.cmdKlarna);
    const curlTmp = await this.getCurlTemplate(this.cmdKlarna, apiSpecUrl);

    const queryTxt = (query.parameters?.[0].value as string) || undefined;
    const inputs = { [queryParamName]: queryTxt, ...defaultVals };
    const curlReq = this.generateCurlRequest(curlTmp, inputs);
    const curlRes = await this.performCurlRequest(curlReq);

    const cards = this.generateAdaptiveCardsFromCurlResult(curlRes);
    const previews = this.generatePreviewCardsFromCurlResults(curlRes);

    const meCards = _.zip(previews, cards).map(([preview, card]) => {
      const meCard: MessagingExtensionAttachment = {
        preview,
        ...CardFactory.adaptiveCard(card),
      };
      return meCard;
    });

    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: meCards,
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
    // const apiSpec: any = await this.httpGet(me.apiSpecUrl);
    const apiSpecUrl = me.apiSpecUrl;
    const command = (me.commands as any[]).find(
      (cmd) => cmd.id === lookupCmdId
    );
    const requestPrompt: string = command.requestDescriptionForModel;
    const responsePrompt: string = command.responseDescriptionForModel;

    const queryParamName = command.parameters[0].name;

    // prepare defaults
    const defaultVals = {};
    (command.parameters as any[]).forEach((cmd) => {
      if (!_.isUndefined(cmd.defaultValue)) {
        defaultVals[cmd.name] = cmd.defaultValue;
      }
    });
    return {
      apiSpecUrl,
      requestPrompt,
      responsePrompt,
      queryParamName,
      defaultVals,
    };
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

  private async getCurlTemplate(cmdId: string, apiSpecUrl: string) {
    if (!this.curlTemplate[cmdId]) {
      const apiSpec: any = await this.httpGet(apiSpecUrl);
      const prompt = `Generate a curl template with input placeholders by following open API spec where placeholder formats in angle bracket <>. Directly respond curl string without prefix and suffix. [Sepc]${JSON.stringify(
        apiSpec
      )}[End Spec]`;
      const curl = await OpenAI.gpt(prompt);
      console.log(curl);
      this.curlTemplate[cmdId] = curl;
    }
    return this.curlTemplate[cmdId];
  }

  private generateCurlRequest(curlTemplate: string, inputs = {}) {
    let curlSub = curlTemplate;
    _.each(inputs, (val, key) => {
      curlSub = curlSub.replace(`<${key}>`, val);
    });
    console.log(curlSub);
    const parser = new CURLParser(curlSub.trim());
    const curlParsed = parser.parse();
    return curlParsed;
  }

  private async performCurlRequest(curlReq: ParsedCURL) {
    if (curlReq.method === "GET") {
      const url = curlReq.url.replace(/'|"/g, "");
      const body: any = await this.httpGet(url);
      return body;
    }
  }

  private generateAdaptiveCardsFromCurlResult(body: any) {
    const templatePayload = this.getAdaptiveCardTemplateForKlarna();
    const template = new ACData.Template(templatePayload);
    // !!!HARD-CODING!!!
    const items: any[] = body.products;
    const cards = items.map((item) => {
      const card = template.expand({
        $root: item,
      });
      return card;
    });
    return cards;
  }

  private generatePreviewCardsFromCurlResults(body: any) {
    // !!!HARD-CODING!!!
    const items: any[] = body.products;
    const previews = items.map((item) =>
      CardFactory.thumbnailCard(item.name, item.price)
    );
    return previews;
  }

  private async getManifestOpenAI() {
    if (!_manifestOpenAI) {
      const manifestUrl =
        "https://copilotdemo.blob.core.windows.net/sme/openai-manifest.json";
      const manifest = await this.httpGet(manifestUrl);
      _manifestOpenAI = manifest;
    }
    return _manifestOpenAI;
  }

  private async getManifestKlarna() {
    return {
      $schema:
        "https://github.com/OfficeDev/microsoft-teams-app-schema/blob/preview/DevPreview/MicrosoftTeams.schema.json",
      manifestVersion: "devPreview",
      version: "1.0",
      id: "8a2e45c1-928b-4c7a-8f53-5dabf24f0c12",
      packageName: "com.microsoft.teams.samples.klarna",
      developer: {
        name: "Microsoft",
        websiteUrl: "https://example.azurewebsites.net",
        privacyUrl: "https://example.azurewebsites.net/privacy",
        termsOfUseUrl: "https://example.azurewebsites.net/termsofuse",
      },
      name: {
        short: "Klarna (Dev)",
        full: "Klarna (Dev)",
      },
      description: {
        short: "SME Sample - Klarna",
        full: "SME Sample - Klarna",
      },
      icons: {
        outline: "icon-outline.png",
        color: "icon-color.png",
      },
      accentColor: "#FF5A00",
      composeExtensions: [
        {
          type: "openai",
          apiSpecUrl:
            "https://www.klarna.com/us/shopping/public/openai/v0/api-docs/",
          commands: [
            {
              id: "query-openai-klarna",
              context: ["compose", "commandBox"],
              description: "Query command using ChatGPT",
              title: "Search Klarna",
              parameters: [
                {
                  name: "query",
                  title: "Query parameter",
                  description: "Query parameter",
                },
                {
                  name: "size",
                  title: "Size",
                  description: "Number of products returned",
                  defaultValue: 5,
                },
                {
                  name: "budget",
                  title: "Budget",
                  description:
                    "Maximum price of the matching product in local currency, filters results",
                  defaultValue: 300,
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getAdaptiveCardTemplateForKlarna() {
    return {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          text: "Klarna Product",
        },
        {
          type: "TextBlock",
          text: "Name: ${name}",
          style: "strong",
        },
        {
          type: "TextBlock",
          text: "Price: ${price}",
        },
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.OpenUrl",
              title: "Product URL",
              url: "${url}",
            },
          ],
        },
      ],
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.0",
    };
  }
}
