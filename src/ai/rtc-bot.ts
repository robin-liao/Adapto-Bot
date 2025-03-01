import {
  ActivityTypes,
  BotAdapter,
  ConversationReference,
  StatusCodes,
  TurnContext,
} from "botbuilder";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";
import {
  createPeerConnection,
  OpenAITrack,
  SineWaveTrack,
  Transcriber,
  VolumnAdjust,
} from "./webrtc-utils";
import { MediaStream } from "wrtc";
import { EndlessTextStreaming, TextStreaming } from "../utils";
import config from "../config";
import { CardGenerator } from "../card-gen";

export class WebRTCBot implements ITeamsScenario {
  private senderStream: MediaStream = new MediaStream();
  private adaptor: BotAdapter;
  private convRef: ConversationReference;
  private activeId: string;
  private txtStream: TextStreaming;
  private endlessStream: EndlessTextStreaming;

  private async createContext() {
    return new Promise<TurnContext>((resolve) => {
      this.adaptor.continueConversationAsync(
        config.microsoftAppID,
        this.convRef,
        async (turnCtx) => {
          resolve(turnCtx);
        }
      );
    });
  }

  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerACv2Handler("sineWave", (ctx, data) =>
      this.handleSineWave(ctx, data)
    );
    teamsBot.registerACv2Handler("transcribe", (ctx, data) =>
      this.handleTranscribe(ctx, data)
    );
    teamsBot.registerACv2Handler("echo", (ctx, data) =>
      this.handleEcho(ctx, data)
    );
    teamsBot.registerACv2Handler("openai", (ctx, data) =>
      this.handleOpenAI(ctx, data)
    );
  }

  private async handleTranscribe(ctx: TurnContext, data: any) {
    this.adaptor = ctx.adapter;
    this.convRef = TurnContext.getConversationReference(
      ctx.activity
    ) as ConversationReference;

    this.endlessStream = new EndlessTextStreaming(this.adaptor, this.convRef);

    const { localDescription: sdp } = await createPeerConnection(
      data.sdp,
      (event, _peer) => {
        console.log("Save client sender stream");
        this.senderStream = event.streams[0];
      },
      (peer) => {
        this.senderStream.getTracks().forEach((track) => {
          console.log(
            `add track to peer connection: ${track.kind.toUpperCase()} ${
              track.id
            }`
          );

          const output = new Transcriber(track);

          output.on("data", async (text, sentenceBreak) => {
            console.log("Transcriber Text:", text);
            sentenceBreak &&
              console.log("====================================");

            this.endlessStream.update(
              "<b>You Said: </b>" + text,
              sentenceBreak
            );
          });

          peer.addTrack(output.audioOutputTrack, this.senderStream);
        });
      }
    );

    await this.sendCardForSessionsCreation(ctx, sdp);

    return {
      statusCode: StatusCodes.OK,
      type: "application/vnd.microsoft.activity.message",
      value: JSON.stringify(sdp) as any,
    };
  }

  private async handleEcho(ctx: TurnContext, data: any) {
    this.adaptor = ctx.adapter;
    this.convRef = TurnContext.getConversationReference(
      ctx.activity
    ) as ConversationReference;

    const { localDescription: sdp } = await createPeerConnection(
      data.sdp,
      (event, _peer) => {
        console.log("Save client sender stream");
        this.senderStream = event.streams[0];
      },
      (peer) => {
        this.senderStream.getTracks().forEach((track) => {
          console.log(
            `add track to peer connection: ${track.kind.toUpperCase()} ${
              track.id
            }`
          );

          const output = new VolumnAdjust(track);
          peer.addTrack(output.audioOutputTrack, this.senderStream);
        });
      }
    );

    await this.sendCardForSessionsCreation(ctx, sdp);

    return {
      statusCode: StatusCodes.OK,
      type: "application/vnd.microsoft.activity.message",
      value: JSON.stringify(sdp) as any,
    };
  }

  private async handleOpenAI(ctx: TurnContext, data: any) {
    this.adaptor = ctx.adapter;
    this.convRef = TurnContext.getConversationReference(
      ctx.activity
    ) as ConversationReference;

    this.endlessStream = new EndlessTextStreaming(this.adaptor, this.convRef);

    const { localDescription: sdp } = await createPeerConnection(
      data.sdp,
      (event, _peer) => {
        console.log("Save client sender stream");
        this.senderStream = event.streams[0];
      },
      (peer) => {
        this.senderStream.getTracks().forEach(async (track) => {
          console.log(
            `add track to peer connection: ${track.kind.toUpperCase()} ${
              track.id
            }`
          );

          const process = new OpenAITrack(track);

          process.on("data", async (text, sentenceBreak) => {
            console.log("Transcriber Text:", text);
            sentenceBreak &&
              console.log("====================================");

            this.endlessStream.update(
              `<span style="color:#3d104b">${text}</span>`,
              sentenceBreak
            );
          });

          peer.addTrack(process.audioOutputTrack, this.senderStream);
          await process.init();
        });
      }
    );

    await this.sendCardForSessionsCreation(ctx, sdp);

    return {
      statusCode: StatusCodes.OK,
      type: "application/vnd.microsoft.activity.message",
      value: JSON.stringify(sdp) as any,
    };
  }

  private async handleSineWave(ctx: TurnContext, data: any) {
    this.adaptor = ctx.adapter;
    this.convRef = TurnContext.getConversationReference(
      ctx.activity
    ) as ConversationReference;

    const { localDescription: sdp } = await createPeerConnection(
      data.sdp,
      (event, _peer) => {
        console.log("Save client sender stream");
        this.senderStream = event.streams[0];
      },
      (peer) => {
        this.senderStream.getTracks().forEach((track) => {
          console.log(
            `add track to peer connection: ${track.kind.toUpperCase()} ${
              track.id
            }`
          );

          const output = new SineWaveTrack(track);
          peer.addTrack(output.audioOutputTrack, this.senderStream);
        });
      }
    );

    await this.sendCardForSessionsCreation(ctx, sdp);

    return {
      statusCode: StatusCodes.OK,
      type: "application/vnd.microsoft.activity.message",
      value: JSON.stringify(sdp) as any,
    };
  }

  private async sendCardForSessionsCreation(ctx: TurnContext, sdp: any) {
    const card = CardGenerator.adaptive.cardWithJSONPayload(
      {
        body: [
          {
            type: "TextBlock",
            text: "Session Created",
            weight: "bolder",
            size: "large",
          },
        ],
      },
      sdp
    );
    await ctx.sendActivity({
      type: ActivityTypes.Message,
      attachments: [card],
    });
  }
}
