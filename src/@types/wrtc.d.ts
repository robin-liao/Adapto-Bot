declare module "wrtc" {
  export const RTCPeerConnection: typeof globalThis.RTCPeerConnection;
  export const RTCSessionDescription: typeof globalThis.RTCSessionDescription;
  export const RTCIceCandidate: typeof globalThis.RTCIceCandidate;
  export const MediaStream: typeof globalThis.MediaStream;
  export const MediaStreamTrack: typeof globalThis.MediaStreamTrack;
}
