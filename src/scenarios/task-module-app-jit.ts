import {
  CardFactory,
  TaskModuleRequest,
  TaskModuleResponse,
  TeamsInfo,
  TurnContext,
} from "botbuilder";
import {
  createAdaptiveCardPersona,
  IComponentUser,
} from "../adaptive-card-helper";
import { ITaskModule } from "../task-modules";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";

export class TaskModuleAppJIT implements ITeamsScenario, ITaskModule {
  private readonly commandId = "appJIT";

  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerTaskModule(this.commandId, this);
  }

  public async fetch(
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse> {
    try {
      const info3 = await TeamsInfo.getMembers(ctx);
      const users = info3.map<IComponentUser>((user) => ({
        id: user.aadObjectId,
        displayName: user.name,
        userPrincipalName: user.userPrincipalName,
      }));
      const card = CardFactory.adaptiveCard({
        type: "AdaptiveCard",
        $schema: "https://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.2",
        body: [
          {
            type: "TextBlock",
            size: "Large",
            weight: "Bolder",
            color: "Good",
            text: "App is already installed",
          },
          {
            type: "TextBlock",
            weight: "Bolder",
            text: "Members",
          },
          ...users.map((user) => createAdaptiveCardPersona(user)),
        ],
      });
      return {
        task: {
          type: "continue",
          value: {
            title: "App installed",
            card,
          },
        },
      };
    } catch {
      const card =
        (request.data?.card && JSON.parse(request.data.card)) || this.noJITCard;
      return {
        task: {
          type: "continue",
          value: {
            title: "App NOT installed",
            card: CardFactory.adaptiveCard(card),
          },
        },
      };
    }
  }

  public async submit(
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse> {
    return null;
  }

  private get noJITCard() {
    return {
      type: "AdaptiveCard",
      $schema: "https://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
      body: [
        {
          type: "TextBlock",
          size: "Large",
          weight: "Bolder",
          color: "Attention",
          text: "App not installed",
        },
        {
          type: "TextBlock",
          weight: "Bolder",
          text: "No JIT card found",
        },
      ],
    };
  }
}
