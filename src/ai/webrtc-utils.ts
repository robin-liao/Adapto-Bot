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
import wav from "wav";
import { OpenAI } from "./openai-api";

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export const createPeerConnection = async (
  sdp: RTCSessionDescriptionInit,
  ontrack?: (e: RTCTrackEvent, peer: RTCPeerConnection) => void,
  beforeOffer?: (peer: RTCPeerConnection) => void
) => {
  const peer = new RTCPeerConnection(rtcConfig);
  peer.onconnectionstatechange = () => {
    console.log("Connection State:", peer.connectionState);
  };
  ontrack && (peer.ontrack = (event) => ontrack(event, peer));
  const desc = new RTCSessionDescription(sdp);
  await peer.setRemoteDescription(desc);
  beforeOffer && beforeOffer(peer);
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
    const passThrough = new PassThrough();

    const playFile = () => {
      ffmpeg(fs.createReadStream(mp3File))
        .toFormat("s16le")
        .audioChannels(1)
        .audioFrequency(48000)
        .audioCodec("pcm_s16le")
        .pipe(passThrough);
    };

    // Read PCM data and feed into WebRTC track
    passThrough.on("data", (chunk) => {
      const samples = new Int16Array(chunk.buffer);
      console.log(
        `[onData] len = ${samples.length} byteLen = ${chunk.byteLength}`
      );
      this.source.onData({
        samples,
        sampleRate: 48000,
        bitsPerSample: 16,
        channelCount: 1,
        numberOfFrames: samples.byteLength,
      });
    });

    // Restart when file ends
    passThrough.on("end", () => {
      console.log("MP3 playback finished.");
      if (infinite) {
        console.log("Restarting MP3 playback...");
        setTimeout(playFile, 500); // Short delay before restarting
      }
    });

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
    apiKey: "AIzaSyA_NzJzFkDsVbmHektNnHh_F3MYwzuHeCg",
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

export class OpenAITrack extends AudioProcessdTrack {
  private peer = new RTCPeerConnection(rtcConfig);
  private listeners: Partial<TranscriberEvent> = {};
  private thruSource = new ns.RTCAudioSource();
  private thruTrack = this.thruSource.createTrack();
  private thruStream = new MediaStream([this.thruTrack]);

  public constructor(incomingTrack: MediaStreamTrack) {
    super(incomingTrack);
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
    dc.addEventListener("message", (e) => {
      const data = JSON.parse(e.data);
      // console.log("Realtime Event:", data);
      if (data.type === "response.audio_transcript.delta") {
        text += data.delta;
        this.listeners.data?.(text, false);
      } else if (data.type === "response.audio_transcript.done") {
        text = "";
        this.listeners.data?.(data.transcript, true);
      }
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
}
