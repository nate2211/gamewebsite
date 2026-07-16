export const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function createPeerConnection() {
  const disablePublicStun = localStorage.getItem("voxel:multiplayerLanOnly") === "true";
  return new RTCPeerConnection({
    iceServers: disablePublicStun ? [] : DEFAULT_ICE_SERVERS,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
  });
}

export function waitForIceGatheringComplete(peer, timeoutMs = 9000) {
  if (peer.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      peer.removeEventListener("icegatheringstatechange", onChange);
      window.clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (peer.iceGatheringState === "complete") finish();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    peer.addEventListener("icegatheringstatechange", onChange);
  });
}

export function safeSend(channel, value) {
  if (!channel || channel.readyState !== "open") return false;
  try {
    channel.send(typeof value === "string" ? value : JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}
