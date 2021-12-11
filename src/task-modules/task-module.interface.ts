import {
  TurnContext,
  TaskModuleRequest,
  TaskModuleResponse,
  MessagingExtensionAction,
  MessagingExtensionActionResponse,
} from "botbuilder";
import { Router } from "express";

export interface ITaskModule {
  fetch(
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse>;

  submit(
    ctx: TurnContext,
    request: TaskModuleRequest
  ): Promise<TaskModuleResponse>;

  getRouter?(): Router;
}

export interface IMessagingExtensionAction extends ITaskModule {
  fetch(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse>;

  submit(
    ctx: TurnContext,
    request: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse>;

  onBotMessagePreviewResponse?(
    ctx: TurnContext,
    request: MessagingExtensionAction,
    userResponse: "edit" | "send"
  ): Promise<MessagingExtensionActionResponse>;
}
