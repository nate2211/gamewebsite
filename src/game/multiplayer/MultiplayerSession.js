import { getBrowserPlayerProfile } from "./browserIdentity";
import { buildFrontendSignalUrl, decodeSignalPayload, encodeSignalPayload } from "./inviteCodec";
import { MESSAGE, makeEnvelope, parseEnvelope, selectPlayerSaveState, selectSharedWorldState } from "./protocol";
import { createPeerConnection, safeSend, waitForIceGatheringComplete } from "./rtcUtils";
import { applyMultiplayerWorldState, upsertMultiplayerPlayer } from "../../features/world/worldSlice";
import { worldRuntime } from "../core/worldRuntime";

const ANSWER_CHANNEL = "voxel-frontier-multiplayer-answer-v3";
const ANSWER_STORAGE_KEY = "voxel-frontier:pending-answer-v3";
const MAX_CONNECTIONS = 8;

function connectionSnapshot(connection) {
  return {
    id: connection.id,
    state: connection.pc?.connectionState || "new",
    playerId: connection.profile?.id || null,
    playerName: connection.profile?.name || "Connecting player",
    joinedAt: connection.joinedAt || null,
  };
}

function clone(value, fallback = null) {
  try { return JSON.parse(JSON.stringify(value)); } catch (_) { return fallback; }
}

class MultiplayerSession {
  constructor() {
    this.role = "offline";
    this.status = "offline";
    this.roomId = null;
    this.worldId = null;
    this.worldName = "";
    this.worldSeed = "";
    this.profile = getBrowserPlayerProfile();
    this.connections = new Map();
    this.guestConnection = null;
    this.listeners = new Set();
    this.eventListeners = new Map();
    this.store = null;
    this.playerRef = null;
    this.unsubscribeStore = null;
    this.fastTimer = null;
    this.sharedTimer = null;
    this.lastSharedRevision = -1;
    this.remotePlayers = new Map();
    this.chat = [];
    this.pendingBootstrap = null;
    this.localAnimation = "idle";
    this.localAnimationUntil = 0;
    this.answerBridge = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(ANSWER_CHANNEL) : null;
    if (this.answerBridge) {
      this.answerBridge.onmessage = (event) => {
        if (event.data?.type === "answer-token" && event.data.token) {
          this.acceptAnswerToken(event.data.token).catch((error) => this.setStatus(`answer-error:${error.message}`));
        }
      };
    }
    this.onAnswerStorage = (event) => {
      if (event.key !== ANSWER_STORAGE_KEY || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue);
        if (payload?.token) this.acceptAnswerToken(payload.token).catch((error) => this.setStatus(`answer-error:${error.message}`));
      } catch (_) {}
    };
    window.addEventListener("storage", this.onAnswerStorage);
    this.snapshot = this.buildSnapshot();
  }

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  on(eventName, listener) {
    if (!this.eventListeners.has(eventName)) this.eventListeners.set(eventName, new Set());
    this.eventListeners.get(eventName).add(listener);
    return () => this.eventListeners.get(eventName)?.delete(listener);
  }

  emitEvent(eventName, payload) {
    this.eventListeners.get(eventName)?.forEach((listener) => listener(payload));
  }

  emit() {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }

  setStatus(status) {
    this.status = status;
    this.emit();
  }

  buildSnapshot() {
    return Object.freeze({
      role: this.role,
      status: this.status,
      roomId: this.roomId,
      worldId: this.worldId,
      worldName: this.worldName,
      player: this.profile,
      connections: this.role === "host"
        ? Array.from(this.connections.values()).map(connectionSnapshot)
        : this.guestConnection ? [connectionSnapshot(this.guestConnection)] : [],
      remotePlayers: Array.from(this.remotePlayers.values()),
      chat: [...this.chat],
    });
  }

  getSnapshot = () => this.snapshot;

  getServerSnapshot = () => this.snapshot;

  bindGame({ store, playerRef, worldId }) {
    this.store = store;
    this.playerRef = playerRef;
    if (worldId) this.worldId = worldId;
    this.stopSyncLoops();
    const cleanup = () => {
      if (this.store === store) {
        this.stopSyncLoops();
        this.store = null;
        this.playerRef = null;
      }
    };
    if (this.role === "offline") return cleanup;

    this.fastTimer = window.setInterval(() => this.sendLocalPlayerState(), 90);
    this.sharedTimer = window.setInterval(() => this.syncSharedWorld(), 350);
    this.unsubscribeStore = store.subscribe(() => {
      const state = store.getState().world;
      if (this.role === "host" && state.revision !== this.lastSharedRevision) this.syncSharedWorld();
      if (this.role === "guest" && state.revision !== this.lastSharedRevision) this.sendGuestWorldProposal();
    });
    this.emit();
    return cleanup;
  }

  setLocalAnimation(animation, durationMs = 420) {
    this.localAnimation = String(animation || "idle");
    this.localAnimationUntil = Date.now() + Math.max(80, Number(durationMs) || 420);
  }

  stopSyncLoops() {
    if (this.fastTimer) window.clearInterval(this.fastTimer);
    if (this.sharedTimer) window.clearInterval(this.sharedTimer);
    this.fastTimer = null;
    this.sharedTimer = null;
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
  }

  async createHostInvite({ worldId, worldName, worldSeed }) {
    if (!window.RTCPeerConnection) throw new Error("This browser does not support WebRTC data channels.");
    if (this.role !== "host" || this.worldId !== worldId) {
      this.close();
      this.role = "host";
      this.roomId = crypto.randomUUID();
      this.worldId = worldId;
      this.worldName = worldName || "Shared world";
      this.worldSeed = worldSeed || "";
    }
    if (this.connections.size >= MAX_CONNECTIONS - 1) throw new Error(`This browser host is limited to ${MAX_CONNECTIONS} total players.`);

    const connectionId = crypto.randomUUID();
    const pc = createPeerConnection();
    const reliable = pc.createDataChannel("vf-world-events", { ordered: true });
    const realtime = pc.createDataChannel("vf-player-motion", { ordered: false, maxRetransmits: 0 });
    const connection = { id: connectionId, pc, reliable, realtime, profile: null, joinedAt: null };
    this.connections.set(connectionId, connection);
    this.wireConnection(connection, true);

    await pc.setLocalDescription(await pc.createOffer());
    await waitForIceGatheringComplete(pc);
    const payload = {
      kind: "offer",
      version: 3,
      roomId: this.roomId,
      connectionId,
      worldId,
      worldName: this.worldName,
      worldSeed: this.worldSeed,
      host: this.profile,
      description: pc.localDescription,
      createdAt: Date.now(),
    };
    this.setStatus("hosting:invite-ready");
    if (this.store) this.bindGame({ store: this.store, playerRef: this.playerRef, worldId: this.worldId });
    return {
      token: encodeSignalPayload(payload),
      url: buildFrontendSignalUrl("/join", "invite", encodeSignalPayload(payload)),
      connectionId,
    };
  }

  async joinInviteToken(token) {
    if (!window.RTCPeerConnection) throw new Error("This browser does not support WebRTC data channels.");
    const offer = decodeSignalPayload(token);
    if (offer.kind !== "offer" || !offer.description || !offer.roomId) throw new Error("This is not a valid world invitation.");
    this.close();
    this.role = "guest";
    this.status = "joining:creating-answer";
    this.roomId = offer.roomId;
    this.worldId = `remote-${offer.roomId}`;
    this.worldName = offer.worldName || "Shared world";
    this.worldSeed = offer.worldSeed || "";

    const pc = createPeerConnection();
    const connection = { id: offer.connectionId, pc, reliable: null, realtime: null, profile: offer.host, joinedAt: null };
    this.guestConnection = connection;
    pc.ondatachannel = (event) => {
      if (event.channel.label === "vf-player-motion") connection.realtime = event.channel;
      else connection.reliable = event.channel;
      this.wireDataChannel(connection, event.channel, false);
    };
    this.wirePeerState(connection, false);
    await pc.setRemoteDescription(offer.description);
    await pc.setLocalDescription(await pc.createAnswer());
    await waitForIceGatheringComplete(pc);
    const answer = {
      kind: "answer",
      version: 3,
      roomId: offer.roomId,
      connectionId: offer.connectionId,
      guest: this.profile,
      description: pc.localDescription,
      createdAt: Date.now(),
    };
    this.setStatus("joining:return-link-ready");
    const answerToken = encodeSignalPayload(answer);
    return {
      token: answerToken,
      url: buildFrontendSignalUrl("/multiplayer/answer", "answer", answerToken),
      offer,
    };
  }

  async acceptAnswerToken(token) {
    const answer = decodeSignalPayload(token);
    if (answer.kind !== "answer" || answer.roomId !== this.roomId) throw new Error("The response belongs to a different world lobby.");
    const connection = this.connections.get(answer.connectionId);
    if (!connection) throw new Error("The matching invite slot is no longer open. Create a fresh invite link.");
    connection.profile = answer.guest || null;
    await connection.pc.setRemoteDescription(answer.description);
    this.setStatus("hosting:connecting");
    this.emit();
  }

  broadcastAnswerToken(token) {
    let delivered = false;
    const payload = { type: "answer-token", token, sentAt: Date.now() };
    if (this.answerBridge) {
      this.answerBridge.postMessage(payload);
      delivered = true;
    }
    try {
      localStorage.setItem(ANSWER_STORAGE_KEY, JSON.stringify(payload));
      localStorage.removeItem(ANSWER_STORAGE_KEY);
      delivered = true;
    } catch (_) {}
    return delivered;
  }

  wireConnection(connection, isHost) {
    this.wirePeerState(connection, isHost);
    this.wireDataChannel(connection, connection.reliable, isHost);
    this.wireDataChannel(connection, connection.realtime, isHost);
  }

  wirePeerState(connection, isHost) {
    connection.pc.onconnectionstatechange = () => {
      const state = connection.pc.connectionState;
      if (state === "connected") {
        connection.joinedAt = connection.joinedAt || Date.now();
        this.setStatus(isHost ? "hosting:connected" : "joining:connected");
      } else if (["failed", "closed", "disconnected"].includes(state)) {
        if (connection.profile?.id) this.remotePlayers.delete(connection.profile.id);
        this.setStatus(`${isHost ? "hosting" : "joining"}:${state}`);
      } else this.emit();
    };
  }

  wireDataChannel(connection, channel, isHost) {
    if (!channel) return;
    channel.binaryType = "arraybuffer";
    channel.onopen = () => {
      if (!isHost && channel.label === "vf-world-events") {
        safeSend(channel, makeEnvelope(MESSAGE.HELLO, { profile: this.profile }));
      }
      this.emit();
    };
    channel.onmessage = (event) => this.handleMessage(connection, event.data, isHost, channel.label);
    channel.onclose = () => this.emit();
    channel.onerror = () => this.emit();
  }

  handleMessage(connection, raw, isHost, channelLabel) {
    const message = parseEnvelope(raw);
    if (!message) return;
    const payload = message.payload || {};

    if (message.type === MESSAGE.HELLO && isHost) {
      connection.profile = payload.profile || connection.profile;
      connection.joinedAt = Date.now();
      if (connection.profile?.id) {
        const restored = this.store?.getState().world.multiplayerPlayers?.[connection.profile.id];
        const spawn = this.store?.getState().world.spawn || { x: 0, y: 12, z: 0 };
        const playerState = restored || {
          playerId: connection.profile.id,
          displayName: connection.profile.name,
          palette: connection.profile.palette,
          player: clone(spawn, { x: 0, y: 12, z: 0 }),
          health: 20,
          hunger: 20,
          inventory: {},
          hotbar: [],
          selectedIndex: 0,
          updatedAt: Date.now(),
        };
        this.store?.dispatch(upsertMultiplayerPlayer(playerState));
        this.sendBootstrap(connection, playerState);
      }
      this.emit();
      return;
    }

    if (message.type === MESSAGE.WORLD_BOOTSTRAP && !isHost) {
      this.pendingBootstrap = payload;
      this.emitEvent("bootstrap", payload);
      return;
    }

    if (message.type === MESSAGE.PLAYER_STATE) {
      const playerState = payload.playerState;
      if (!playerState?.playerId) return;
      this.remotePlayers.set(playerState.playerId, playerState);
      if (isHost) {
        this.store?.dispatch(upsertMultiplayerPlayer(playerState));
        this.broadcastDirectory();
      }
      this.emit();
      return;
    }

    if (message.type === MESSAGE.PLAYER_DIRECTORY) {
      (payload.players || []).forEach((player) => {
        if (player?.playerId && player.playerId !== this.profile.id) this.remotePlayers.set(player.playerId, player);
      });
      this.emit();
      return;
    }

    if (message.type === MESSAGE.SHARED_WORLD_STATE) {
      const shared = payload.shared;
      if (!shared || !this.store) return;
      this.lastSharedRevision = Number(shared.revision) || this.lastSharedRevision;
      this.store.dispatch(applyMultiplayerWorldState(shared));
      worldRuntime.applyBlockEdits?.(shared.blockEdits || {});
      if (isHost) this.broadcastSharedWorld();
      this.emitEvent("world-state", shared);
      return;
    }

    if (message.type === MESSAGE.CHAT) {
      const entry = { ...payload, id: payload.id || crypto.randomUUID(), receivedAt: Date.now() };
      this.chat = [...this.chat.slice(-99), entry];
      if (isHost) this.broadcast(makeEnvelope(MESSAGE.CHAT, entry), "reliable", connection.id);
      this.emit();
      return;
    }

    if (message.type === MESSAGE.PING) {
      safeSend(channelLabel === "vf-player-motion" ? connection.realtime : connection.reliable, makeEnvelope(MESSAGE.PONG, { echo: payload.echo }));
    }
  }

  sendBootstrap(connection, playerState) {
    if (!this.store) return false;
    const world = this.store.getState().world;
    const payload = {
      roomId: this.roomId,
      worldId: this.worldId,
      worldName: this.worldName || world.name,
      worldSeed: this.worldSeed || world.seed,
      host: this.profile,
      shared: selectSharedWorldState(world),
      spawn: clone(world.spawn, { x: 0, y: 12, z: 0 }),
      assignedPlayer: clone(playerState, null),
      version: 16,
    };
    return safeSend(connection.reliable, makeEnvelope(MESSAGE.WORLD_BOOTSTRAP, payload));
  }

  sendLocalPlayerState() {
    if (!this.store) return;
    const world = this.store.getState().world;
    const playerState = selectPlayerSaveState(world, this.playerRef?.current || world.player, this.profile);
    playerState.animation = Date.now() < this.localAnimationUntil ? this.localAnimation : "idle";
    if (this.role === "host") {
      this.remotePlayers.set(this.profile.id, playerState);
      this.broadcast(makeEnvelope(MESSAGE.PLAYER_STATE, { playerState }), "realtime");
    } else if (this.role === "guest") {
      safeSend(this.guestConnection?.realtime || this.guestConnection?.reliable, makeEnvelope(MESSAGE.PLAYER_STATE, { playerState }));
    }
  }

  syncSharedWorld() {
    if (!this.store || this.role !== "host") return;
    const world = this.store.getState().world;
    if (world.revision === this.lastSharedRevision && this.status.includes("connected")) return;
    this.lastSharedRevision = world.revision;
    this.broadcastSharedWorld();
  }

  broadcastSharedWorld() {
    if (!this.store) return;
    const shared = selectSharedWorldState(this.store.getState().world);
    this.broadcast(makeEnvelope(MESSAGE.SHARED_WORLD_STATE, { shared }), "reliable");
  }

  sendGuestWorldProposal() {
    if (!this.store || this.role !== "guest") return;
    const world = this.store.getState().world;
    if (world.revision === this.lastSharedRevision) return;
    this.lastSharedRevision = world.revision;
    safeSend(this.guestConnection?.reliable, makeEnvelope(MESSAGE.SHARED_WORLD_STATE, { shared: selectSharedWorldState(world), proposedBy: this.profile.id }));
  }

  broadcastDirectory() {
    if (this.role !== "host") return;
    const players = [];
    const hostState = this.store ? selectPlayerSaveState(this.store.getState().world, this.playerRef?.current, this.profile) : null;
    if (hostState) players.push(hostState);
    this.connections.forEach((connection) => {
      const remote = connection.profile?.id ? this.remotePlayers.get(connection.profile.id) : null;
      if (remote) players.push(remote);
    });
    this.broadcast(makeEnvelope(MESSAGE.PLAYER_DIRECTORY, { players }), "reliable");
  }

  sendChat(text) {
    const clean = String(text || "").trim().slice(0, 280);
    if (!clean) return;
    const entry = { id: crypto.randomUUID(), playerId: this.profile.id, playerName: this.profile.name, text: clean, sentAt: Date.now() };
    this.chat = [...this.chat.slice(-99), entry];
    if (this.role === "host") this.broadcast(makeEnvelope(MESSAGE.CHAT, entry), "reliable");
    else safeSend(this.guestConnection?.reliable, makeEnvelope(MESSAGE.CHAT, entry));
    this.emit();
  }

  broadcast(envelope, channelKind = "reliable", exceptConnectionId = null) {
    if (this.role !== "host") return;
    this.connections.forEach((connection) => {
      if (connection.id === exceptConnectionId) return;
      safeSend(channelKind === "realtime" ? connection.realtime : connection.reliable, envelope);
    });
  }

  close() {
    this.stopSyncLoops();
    this.connections.forEach((connection) => {
      connection.reliable?.close?.();
      connection.realtime?.close?.();
      connection.pc?.close?.();
    });
    this.connections.clear();
    if (this.guestConnection) {
      this.guestConnection.reliable?.close?.();
      this.guestConnection.realtime?.close?.();
      this.guestConnection.pc?.close?.();
    }
    this.guestConnection = null;
    this.remotePlayers.clear();
    this.role = "offline";
    this.status = "offline";
    this.roomId = null;
    this.worldId = null;
    this.worldName = "";
    this.worldSeed = "";
    this.pendingBootstrap = null;
    this.emit();
  }
}

export const multiplayerSession = new MultiplayerSession();
export { ANSWER_CHANNEL };
