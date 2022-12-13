import {
  ActivityTypes,
  MessageFactory,
  StatusCodes,
  TurnContext,
} from "botbuilder";
import { Configuration, OpenAIApi } from "openai";
import { CardGenerator } from "./card-gen";
import { IScenarioBuilder, ITeamsScenario } from "./teams-bot";

export class GPTBot implements ITeamsScenario {
  private readonly openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  public accept(teamsBot: IScenarioBuilder) {
    this.registerTextCommands(teamsBot);
    teamsBot.registerInvoke("gptSubmit", async (ctx) => {
      const {
        text = "",
        temperature,
        max_tokens,
        frequency_penalty,
        presence_penalty,
      } = ctx.activity.value;

      const res = await this.processGPT(
        ctx,
        text,
        parseFloat(temperature),
        parseInt(max_tokens),
        parseFloat(frequency_penalty),
        parseFloat(presence_penalty)
      );

      const msg = MessageFactory.text(res);
      await ctx.sendActivities([msg]);
      return { status: StatusCodes.OK };
    });
  }

  private registerTextCommands(teamsBot: IScenarioBuilder) {
    teamsBot.registerTextCommand(/^gpt/i, async (ctx, cmd, args) => {
      const text = ctx.activity.text.replace("gpt", "").trim();

      if (!text) {
        const card = CardGenerator.adaptive.getJsonCardOfId(62);
        await ctx.sendActivity(MessageFactory.attachment(card));
        return;
      }

      const res = await this.processGPT(ctx, text);
      const msg = MessageFactory.text(res);
      await ctx.sendActivities([msg]);
    });
  }

  private async processGPT(
    ctx: TurnContext,
    text: string,
    temperature = 0.9,
    max_tokens = 1000,
    frequency_penalty = 0.0,
    presence_penalty = 0.6
  ) {
    ctx.sendActivity({
      type: ActivityTypes.Typing,
    });

    console.log(
      `text=${text}\ntemperature=${temperature}\nmax_tokens=${max_tokens}\nfrequency_penalty=${frequency_penalty}\npresence_penalty=${presence_penalty}`
    );
    const response = await this.openai.createCompletion({
      model: "text-davinci-003",
      prompt: text,
      temperature,
      max_tokens,
      top_p: 1,
      frequency_penalty,
      presence_penalty,
    });

    return response.data.choices[0].text;
  }
}
