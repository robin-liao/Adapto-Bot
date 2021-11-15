import {
  TurnContext,
  TaskModuleRequest,
  TaskModuleResponse,
  CardFactory,
} from "botbuilder";
import { ITaskModule } from "./task-module.interface";
import { Router } from "express";
import * as fs from "fs";
import config from "../config";

export class TaskModuleLaunch implements ITaskModule {
  private router = Router();

  constructor(private commandId: string) {
    this.router.get("/", (req, res) => {
      const json = {
        commandId,
        path: req.path,
        query: req.query,
        params: req.params,
      };
      // res.send(json);
      res.set("Content-Type", "text/html");
      const html = fs.readFileSync(__dirname + "/launch-task-module.html");
      res.send(html);
      res.end();
    });
  }

  public getRouter() {
    return this.router;
  }

  public fetch(
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse> {
    return Promise.resolve<TaskModuleResponse>({
      task: {
        type: "continue",
        value: {
          url: `${config.host}/task/${this.commandId}?groupId={groupId}&teamId={teamId}&entityId={entityId}&channelId={channelId}&tid={tid}&userObjectId={userObjectId}&sessionId={sessionId}&theme={theme}&locale={locale}&ringId={ringId}&platform={hostClientType}&parentMessageId={parentMessageId}`,
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
