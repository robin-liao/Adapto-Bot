declare module "wrtc" {
  export const RTCPeerConnection: typeof globalThis.RTCPeerConnection;
  export const RTCSessionDescription: typeof globalThis.RTCSessionDescription;
  export const RTCIceCandidate: typeof globalThis.RTCIceCandidate;
  export const MediaStream: typeof globalThis.MediaStream;
  export const MediaStreamTrack: typeof globalThis.MediaStreamTrack;
  namespace nonstandard {
    export interface RTCAudioData {
      samples: Int16Array;
      sampleRate: number;
      bitsPerSample: number = 16;
      channelCount: number = 1;
      numberOfFrames?: number;
    }

    export class RTCAudioSource {
      createTrack(): MediaStreamTrack;
      onData(data: RTCAudioData): void;
    }

    export class RTCAudioSink extends EventTarget {
      constructor(track: MediaStreamTrack);
      stop(): void;
      readonly stopped: boolean;
      ondata: (data: RTCAudioData) => void;
    }
  }
}
