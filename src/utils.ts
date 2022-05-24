import * as jfs from "jsonfile";
import * as fs from "fs";
import colorizeJson from "json-colorizer";
import {
  TurnContext,
  ChannelAccount,
  Activity,
  ConversationParameters,
  BotFrameworkAdapter,
  ConversationReference,
  teamsGetChannelId,
  MessageFactory,
  TeamsChannelData,
} from "botbuilder";
import { UserDataTable } from "./storage/user-table";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class JsonFile<T = any> {
  private fileName: string;
  private _obj: T;

  constructor(fileName: string) {
    this.fileName = fileName;
    if (fs.existsSync(fileName)) {
      this._obj = jfs.readFileSync(fileName);
    } else {
      this._obj = {} as T;
      this.save();
    }
  }

  public get obj(): T {
    return this._obj;
  }

  public set obj(newObj: T) {
    this._obj = newObj;
    this.save();
  }

  public save(): void {
    fs.writeFile(this.fileName, JSON.stringify(this.obj, null, 2), (err) => {
      if (err) {
        console.log(err);
      }
    });
  }
}

export interface IPrintableJson {
  indentChar?: string;
  indentRepeat?: number;
  colorize?: boolean;
}

export const printableJson = (
  obj: any,
  { indentChar = " ", indentRepeat = 2, colorize = true }: IPrintableJson = {}
) => {
  let str = JSON.stringify(obj, null, indentChar.repeat(indentRepeat));
  if (colorize) {
    str = colorizeJson(str, {
      colors: {
        STRING_KEY: "green",
        STRING_LITERAL: "reset",
        NUMBER_LITERAL: "yellow",
      },
    });
  }
  return str;
};

export const teamsSendProactiveMessage = async (
  context: TurnContext,
  message: Partial<Activity>,
  onNewlyCreatedReplyChain?: (ctx: TurnContext) => Promise<any>
) => {
  const teamsChannelId = teamsGetChannelId(context.activity);
  const channelAccount = context.activity.from as ChannelAccount;
  const newConversation = await teamsCreateConversation(
    context,
    channelAccount,
    teamsChannelId,
    message
  );

  await context.adapter.continueConversation(
    newConversation[0],
    async (ctx) => {
      onNewlyCreatedReplyChain && (await onNewlyCreatedReplyChain(ctx));
    }
  );
};

export const teamsCreateConversation = async (
  context: TurnContext,
  channelAccount: ChannelAccount,
  teamsChannelId: string,
  message: Partial<Activity>
): Promise<[ConversationReference, string]> => {
  const conversationParameters = {
    bot: channelAccount,
    channelData: {
      channel: {
        id: teamsChannelId,
      },
    },
    isGroup: true,
    activity: message,
  } as ConversationParameters;

  const botAdapter = context.adapter as BotFrameworkAdapter;
  const connectorClient = botAdapter.createConnectorClient(
    context.activity.serviceUrl
  );
  const conversationResourceResponse =
    await connectorClient.conversations.createConversation(
      conversationParameters
    );
  const conversationReference = TurnContext.getConversationReference(
    context.activity
  ) as ConversationReference;
  conversationReference.conversation.id = conversationResourceResponse.id;
  return [conversationReference, conversationResourceResponse.activityId];
};

export const isEmail = (email: string) => {
  const regex = new RegExp(
    /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
  );
  return regex.test(email);
};

export const getConversationId = (activity: Activity) =>
  activity.conversation.conversationType === "channel"
    ? (activity.channelData as TeamsChannelData)?.channel?.id ||
      activity.conversation.id
    : activity.conversation.id;

export class OneOnOneHelper {
  public static async saveOneOnOneConvRef(ctx: TurnContext) {
    if (ctx.activity.conversation.conversationType === "personal") {
      const convRefOneOnOne = TurnContext.getConversationReference(
        ctx.activity
      );
      const userId = ctx.activity.from.id;
      const tbl = new UserDataTable(userId);
      await tbl.update({ convRefOneOnOne });
    }
  }

  public static async getOneOnOneCovRef(ctx: TurnContext) {
    const userId = ctx.activity.from.id;
    const tbl = new UserDataTable(userId);
    const userData = await tbl.get("convRefOneOnOne");
    return userData?.convRefOneOnOne;
  }

  public static async sendOneOnOneMessage(
    ctx: TurnContext,
    message: Partial<Activity>
  ) {
    const convRef = await OneOnOneHelper.getOneOnOneCovRef(ctx);
    if (convRef) {
      await ctx.adapter.continueConversation(convRef, async (turnCtx) => {
        await turnCtx.sendActivity(message);
      });
    }
  }
}
