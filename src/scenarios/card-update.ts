import {
  Activity,
  ActivityTypes,
  CardFactory,
  StatusCodes,
} from "botbuilder-core";
import { ITeamsScenario, IScenarioBuilder } from "../teams-bot";

export class CardUpdate implements ITeamsScenario {
  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerTextCommand(/^update/i, async (ctx) => {
      const card = CardFactory.adaptiveCard(payload());
      await ctx.sendActivity({
        attachments: [card],
      });
    });

    teamsBot.registerInvoke("cardCustomUpdate", async (ctx) => {
      const value = ctx.activity.value;
      const updateCardId: string = value?.updateCardId;
      const json = value.payload && JSON.parse(value.payload);
      const renderingCard = json && CardFactory.adaptiveCard(json);

      if (!updateCardId) {
        const cardId = await teamsBot.sendCard(ctx, renderingCard);
        const controlCard = CardFactory.adaptiveCard(payload(cardId[0]));
        const controlCardUpdate: Partial<Activity> = {
          type: ActivityTypes.Message,
          id: ctx.activity.replyToId,
          attachments: [controlCard],
        };
        await ctx.updateActivity(controlCardUpdate);
      } else {
        const renderCardUpdate: Partial<Activity> = {
          type: ActivityTypes.Message,
          id: updateCardId,
          attachments: [renderingCard],
        };
        await ctx.updateActivity(renderCardUpdate);
      }

      return { status: StatusCodes.OK };
    });
  }
}

const payload = (updateCardId?: string) => ({
  type: "AdaptiveCard",
  body: [
    {
      type: "TextBlock",
      text: "Custom Card Update",
      weight: "bolder",
      size: "large",
    },
    {
      type: "Input.Text",
      id: "payload",
      isMultiline: true,
      placeholder: "Post Adaptive Card payload here",
    },
  ],
  actions: [
    {
      type: "Action.Submit",
      title: updateCardId ? "Update" : "Post",
      data: {
        intent: "cardCustomUpdate",
        updateCardId,
      },
    },
  ],
});
