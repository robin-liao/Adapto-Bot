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
  ActivityTypes,
  BotAdapter,
} from "botbuilder";
import { UserDataTable } from "./storage/user-table";
import config from "./config";

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

export type StreamType = "informative" | "streaming";

export type Chunck = {
  text: string;
  streamType: StreamType | "final";
};

export class TextStreaming {
  private streamId: string;
  private streamSequence = 1;
  private queue: Chunck[] = [];
  private timer: NodeJS.Timeout;
  private closed = false;
  private isWorking = false;

  public static async create(
    adaptor: BotAdapter,
    convRef: ConversationReference,
    text: string,
    streamType: StreamType = "informative"
  ) {
    const stream = new TextStreaming(adaptor, convRef);
    await stream.start(text, streamType);
    return stream;
  }

  private constructor(
    private adaptor: BotAdapter,
    private convRef: ConversationReference
  ) {}

  private async performContext(logic: (context: TurnContext) => Promise<void>) {
    return new Promise<TurnContext>((resolve, reject) => {
      this.adaptor.continueConversationAsync(
        config.microsoftAppID,
        this.convRef,
        async (turnCtx) => {
          turnCtx.onSendActivities(async (ctx, activities, next) => {
            console.log();
            console.log("[SEND-ACTIVITIES REQUEST]");
            console.log(printableJson(activities));
            console.log();

            const result = await next();

            console.log();
            console.log("[SEND-ACTIVITIES RESPONSE]");
            console.log(printableJson(result));
            console.log();

            return result;
          });
          try {
            await logic(turnCtx);
            resolve(turnCtx);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  private async start(text: string, streamType) {
    const handleError = async (error) => {
      console.log(`ERROR: ${error.message}`);
      await this.performContext(async (ctx) => {
        this.streamId &&
          (await ctx.sendActivity({
            type: ActivityTypes.Message,
            text,
            entities: [
              {
                type: "streaminfo",
                streamId: this.streamId,
                streamType: "final",
              },
            ],
          }));
        await ctx.sendActivity({
          type: ActivityTypes.Message,
          text: `Error: ${error.message}`,
        });
      });
    };

    await this.performContext(async (ctx) => {
      const send = async () => {
        const { id: streamId } = await ctx.sendActivity({
          type: ActivityTypes.Typing,
          text,
          entities: [
            {
              type: "streaminfo",
              streamType,
              streamSequence: 1,
            },
          ],
        });
        this.streamId = streamId;
      };

      let shouldTry = true;
      let retryWait = 2;
      while (shouldTry) {
        try {
          await send();
          shouldTry = false;
          ++this.streamSequence;
        } catch (error) {
          console.log(`ERROR: ${error.message}`);
          if (error.statusCode === 429) {
            console.log(`RETRY AFTER ${retryWait} secs...`);
            await sleep(retryWait * 1000);
            shouldTry = true;
            retryWait *= 2;
          } else {
            shouldTry = false;
            await handleError(error);
          }
        }
      }
      this.startInterval();
    });
    return this;
  }

  public update(text: string, streamType: StreamType = "streaming") {
    !this.closed && this.queue.push({ text, streamType });
  }

  public end(text: string) {
    !this.closed && this.queue.push({ text, streamType: "final" });
    this.closed = true;
  }

  public async waitUntilFinish() {
    return new Promise<void>((resolve) => {
      setInterval(() => {
        if (this.timer === undefined && this.queue.length === 0) {
          resolve();
        }
      }, 100);
    });
  }

  private async startInterval() {
    this.timer = setInterval(async () => {
      if (!this.isWorking) {
        if (this.queue.length > 0) {
          await this.consumeChunk();
        } else if (this.closed) {
          clearInterval(this.timer);
          this.timer = undefined;
        }
      }
    }, 100);
  }

  private async consumeChunk() {
    this.isWorking = true;

    let { text, streamType } = this.queue.shift();

    while (true) {
      const peek = this.queue[0];
      if (peek && peek.streamType === streamType) {
        const { text: next } = this.queue.shift();
        text = next;
      } else {
        break;
      }
    }

    console.log(`Chunk: ${streamType}  ${text} `);

    const send = async () => {
      console.log("SEND...");
      await this.performContext(async (ctx) => {
        await ctx.sendActivity({
          type:
            streamType === "final"
              ? ActivityTypes.Message
              : ActivityTypes.Typing,
          text,
          entities: [
            {
              type: "streaminfo",
              streamId: this.streamId,
              streamType,
              ...(streamType !== "final" && {
                streamSequence: this.streamSequence,
              }),
            },
          ],
        });
      });
      console.log("SEND...DONE");
    };

    const postSend = () => {
      console.log("POST-SEND");
      if (streamType === "final") {
        this.queue = [];
      } else {
        ++this.streamSequence;
      }
    };

    const handleError = async (error) => {
      this.queue = [];
      this.closed = true;
      console.log(`ERROR: ${error.message}`);
      await this.performContext(async (ctx) => {
        this.streamId &&
          (await ctx.sendActivity({
            type: ActivityTypes.Message,
            text,
            entities: [
              {
                type: "streaminfo",
                streamId: this.streamId,
                streamType: "final",
              },
            ],
          }));
        await ctx.sendActivity({
          type: ActivityTypes.Message,
          text: `Error: ${error.message}`,
        });
      });
    };

    let shouldTry = true;
    let retryWait = 2;
    while (shouldTry) {
      try {
        await send();
        postSend();
        shouldTry = false;
      } catch (error) {
        console.log(`ERROR: ${error.message}`);
        if (error.statusCode === 429) {
          console.log(`RETRY AFTER ${retryWait} secs...`);
          await sleep(retryWait * 1000);
          shouldTry = true;
          retryWait *= 2;
        } else {
          shouldTry = false;
          await handleError(error);
        }
      }
    }

    this.isWorking = false;
  }
}
export class EndlessTextStreaming {
  private queue: Chunck[] = [];
  private isWorking = false;
  private txtStream: TextStreaming;

  constructor(
    private adaptor: BotAdapter,
    private convRef: ConversationReference
  ) {
    setInterval(async () => {
      if (!this.isWorking && this.queue.length > 0) {
        await this.consumeChunk();
      }
    }, 100);
  }

  public update(text: string, isFinal = false) {
    !isFinal
      ? this.queue.push({ text, streamType: "streaming" })
      : this.queue.push({ text, streamType: "final" });
  }

  private async consumeChunk() {
    this.isWorking = true;
    const { text, streamType } = this.queue.shift();
    if (streamType !== "final") {
      if (!this.txtStream) {
        this.txtStream = await TextStreaming.create(
          this.adaptor,
          this.convRef,
          text,
          "streaming"
        );
      } else {
        this.txtStream.update(text);
      }
    } else {
      if (!this.txtStream) {
        this.txtStream = await TextStreaming.create(
          this.adaptor,
          this.convRef,
          text,
          "streaming"
        );
      }
      await this.txtStream.end(text);
      this.txtStream = undefined;
    }
    this.isWorking = false;
  }
}
