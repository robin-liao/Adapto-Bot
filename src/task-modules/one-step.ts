import {
  TurnContext,
  TaskModuleRequest,
  TaskModuleResponse,
  CardFactory,
} from "botbuilder";
import { ITaskModule } from "./task-module.interface";

export class TaskModuleOneStep implements ITaskModule {
  constructor(private commandId: string) {}

  public fetch(
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse> {
    return Promise.resolve<TaskModuleResponse>({
      task: {
        type: "continue",
        value: {
          card: CardFactory.adaptiveCard({
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.2",
            body: [
              {
                type: "TextBlock",
                text: "Hello",
              },
            ],
            actions: [
              {
                type: "Action.Submit",
                data: {
                  commandId: this.commandId,
                },
              },
            ],
          }),
        },
      } as any,
    });
  }

  public submit(
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse> {
    return Promise.resolve({
      task: {
        type: "message",
        value: "Goodbye!",
      } as any,
    });
  }
}
