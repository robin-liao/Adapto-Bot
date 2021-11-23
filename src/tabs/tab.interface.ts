import { TurnContext, TabRequest, TabResponse } from "botbuilder";

export interface IAdaptiveCardTab {
  tabFetch(ctx: TurnContext, request: TabRequest): Promise<TabResponse>;
  tabSubmit(ctx: TurnContext, request: TabRequest): Promise<TabResponse>;
}
