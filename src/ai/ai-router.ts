import bodyParser from "body-parser";
import { Router } from "express";
import * as fs from "fs";
import format from "string-template";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  MediaStream,
  MediaStreamTrack,
} from "wrtc";

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

class AIRouter {
  private router = Router();

  constructor() {
    this.bindRoutes();
  }

  public getRouter() {
    return this.router;
  }

  private bindRoutes() {
    this.router.get("/client", (req, res) => {
      const html = fs.readFileSync(__dirname + "/ai-client.html").toString();

      const body = format(html, {});
      res.set("Content-Type", "text/html");
      res.send(body);
      res.end();
    });

    // An endpoint which would work with the client code above - it returns
    // the contents of a REST API request to this protected endpoint
    this.router.get("/session", async (req, res) => {
      const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "verse",
        }),
      });
      const data = await r.json();

      // Send back the JSON we received from the OpenAI REST API
      res.send(data);
    });

    this.router.post("/connect", async (req, res) => {
      console.log(
        "Received SDP offer from client: " + JSON.stringify(req.body, null, 2)
      );
      const sdp = await this.createPeerConnection(req.body);
      res.json(sdp);
    });
  }

  private async createPeerConnection(sdp: RTCSessionDescriptionInit) {
    const peerConnection = new RTCPeerConnection(rtcConfig);
    const peerStream: MediaStream = new MediaStream();

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("ICE Candidate from Server:", event.candidate);
      }
    };

    // Capture incoming audio
    peerConnection.ontrack = (event) => {
      console.log("Receiving audio stream from client");

      // get client's audio tracks
      event.streams[0].getAudioTracks().forEach((track) => {
        peerStream.addTrack(track); // Store client's audio
      });

      // Simulated processing: modify audio and send back
      setTimeout(() => {
        console.log("Processing and returning modified audio...");

        peerStream.getTracks().forEach((track) => {
          console.log("add track to peer connection: " + track.kind);
          const modifiedAudioTrack = this.transformAudioTrack(track);
          peerConnection.addTrack(track);
        });
      }, 3000);
    };

    // Capture connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log("Connection State:", peerConnection.connectionState);
    };

    // Set remote SDP description
    await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

    // Create and send SDP answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    return peerConnection.localDescription;
  }

  private transformAudioTrack(inputTrack: MediaStreamTrack): MediaStreamTrack {
    return inputTrack;
    // const audioContext = new AudioContext();

    // // Create a MediaStreamAudioSourceNode from the input track
    // const inputStream = new MediaStream([inputTrack]);
    // const source = audioContext.createMediaStreamSource(inputStream);

    // // Create an audio processor (e.g., gain node for volume control)
    // const gainNode = audioContext.createGain();
    // gainNode.gain.value = 2.0; // Increase volume

    // // Connect nodes
    // source.connect(gainNode);

    // // Destination for the processed audio
    // const destination = audioContext.createMediaStreamDestination();
    // gainNode.connect(destination);

    // // Extract the new track
    // const [outputTrack] = destination.stream.getAudioTracks();

    // return outputTrack;
  }
}

export const aiRouter = new AIRouter().getRouter();
