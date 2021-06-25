import { TurnContext } from "botbuilder-core";
import { TabRequest, TabResponse } from "botframework-schema";
import { CardGenerator } from "../card-gen";
import { ConvSettingTable } from "../storage/setting-table";
import { TeamsBot } from "../teams-bot";
import { getConversationId } from "../utils";
import { IAdaptiveCardTab } from "./tab.interface";

export class SettingTab implements IAdaptiveCardTab {
  async fetch(ctx: TurnContext, request: TabRequest): Promise<TabResponse> {
    const convId = getConversationId(ctx.activity);
    const setting = await new ConvSettingTable(convId).get();
    const card = CardGenerator.adaptive.settingCard(setting);
    return {
      tab: {
        type: "continue",
        value: {
          cards: [{ card: { ...card.content } }],
        },
      },
    };
  }

  async submit(ctx: TurnContext, request: TabRequest): Promise<TabResponse> {
    ctx.activity.value = ctx.activity.value.data;
    try {
      await TeamsBot.handleInvoke(ctx);
    } catch {}
    return { tab: {} };
  }
}
