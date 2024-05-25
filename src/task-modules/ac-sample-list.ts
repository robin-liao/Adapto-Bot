import {
  TurnContext,
  TaskModuleTaskInfo,
  TaskModuleRequest,
  TaskModuleResponse,
  CardFactory,
} from "botbuilder";
import { ITaskModule } from ".";
import { CardGenerator } from "../card-gen";
import { ITeamsScenario, IScenarioBuilder } from "../teams-bot";

export class TaskModuleAdaptiveCardList implements ITeamsScenario, ITaskModule {
  private readonly commandId = "acSampleList";

  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerTaskModule(this.commandId, this);
    teamsBot.registerTextCommand(
      /^acSampleList/i,
      async (ctx, _command, args) => {
        const [query] = args;
        const card = CardFactory.adaptiveCard({
          type: "AdaptiveCard",
          version: "1.3",
          body: !query
            ? [
                {
                  type: "Input.Text",
                  placeholder: "Query a card by ID or name",
                  id: "query",
                },
              ]
            : [],
          actions: [
            {
              type: "Action.Submit",
              title: "Show Card JSON",
              style: "positive",
              data: {
                ...(query && { query }),
                commandId: "acSampleList",
                msteams: {
                  type: "task/fetch",
                },
              },
            },
          ],
        });
        await ctx.sendActivity({
          attachments: [card],
        });
      }
    );
  }

  public async fetch(
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse> {
    const card = CardGenerator.adaptive.getJsonCardIncludingName(
      request.data.query ?? "01"
    );
    return {
      task: {
        type: "continue",
        value: {
          title: "Show Example Card",
          width: "large",
          height: "medium",
          card: {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              $schema: "https://adaptivecards.io/schemas/adaptive-card.json",
              type: "AdaptiveCard",
              version: "1.5",
              body: [
                {
                  type: "CodeBlock",
                  language: "json",
                  startLineNumber: 1,
                  codeSnippet: JSON.stringify(card.content ?? {}, null, 2),
                },
              ],
              msTeams: {
                width: "full",
              },
            },
          },
        } as TaskModuleTaskInfo,
      } as any,
    };
  }

  public async submit(
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse> {
    return null;
  }
}
