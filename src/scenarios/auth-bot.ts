import {
  MessagingExtensionAction,
  MessagingExtensionActionResponse,
  TurnContext,
} from "botbuilder";
import { ITeamsScenario, IScenarioBuilder } from "../teams-bot";
import { Auth } from "../auth";
import { IMessagingExtensionAction } from "../task-modules";

export class AuthBot implements ITeamsScenario, IMessagingExtensionAction {
  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerTaskModule("authTaskModule", this);
  }

  public async fetch(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    return {
      composeExtension: {
        type: "auth",
        suggestedActions: {
          actions: [
            {
              type: "openUrl",
              value: Auth.getAuthUrl(ctx.activity.from.aadObjectId!),
              title: "Sign in to this app",
            },
          ],
        },
      },
    };
  }

  public submit(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    throw new Error("Method not implemented.");
  }
}
