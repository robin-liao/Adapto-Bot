import { ActivityTypes, MessageFactory } from "botbuilder";
import { Configuration, OpenAIApi } from "openai";
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
  }

  private registerTextCommands(teamsBot: IScenarioBuilder) {
    teamsBot.registerTextCommand(/^gpt/i, async (ctx, cmd, args) => {
      const text = ctx.activity.text.replace("gpt", "");

      ctx.sendActivity({
        type: ActivityTypes.Typing,
      });

      const response = await this.openai.createCompletion({
        model: "text-davinci-003",
        prompt: text,
        temperature: 0.9,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0.0,
        presence_penalty: 0.6,
      });

      const msg = MessageFactory.text(response.data.choices[0].text);
      await ctx.sendActivities([msg]);
    });
  }
}
