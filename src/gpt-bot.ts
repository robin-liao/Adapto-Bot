import { ActivityTypes, MessageFactory, StatusCodes } from "botbuilder";
import { CardGenerator } from "./card-gen";
import { IScenarioBuilder, ITeamsScenario } from "./teams-bot";
import { OpenAI } from "./openai-api";
export class GPTBot implements ITeamsScenario {
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

      const res = await OpenAI.gpt(
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

      ctx.sendActivity({
        type: ActivityTypes.Typing,
      });

      const res = await OpenAI.gpt(text);
      const msg = MessageFactory.text(res);
      await ctx.sendActivities([msg]);
    });
  }
}
