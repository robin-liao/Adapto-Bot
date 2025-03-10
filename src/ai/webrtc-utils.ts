import { nonstandard as ns } from "wrtc";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import { PassThrough } from "stream";
import config from "../config";
import {
  MediaStreamTrack,
  RTCPeerConnection,
  RTCSessionDescription,
  MediaStream,
} from "wrtc";
import { SpeechClient } from "@google-cloud/speech";
import { customsearch_v1 } from "@googleapis/customsearch";
import { youtube_v3 } from "@googleapis/youtube";
import wav from "wav";
import { OpenAI, Tool } from "./openai-api";
import * as _ from "lodash";
import {
  ActivityTypes,
  BotAdapter,
  CardFactory,
  ConversationReference,
} from "botbuilder";
import { CardGenerator } from "../card-gen";
import { GoogleMapHelper, MapPlace, performContext, sleep } from "../utils";

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  // iceTransportPolicy: "relay",
};

export const createPeerConnection = async (
  sdp: RTCSessionDescriptionInit,
  beforeOffer?: (
    peer: RTCPeerConnection,
    track?: MediaStreamTrack
  ) => Promise<void>,
  onclose?: (peer: RTCPeerConnection, track?: MediaStreamTrack) => void
) => {
  let track: MediaStreamTrack;
  const peer = new RTCPeerConnection(rtcConfig);
  peer.onconnectionstatechange = () => {
    console.log("Connection State:", peer.connectionState);
    console.log("ICE Connection State:", peer.iceConnectionState);
    if (
      peer.iceConnectionState === "disconnected" ||
      peer.iceConnectionState === "failed"
    ) {
      console.warn("Client disconnected! Closing connection...");
      onclose?.(peer, track);
      peer.close();
    }
  };
  peer.ontrack = (event) => {
    track = event.track;
  };
  const desc = new RTCSessionDescription(sdp);
  await peer.setRemoteDescription(desc);
  beforeOffer && (await beforeOffer(peer, track));
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  return peer;
};

export class AudioProcessdTrack {
  protected sink: ns.RTCAudioSink;
  protected source = new ns.RTCAudioSource();
  public readonly audioOutputTrack = this.source.createTrack();

  constructor(protected incomingTrack: MediaStreamTrack) {
    this.sink = new ns.RTCAudioSink(incomingTrack);
    incomingTrack.addEventListener("ended", () => {
      console.log("Track ended.");
      this.sink.stop();
    });
  }
}

export class SineWaveTrack extends AudioProcessdTrack {
  constructor(track: MediaStreamTrack) {
    super(track);

    // Generate and inject raw audio samples
    setInterval(() => {
      const samples = new Int16Array(480); // 480 samples for 10ms of 48kHz audio
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(i / 100) * 32767 * 0.5; // Example: sine wave
      }
      this.source.onData({
        samples,
        sampleRate: 48000,
        bitsPerSample: 16,
        channelCount: 1,
        numberOfFrames: samples.length,
      });
    }, 10);
  }
}

export class VolumnAdjust extends AudioProcessdTrack {
  constructor(track: MediaStreamTrack) {
    super(track);

    // Process incoming audio & inject modified version
    this.sink.ondata = (data) => {
      const modifiedSamples = data.samples.map((v) => v * Math.random()); // Example: Reduce volume by 50%
      this.source.onData({
        ...data,
        samples: modifiedSamples,
      });
    };
  }
}

export class MP3Track extends AudioProcessdTrack {
  constructor(track: MediaStreamTrack) {
    super(track);
    console.log("ffmpegPath: ", ffmpegPath);
    ffmpeg.setFfmpegPath(ffmpegPath!);
  }

  public play(
    mp3File = config.dataPrefix + "/media/silent-scream.mp3",
    infinite = true
  ) {
    const readToStream = async (file: string) => {
      const fileBuffer = fs.readFileSync(file);
      const int16Array = new Int16Array(
        fileBuffer.buffer,
        fileBuffer.byteOffset,
        fileBuffer.length / 2
      );
      const bitsPerSample = 16;
      const numberOfFrames = 480;
      const channelCount = 1; // Set to 2 for stereo
      const frameSize = numberOfFrames * channelCount;
      const sampleRate = 48000;

      let offset = 0;
      const timer = setInterval(() => {
        if (offset + frameSize <= int16Array.length) {
          const samples = int16Array.slice(offset, offset + frameSize);
          offset += frameSize;

          this.source.onData({
            samples,
            sampleRate,
            bitsPerSample,
            channelCount,
            numberOfFrames,
          });
        } else {
          if (infinite) {
            offset = 0;
            console.log("Repeating audio...");
          } else {
            clearInterval(timer);
            console.log("Audio playback finished.");
          }
        }
      }, 10);
    };

    const playFile = () => {
      const ffmpegProcess = ffmpeg(mp3File)
        .inputFormat("mp3")
        .audioChannels(1)
        .audioFrequency(48000)
        .audioCodec("pcm_s16le")
        .outputFormat("s16le")
        .on("start", (commandLine) => {
          console.log("Spawned Ffmpeg with command: " + commandLine);
        })
        .on("error", (err) => {
          console.error("An error occurred: " + err.message);
        })
        .on("end", () => {
          console.log("Conversion finished successfully");
          readToStream("output.pcm");
        })
        .save("output.pcm");

      let pcmBuffer = Buffer.alloc(0);
      const bytesPerSample = 2; // 16 bits = 2 bytes
      const numberOfFrames = 480;
      const channelCount = 1; // Set to 2 for stereo
      const frameSize = numberOfFrames * channelCount * bytesPerSample;

      // ffmpegProcess.on("data", (chunk) => {
      //   pcmBuffer = Buffer.concat([pcmBuffer, chunk]);

      //   console.log("chunk.byteLength: ", chunk.byteLength);
      //   console.log("chunk.length: ", chunk.length);

      //   while (pcmBuffer.length >= frameSize) {
      //     const sampleChunk = pcmBuffer.slice(0, frameSize);
      //     pcmBuffer = pcmBuffer.slice(frameSize);

      //     const samples = new Int16Array(
      //       sampleChunk.buffer,
      //       sampleChunk.byteOffset,
      //       sampleChunk.length / bytesPerSample
      //     );

      //     console.log("samples.byteLength: ", samples.byteLength);
      //     console.log("samples.length: ", samples.length);

      //     this.source.onData({
      //       samples,
      //       sampleRate: 48000,
      //       bitsPerSample: 16,
      //       channelCount,
      //       numberOfFrames,
      //     });
      //   }
      // });
    };

    playFile();
  }
}

export type TranscriberEvent = {
  data: (text: string, sentenceBreak: boolean) => void;
  error: (error: Error) => void;
  end: () => void;
};

export class Transcriber extends AudioProcessdTrack {
  private speechClient: SpeechClient = new SpeechClient({
    apiKey: config.googleAPIKey,
  });

  private listeners: Partial<TranscriberEvent> = {};

  constructor(track: MediaStreamTrack) {
    super(track);
    this.transcribeAudioStream();
    // this.writeAudioToFile();
  }

  public on<K extends keyof TranscriberEvent>(
    event: K,
    listener: TranscriberEvent[K]
  ) {
    this.listeners[event] = listener;
    return this;
  }

  private transcribeAudioStream() {
    console.log("Initializing speech recognition...");

    let canWrite = true;

    const recognizeStream = this.speechClient
      .streamingRecognize({
        interimResults: true,
        config: {
          encoding: "LINEAR16",
          sampleRateHertz: 48000,
          languageCode: "en-US",
          // alternativeLanguageCodes: ["zh-TW"],
          enableAutomaticPunctuation: true,
        },
      })
      .on("data", (data) => {
        // console.log("Speech API Data:", JSON.stringify(data, null, 2));
        const transcript = data.results[0]?.alternatives[0]?.transcript;
        const isFinal = data.results[0]?.isFinal;
        // console.log("Transcript:", transcript, "isFinal:", isFinal);
        if (transcript) {
          // console.log("Recognized Text:", transcript);
          this.listeners.data?.(transcript, isFinal);
        }
      })
      .on("error", (error) => {
        // console.error("Speech API Error:", error);
        this.listeners.error?.(error);
      })
      // .on("end", () => console.log("Speech recognition ended."))
      .on("finish", () => {
        canWrite = false;
        // console.log("Speech recognition finished.");
        this.listeners.end?.();
      });

    // Capture PCM audio and send it to Google Cloud
    this.sink.ondata = (event) => {
      canWrite && recognizeStream.write(Buffer.from(event.samples.buffer));
    };

    console.log("Speech-to-Text initialized...");
  }

  private async writeAudioToFile() {
    const filename = "output.wav";
    let canWrite = true;

    const writer = new wav.FileWriter(filename, {
      channels: 1,
      sampleRate: 48000,
      bitDepth: 16,
    });

    this.sink.ondata = (event) => {
      if (canWrite) {
        writer.write(Buffer.from(event.samples.buffer));
      }
    };

    writer.on("finish", async () => {
      console.log("on Finished");
      canWrite = false;

      const audioFile = fs.readFileSync(filename);
      const apiRes = await this.speechClient.recognize({
        config: {
          encoding: "LINEAR16",
          sampleRateHertz: 48000,
          languageCode: "en-US",
        },
        audio: {
          content: audioFile.toString("base64"),
        },
      });
      console.log(JSON.stringify(apiRes, null, 2));
    });

    setTimeout(() => {
      console.log("Audio data written to output.wav");
      writer.end();
    }, 10000);
  }
}

export type ToolFunc = {
  tool: Tool;
  func: (args: any) => Promise<any>;
};

export class OpenAITrack extends AudioProcessdTrack {
  private peer = new RTCPeerConnection(rtcConfig);
  private listeners: Partial<TranscriberEvent> = {};
  private thruSource = new ns.RTCAudioSource();
  private thruTrack = this.thruSource.createTrack();
  private thruStream = new MediaStream([this.thruTrack]);
  private funcLookup: {
    [name: string]: ToolFunc;
  } = {};

  public constructor(incomingTrack: MediaStreamTrack) {
    super(incomingTrack);
  }

  public registerTool(toolFunc: ToolFunc) {
    this.funcLookup[toolFunc.tool.name] = toolFunc;
  }

  public on<K extends keyof TranscriberEvent>(
    event: K,
    listener: TranscriberEvent[K]
  ) {
    this.listeners[event] = listener;
    return this;
  }

  public getSineWaveTrack() {
    return this.thruTrack;
  }

  public async init() {
    // Set up data channel for sending and receiving events
    const dc = this.peer.createDataChannel("oai-events");
    let text = "";
    dc.addEventListener("message", async (e) => {
      const data = JSON.parse(e.data);
      // console.log("Realtime Event:", data);
      if (data.type === "response.audio_transcript.delta") {
        text += data.delta;
        this.listeners.data?.(text, false);
      } else if (data.type === "response.audio_transcript.done") {
        text = "";
        this.listeners.data?.(data.transcript, true);
      } else if (data.type === "response.function_call_arguments.done") {
        const fn = this.funcLookup[data.name]?.func;
        if (fn) {
          console.log(
            `Calling local function ${data.name} with ${data.arguments}`
          );
          const args = JSON.parse(data.arguments);
          const result = await fn(args);
          console.log("result", JSON.stringify(result, null, 2));
          // Let OpenAI know that the function has been called and share it's output
          const event = {
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id, // call_id from the function_call message
              output: JSON.stringify(result), // result of the function
            },
          };
          dc.send(JSON.stringify(event));
          // Have assistant respond after getting the results
          dc.send(JSON.stringify({ type: "response.create" }));
        }
      } else {
        // console.log("Unhandled message:", JSON.stringify(data, null, 2));
      }
    });

    dc.addEventListener("open", (ev) => {
      console.log("Opening Open AI data channel", ev);
      const tools = _.values(this.funcLookup).map((val) => val.tool);
      this.configureDataChannel(dc, tools);
    });

    // ontrack
    this.peer.ontrack = (event) => {
      const stream = event.streams[0];
      stream.getTracks().forEach((track) => {
        const sink = new ns.RTCAudioSink(track);
        sink.ondata = (data) => {
          this.source.onData(data);
        };
      });
    };

    this.sink.ondata = (data) => {
      this.thruSource.onData(data);
    };

    this.peer.addTrack(this.thruTrack, this.thruStream);

    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);

    const answer = await this.getOpenAIAnswerSDP(offer);
    console.log("OpenAI Answer SDP:", answer);
    await this.peer.setRemoteDescription(answer);
  }

  public close() {
    this.peer.close();
  }

  private async getOpenAIAnswerSDP(offer: RTCSessionDescriptionInit) {
    const oaiSession = await OpenAI.getRealtimeSession();
    const emphKey = oaiSession.client_secret.value;
    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const offerURL = baseUrl + "?model=" + model;
    const sdpResponse = await fetch(offerURL, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: "Bearer " + emphKey,
        "Content-Type": "application/sdp",
      },
    });
    const answer: RTCSessionDescriptionInit = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    return answer;
  }

  private configureDataChannel(ds: RTCDataChannel, tools: Tool[]) {
    console.log("Configuring data channel");
    const event = {
      type: "session.update",
      session: {
        instructions:
          "You are a Microsoft Teams agent to assist users for any asks particularly focused on Teams specific functionalities. When user asks for 'send me back the results' or 'send me back the results as an adaptive card', you should trigger 'sendAdaptiveCard' tool function and send the search results of raw JSON input from previous tool function output as the input to this tool function. To trigger 'sendAdaptiveCard' you should read the spec of the tool function and send the input as per the spec. Within 'sendAdaptiveCard' tool function it will convert the raw JSON input to an adaptive card and send it back to the user. Note that this tool  can't handle web search results, so for search results you should process by yourself and skip rendering it by using this tool function",
        modalities: ["text", "audio"],
        tools,
        tool_choice: "auto",
      },
    };
    ds.send(JSON.stringify(event));
  }
}

export const getGoogleSearchTool = (): ToolFunc => ({
  tool: {
    type: "function",
    name: "webSearch",
    description:
      "Performs an internet search using a search engine with the given query.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
      },
      required: ["query"],
    },
  },
  func: async (args: any) => {
    const { query } = args;
    const data = await searchWeb(query);
    return data.items ?? [];
  },
});

export const getYouTubeSearchTool = (): ToolFunc => ({
  tool: {
    type: "function",
    name: "youtubeSearch",
    description:
      "Performs video search for YouTube or any video topics with the given query.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
      },
      required: ["query"],
    },
  },
  func: async (args: any) => {
    const { query } = args;
    const data = await searchYouTube(query);
    return data.items ?? [];
  },
});

export const getSendAdaptiveCardTool = (
  adapter: BotAdapter,
  convRef: ConversationReference
): ToolFunc => ({
  tool: {
    type: "function",
    name: "sendAdaptiveCard",
    description:
      "Send any results as an adaptive card. There're 2 input arguments: (1) 'type':  must be 'web' or 'mapPlaces' to identify the result is from web search or from map place search. (2) 'results': raw JSON payload of previous search results.",
    parameters: {
      type: "object",
      properties: {
        type: { description: "type of the result", enum: ["web", "mapPlaces"] },
        results: {
          description: "raw JSON payload of previous search results",
          type: "object",
        },
      },
    },
  },
  func: async (args) => {
    const { results = [], type } = args;
    console.log("Sending adaptive card: ", args);
    let card = CardGenerator.adaptive.cardWithJSONPayload(args);

    if (type === "mapPlaces") {
      const mapHelper = new GoogleMapHelper();
      const maps = await Promise.all(
        (results as MapPlace[]).map((r) => {
          try {
            return mapHelper.getStaticMapOfMarker(r.lat, r.lng);
          } catch (error) {
            return undefined;
          }
        })
      );
      const pages = (results as MapPlace[]).map((r, id) => ({
        type: "CarouselPage",
        style: "emphasis",
        showBorder: true,
        roundedCorners: true,
        items: [
          ...(!!maps[id] && [
            {
              type: "Image",
              url: maps[id],
              style: "RoundedCorners",
              ...(r.url && {
                selectAction: {
                  type: "Action.OpenUrl",
                  url: r.url,
                },
              }),
            },
          ]),
          {
            type: "ColumnSet",
            columns: [
              {
                items: [
                  {
                    type: "Image",
                    url: r.photo_url,
                    style: "RoundedCorners",
                    size: "Large",
                  },
                ],
                type: "Column",
                width: "auto",
              },
              {
                type: "Column",
                items: [
                  {
                    type: "TextBlock",
                    text: r.name,
                    wrap: true,
                    size: "Large",
                    weight: "Bolder",
                  },
                  ...(r.rating && [
                    {
                      type: "Rating",
                      value: r.rating,
                      color: "Marigold",
                      count: r.total_reviews,
                      spacing: "ExtraSmall",
                    },
                  ]),
                  {
                    type: "TextBlock",
                    text: r.address,
                    wrap: true,
                    isSubtle: true,
                    maxLines: 0,
                    size: "Default",
                    spacing: "ExtraSmall",
                  },
                  {
                    type: "TextBlock",
                    text: r.phone,
                    wrap: true,
                    isSubtle: true,
                    spacing: "ExtraSmall",
                  },
                  {
                    type: "ActionSet",
                    actions: [
                      {
                        type: "Action.OpenUrl",
                        url: r.website,
                        title: "Website",
                      },
                    ],
                  },
                ],
                width: "stretch",
                verticalContentAlignment: "Top",
                ...(r.url && {
                  selectAction: {
                    type: "Action.OpenUrl",
                    url: r.url,
                  },
                }),
              },
            ],
            style: "accent",
            bleed: true,
          },
        ],
      }));
      card = CardFactory.adaptiveCard({
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "Carousel",
            pages,
          },
        ],
      });
      console.log("Sending adaptive card: ", JSON.stringify(card, null, 2));
    }
    await performContext(adapter, convRef, async (ctx2) => {
      await ctx2.sendActivity({
        type: ActivityTypes.Message,
        ...(results && {
          attachments: [card],
        }),
      });
    });
    return { success: true, message: "Sent as adaptive card" };
  },
});

async function searchWeb(query: string) {
  const customsearch = new customsearch_v1.Customsearch({
    auth: config.googleAPIKey,
  });

  try {
    console.log("Google Search: ", query);
    const res = await customsearch.cse.list({
      q: query,
      cx: "d5b981a49041a4bdd",
    });
    console.log("Google Search Items: ", res.data.items.length);
    return res.data;
  } catch (error) {
    console.error("Error fetching search results:", error);
    throw error;
  }
}

async function searchYouTube(query: string) {
  const youtube = new youtube_v3.Youtube({
    auth: config.googleAPIKey,
  });

  try {
    console.log("YouTube Search: ", query);
    const res = await youtube.search.list({
      q: query,
      part: ["snippet"],
      type: ["video"],
      maxResults: 5,
    });
    console.log("YouTube Search Items: ", res.data.items.length);
    return res.data;
  } catch (error) {
    console.error("Error fetching search results:", error);
    throw error;
  }
}
