import { Router } from "express";
import * as fs from "fs";
import format from "string-template";
import { MediaStream } from "wrtc";
import {
  OpenAITrack,
  SineWaveTrack,
  Transcriber,
  createPeerConnection,
} from "./webrtc-utils";
import { OpenAI } from "./openai-api";

class AIRouter {
  private router = Router();
  private senderStream: MediaStream = new MediaStream();

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
            peer.addTrack(process.audioOutputTrack, this.senderStream);
            await process.init();
          });
        }
      );
      res.json(sdp);
    });

    this.router.post("/broadcast", async (req, res) => {
      const { localDescription: sdp } = await createPeerConnection(
        req.body,
        (event, _peer) => {
          console.log("Save client sender stream");
          this.senderStream = event.streams[0];
        }
      );
      res.json(sdp);
    });

    this.router.post("/consume", async (req, res) => {
      const { localDescription: sdp } = await createPeerConnection(
        req.body,
        undefined,
        (peer) => {
          this.senderStream.getTracks().forEach((track) => {
            console.log(
              `add track to peer connection: ${track.kind.toUpperCase()} ${
                track.id
              }`
            );
            peer.addTrack(track, this.senderStream);
          });
        }
      );
      res.json(sdp);
    });
  }
}

export const aiRouter = new AIRouter().getRouter();
