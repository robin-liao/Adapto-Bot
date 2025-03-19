import { Router } from "express";
import * as fs from "fs";
import format from "string-template";
import { MediaStream } from "wrtc";
import {
  MP3Track,
  OpenAITrack,
  SineWaveTrack,
  Transcriber,
  VolumnAdjust,
  createPeerConnection,
  getGoogleSearchTool,
  getYouTubeSearchTool,
} from "./webrtc-utils";
import { OpenAI } from "./openai-api";
import config from "../config";

class AIRouter {
  private router = Router();
  private senderStream: MediaStream = new MediaStream();
  private mp3Track: MP3Track;

  constructor() {
    this.bindRoutes();
  }

  public getRouter() {
    return this.router;
  }

  private bindRoutes() {
    this.router.get("/client/:page", (req, res) => {
      const html = fs
        .readFileSync(__dirname + "/" + req.params.page)
        .toString();
      const body = format(html, {});
      res.set("Content-Type", "text/html");
      res.send(body);
      res.end();
    });

    // An endpoint which would work with the client code above - it returns
    // the contents of a REST API request to this protected endpoint
    this.router.get("/session", async (req, res) => {
      const r = await OpenAI.getRealtimeSession();
      res.send(r);
    });

    this.router.post("/connect", async (req, res) => {
      const { localDescription: sdp } = await createPeerConnection(
        req.body,
        async (peer, track) => {
          console.log(
            `add track to peer connection: ${track.kind.toUpperCase()} ${
              track.id
            }`
          );

          // const process = new VolumnAdjust(track);
          const process = new MP3Track(
            track,
            config.dataPrefix + "/media/silent-scream.mp3",
            true
          );
          // const process = new OpenAITrack(track);
          // process.registerTool(getGoogleSearchTool());
          // process.registerTool(getYouTubeSearchTool());

          peer.addTrack(process.audioOutputTrack, this.senderStream);
          process.play();
          this.mp3Track = process;
          // await process.init();
        },
        (peer, track) => {
          if (track) {
            this.senderStream.removeTrack(track);
            console.log("Remove track from peer connection");
          }
          this.mp3Track?.stop();
        }
      );
      res.json(sdp);
    });

    this.router.post("/playerAction", async (req, res) => {
      const { action } = req.body;
      switch (action) {
        case "play":
          this.mp3Track?.play();
          break;
        case "pause":
          this.mp3Track?.pause();
          break;
        case "stop":
          this.mp3Track?.stop();
          break;
      }
      res.json({ status: "ok" });
    });

    this.router.post("/broadcast", async (req, res) => {
      const { localDescription: sdp } = await createPeerConnection(req.body);
      res.json(sdp);
    });

    this.router.post("/consume", async (req, res) => {
      const { localDescription: sdp } = await createPeerConnection(
        req.body,
        async (peer, track) => {
          console.log(
            `add track to peer connection: ${track.kind.toUpperCase()} ${
              track.id
            }`
          );
          peer.addTrack(track, this.senderStream);
        },
        (peer, track) => {
          if (track) {
            this.senderStream.removeTrack(track);
            console.log("Remove track from peer connection");
          }
        }
      );
      res.json(sdp);
    });
  }
}

export const aiRouter = new AIRouter().getRouter();
