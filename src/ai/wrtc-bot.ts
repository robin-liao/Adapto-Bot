import {
  ActivityTypes,
  BotAdapter,
  CardFactory,
  ConversationReference,
  StatusCodes,
  TurnContext,
} from "botbuilder";
import {
  IScenarioBuilder,
  ITeamsScenario,
  WebScoketCallback,
} from "../teams-bot";
import {
  createPeerConnection,
  getGoogleSearchTool,
  getSendAdaptiveCardTool,
  getYouTubeSearchTool,
  MP3Track,
  OpenAITrack,
  SineWaveTrack,
  ToolFunc,
  Transcriber,
  VolumnAdjust,
} from "./webrtc-utils";
import { MediaStream } from "wrtc";
import {
  EndlessTextStreaming,
  GoogleMapHelper,
  MapPlace,
  performContext,
  teamsSendProactiveOneOnOneMessage,
  TextStreaming,
} from "../utils";
import config from "../config";
import { CardGenerator } from "../card-gen";
import { youtube_v3 } from "@googleapis/youtube";
import { Router } from "express";
import * as fs from "fs";
import format from "string-template";

type WRTCBotWSEvent = {
  message: string;
  places?: MapPlace[];
  placeQuery?: string;
};

export class WebRTCBot implements ITeamsScenario {
  private router = Router();
  private senderStream: MediaStream = new MediaStream();
  private adaptor: BotAdapter;
  private convRef: ConversationReference;
  private endlessStream: EndlessTextStreaming;
  private wsSend: (convId: string, data: WRTCBotWSEvent) => void;
  private readonly tabEntityId = "wrtcCollabStage";
  private oaiTrack: OpenAITrack;

  constructor() {
    this.setupRouter();
  }

  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerACv2Handler("sineWave", (ctx, data) =>
      this.handleSineWave(ctx, data)
    );
    teamsBot.registerACv2Handler("echo", (ctx, data) =>
      this.handleEcho(ctx, data)
    );
    teamsBot.registerACv2Handler("radio", (ctx, data) =>
      this.handleRadio(ctx, data)
    );
    teamsBot.registerACv2Handler("transcribe", (ctx, data) =>
      this.handleTranscribe(ctx, data)
    );
    teamsBot.registerACv2Handler("openai", (ctx, data) =>
      this.handleOpenAI(ctx, data)
    );
    teamsBot.registerTabRouter(this.tabEntityId, this.router);

    teamsBot.registerWebSocketHandler<WRTCBotWSEvent>(
      this.tabEntityId,
      this.setupWebSocket()
    );

    teamsBot.registerTextCommand(/^oai/i, async (ctx) => {
      if (this.oaiTrack) {
        const text = ctx.activity.text.replace("oai", "").trim();
        this.oaiTrack.sendMessage(text);
      }
    });
  }
  private async handleSineWave(ctx: TurnContext, data: any) {
    this.adaptor = ctx.adapter;
    this.convRef = TurnContext.getConversationReference(
      ctx.activity
    ) as ConversationReference;

    const { localDescription: sdp } = await createPeerConnection(
      data.sdp,
      async (peer, track) => {
        console.log(
          `add track to peer connection: ${track.kind.toUpperCase()} ${
            track.id
          }`
        );

        const output = new SineWaveTrack(track);
        peer.addTrack(output.audioOutputTrack, this.senderStream);
      },
      (_peer, track) => {
        if (track) {
          this.senderStream.removeTrack(track);
          console.log("Remove track from peer connection");
        }
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
      async (peer, track) => {
        console.log(
          `add track to peer connection: ${track.kind.toUpperCase()} ${
            track.id
          }`
        );

        const output = new VolumnAdjust(track);
        peer.addTrack(output.audioOutputTrack, this.senderStream);
      },
      (_peer, track) => {
        if (track) {
          this.senderStream.removeTrack(track);
          console.log("Remove track from peer connection");
        }
      }
    );

    await this.sendCardForSessionsCreation(ctx, sdp);

    return {
      statusCode: StatusCodes.OK,
      type: "application/vnd.microsoft.activity.message",
      value: JSON.stringify(sdp) as any,
    };
  }

  private async handleRadio(ctx: TurnContext, data: any) {
    this.adaptor = ctx.adapter;
    this.convRef = TurnContext.getConversationReference(
      ctx.activity
    ) as ConversationReference;

    let mp3Track: MP3Track;

    const { localDescription: sdp } = await createPeerConnection(
      data.sdp,
      async (peer, track) => {
        console.log(
          `add track to peer connection: ${track.kind.toUpperCase()} ${
            track.id
          }`
        );

        mp3Track = new MP3Track(
          track,
          config.dataPrefix + "/media/silent-scream.mp3",
          true
        );
        peer.addTrack(mp3Track.audioOutputTrack, this.senderStream);
        mp3Track.play();
      },
      (_peer, track) => {
        if (track) {
          this.senderStream.removeTrack(track);
          console.log("Remove track from peer connection");
        }
        mp3Track?.stop();
      }
    );

    await this.sendCardForSessionsCreation(ctx, sdp);

    return {
      statusCode: StatusCodes.OK,
      type: "application/vnd.microsoft.activity.message",
      value: JSON.stringify(sdp) as any,
    };
  }

  private async handleTranscribe(ctx: TurnContext, data: any) {
    this.adaptor = ctx.adapter;
    this.convRef = TurnContext.getConversationReference(
      ctx.activity
    ) as ConversationReference;

    this.endlessStream = new EndlessTextStreaming(this.adaptor, this.convRef);

    const { localDescription: sdp } = await createPeerConnection(
      data.sdp,
      async (peer, track) => {
        console.log(
          `add track to peer connection: ${track.kind.toUpperCase()} ${
            track.id
          }`
        );

        const output = new Transcriber(track);

        output.on("data", async (text, sentenceBreak) => {
          console.log("Transcriber Text:", text);
          sentenceBreak && console.log("====================================");

          this.endlessStream.update("<b>You Said: </b>" + text, sentenceBreak);
          this.wsSend?.(this.convRef.conversation.id, { message: text });
        });

        peer.addTrack(output.audioOutputTrack, this.senderStream);
      },
      (_peer, track) => {
        if (track) {
          this.senderStream.removeTrack(track);
          console.log("Remove track from peer connection");
        }
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
    let process: OpenAITrack;

    const { localDescription: sdp } = await createPeerConnection(
      data.sdp,
      async (peer, track) => {
        console.log(
          `add track to peer connection: ${track.kind.toUpperCase()} ${
            track.id
          }`
        );

        process = new OpenAITrack(track);
        process.registerTool(getGoogleSearchTool());
        process.registerTool(this.getYouTubeSearchWithAdaptiveCardsTool());
        process.registerTool(this.getMapSearchTool());
        process.registerTool(
          getSendAdaptiveCardTool(this.adaptor, this.convRef)
        );

        process.on("data", async (text, sentenceBreak) => {
          console.log("Transcriber Text:", text);
          sentenceBreak && console.log("====================================");

          this.endlessStream.update(`<b>Open AI: </b>${text}`, sentenceBreak);
          this.wsSend?.(this.convRef.conversation.id, { message: text });
        });

        peer.addTrack(process.audioOutputTrack, this.senderStream);
        await process.init();
        this.oaiTrack = process;
      },
      (_peer, track) => {
        process?.close();
        if (track) {
          this.senderStream.removeTrack(track);
          console.log("Remove track from peer connection");
        }
      }
    );

    await this.sendCardForSessionsCreation(ctx, sdp);

    return {
      statusCode: StatusCodes.OK,
      type: "application/vnd.microsoft.activity.message",
      value: JSON.stringify(sdp) as any,
    };
  }

  private setupRouter() {
    this.router.get("/client/:page", (req, res) => {
      const html = fs
        .readFileSync(__dirname + "/" + req.params.page)
        .toString();
      const body = format(html, {
        TXT_GOOGLE_API_KEY: config.googleAPIKey,
        TXT_HOST: config.host.replace("https://", ""),
      });
      res.set("Content-Type", "text/html");
      res.send(body);
      res.end();
    });

    this.router.get("/search-map", async (req, res) => {
      const {
        query,
        location = "47.6062,-122.3321",
        radius = 10000,
      } = req.query; // Default: Seattle
      const googleMap = new GoogleMapHelper();
      try {
        const results = await googleMap.searchPlace(
          query as string,
          location as string,
          radius as number
        );
        res.send(results);
      } catch (error) {
        res.send([]);
      }
    });
  }

  private getYouTubeSearchWithAdaptiveCardsTool(): ToolFunc {
    const { tool, func } = getYouTubeSearchTool();
    return {
      tool,
      func: async (args) => {
        const ytResults: youtube_v3.Schema$SearchResult[] = await func(args);
        const cards = ytResults.map((result) => {
          const id = result.id.videoId;
          const title = result.snippet.title;
          const channel = result.snippet.channelTitle;
          const description = result.snippet.description;
          const url = `https://www.youtube.com/watch?v=${id}`;
          const poster = result.snippet.thumbnails.high.url;
          return CardGenerator.adaptive.youTubeCard(
            url,
            title,
            channel,
            description,
            poster
          );
        });
        await performContext(this.adaptor, this.convRef, async (ctx2) => {
          await ctx2.sendActivity({
            type: ActivityTypes.Message,
            attachments: cards,
            ...(cards.length > 1 && { attachmentLayout: "carousel" }),
          });
        });
        return ytResults;
      },
    };
  }

  private getMapSearchTool(): ToolFunc {
    return {
      tool: {
        type: "function",
        name: "searchMap",
        description:
          "Search for places on Google Map. To search for multiple places, use comma separated values and don't need to append city at the end. Always use English to for query text",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
        },
      },
      func: async (args) => {
        const { query } = args;
        const googleMap = new GoogleMapHelper();
        const results = await googleMap.searchPlace(query);
        this.wsSend?.(this.convRef.conversation.id, {
          message: `Found ${results.length} places`,
          places: results,
          placeQuery: query,
        });
        return results;
      },
    };
  }

  private setupWebSocket(): WebScoketCallback<WRTCBotWSEvent> {
    const serviceUrl =
      "https://smba.trafficmanager.net/amer/72f988bf-86f1-41af-91ab-2d7cd011db47/";

    const onMessage = (convId, data: WRTCBotWSEvent) => {
      this.wsSend?.(convId, {
        message: `Echo: ${data.message}`,
      });
      teamsSendProactiveOneOnOneMessage(convId, serviceUrl, {
        text: data.message,
      });
    };

    return {
      setSend: (fn) => {
        this.wsSend = fn;
      },
      onMessage: (convId, data) => {
        onMessage(convId, data);
      },
    };
  }

  private async sendCardForSessionsCreation(ctx: TurnContext, sdp: any) {
    const card = CardGenerator.adaptive.cardWithJSONPayload(sdp, {
      body: [
        {
          type: "TextBlock",
          text: "Session Created",
          weight: "bolder",
          size: "large",
        },
      ],
    });
    await ctx.sendActivity({
      type: ActivityTypes.Message,
      attachments: [card],
    });
  }
}
