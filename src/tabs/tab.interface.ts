import { TurnContext, TabRequest, TabResponse } from "botbuilder";

export interface IAdaptiveCardTab {
  fetch(ctx: TurnContext, request: TabRequest): Promise<TabResponse>;
  submit(ctx: TurnContext, request: TabRequest): Promise<TabResponse>;
}
