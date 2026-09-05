import { AudioPresets, ConnectionState, Room, RoomEvent, Track, VideoPresets, VideoQuality, type LocalTrackPublication, type RemoteParticipant, type RemoteTrack, type RemoteTrackPublication } from "livekit-client";
import { chatLabel, isChatId, type ChatLine } from "@/lib/crowd";
import { eventConfig } from "@/lib/event-config";
import {
  HOST_IDENTITY,
  PRODUCTION_LIVE_API,
  PRODUCTION_ORIGIN,
  guestIdentity,
  guestSharePayload,
} from "@/lib/live-config";

export type LiveStats = {
  watching: number;
  ok: number;
  trouble: number;
};

export type { ChatLine };

const hostPublishDefaults = {
  videoCodec: "h264" as const,
  simulcast: true,
  videoEncoding: {
    maxBitrate: 3_200_000,
    maxFramerate: 30,
    priority: "high" as const,
  },
  videoSimulcastLayers: [VideoPresets.h360, VideoPresets.h720],
  degradationPreference: "maintain-resolution" as const,
  audioPreset: AudioPresets.music,
};

export class LiveConfigError extends Error {
  code: "not_configured" | "unauthorized" | "failed" | "room_full";
  constructor(code: "not_configured" | "unauthorized" | "failed" | "room_full", message: string) {
    super(message);
    this.code = code;
  }
}

type TokenResponse = { token: string; url: string; identity: string; room: string };

function isHostParticipant(participant: {
  identity: string;
  permissions?: { canPublish?: boolean } | null;
}) {
  return participant.identity === HOST_IDENTITY || Boolean(participant.permissions?.canPublish);
}

async function fetchLiveToken(role: "host" | "guest"): Promise<TokenResponse> {
  const payload = role === "guest" ? { role, identity: guestIdentity() } : { role };
  const endpoints = ["/api/live"];
  if (typeof window !== "undefined" && window.location.origin !== PRODUCTION_ORIGIN) {
    endpoints.push(PRODUCTION_LIVE_API);
  }

  let last: LiveConfigError | null = null;
  for (const endpoint of endpoints) {
    try {
      return await mintToken(endpoint, payload);
    } catch (err) {
      if (err instanceof LiveConfigError) {
        last = err;
        if (err.code === "unauthorized") throw err;
        continue;
      }
      throw err;
    }
  }
  throw last ?? new LiveConfigError("failed", "Could not join the live room.");
}

async function mintToken(endpoint: string, payload: object): Promise<TokenResponse> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  try {
    const bearer = sessionStorage.getItem("grok-auth.bearer-token");
    if (bearer) headers.authorization = `Bearer ${bearer}`;
  } catch {
    // ignore
  }
  const res = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });
  let body: { error?: string } & Partial<TokenResponse> = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    body = {};
  }
  if (body.error === "not_configured" || res.status === 503) {
    throw new LiveConfigError(
      "not_configured",
      "The live room is not connected on this site yet. Add LiveKit keys on Vercel, then try Go live again.",
    );
  }
  if (res.status === 401 || body.error === "unauthorized") {
    throw new LiveConfigError(
      "unauthorized",
      "Could not start as host. Sign in again, then tap Go live.",
    );
  }
  if (res.status === 429 || body.error === "room_full") {
    throw new LiveConfigError("room_full", "The live room is full. Try again in a moment.");
  }
  if (!res.ok || !body.token || !body.url) {
    throw new LiveConfigError("failed", "Could not join the live room.");
  }
  return body as TokenResponse;
}

export async function openCamera(facing: "environment" | "user") {
  const attempts: MediaStreamConstraints[] = [
    {
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: true,
        channelCount: 1,
      },
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 30 },
      },
    },
    {
      audio: true,
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    },
    { audio: true, video: { facingMode: facing } },
    { audio: true, video: true },
  ];
  let last: unknown;
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      for (const track of stream.getVideoTracks()) track.contentHint = "detail";
      for (const track of stream.getAudioTracks()) track.contentHint = "speech";
      return stream;
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("camera");
}

export function cameraHasTorch(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
  return Boolean(caps && "torch" in caps);
}

export async function toggleTorch(stream: MediaStream, on: boolean) {
  const track = stream.getVideoTracks()[0];
  if (!track) return false;
  try {
    await track.applyConstraints({
      advanced: [{ torch: on } as MediaTrackConstraintSet],
    });
    return true;
  } catch {
    return false;
  }
}

export async function copyWatchLink() {
  const { title, text, url } = guestSharePayload(eventConfig.productName);
  try {
    await navigator.clipboard.writeText(text);
    return "copied" as const;
  } catch {
    if (typeof navigator.share !== "function") return "failed" as const;
    try {
      await navigator.share({ title, text, url });
      return "shared" as const;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled" as const;
      return "failed" as const;
    }
  }
}

export async function shareWatchLink() {
  const { title, text, url } = guestSharePayload(eventConfig.productName);
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return "shared" as const;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled" as const;
    }
  }
  return copyWatchLink();
}

export class StreamerBroadcast {
  private closed = false;
  private starting = false;
  private room: Room | null = null;
  private stream: MediaStream;
  private onStats: (stats: LiveStats) => void;
  private onChat: (line: ChatLine) => void;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1500;
  private readonly reports = new Map<string, "ok" | "bad">();

  constructor(
    stream: MediaStream,
    onStats: (stats: LiveStats) => void,
    onChat: (line: ChatLine) => void = () => undefined,
  ) {
    this.stream = stream;
    this.onStats = onStats;
    this.onChat = onChat;
  }

  setOnViewers(fn: (stats: LiveStats) => void) {
    this.onStats = fn;
  }

  setOnChat(fn: (line: ChatLine) => void) {
    this.onChat = fn;
  }

  async start() {
    if (this.closed || this.starting) return;
    this.starting = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      const prev = this.room;
      this.room = null;
      await prev?.disconnect();
    } catch {
      // ignore
    }
    try {
      const creds = await fetchLiveToken("host");
      if (this.closed) return;

      const room = new Room({
        adaptiveStream: false,
        dynacast: true,
        disconnectOnPageLeave: false,
        publishDefaults: hostPublishDefaults,
        videoCaptureDefaults: {
          facingMode: "environment",
          resolution: VideoPresets.h1080.resolution,
        },
      });
      this.room = room;

      room.on(RoomEvent.ParticipantConnected, () => this.emitStats());
      room.on(RoomEvent.ParticipantDisconnected, (p) => {
        this.reports.delete(p.identity);
        this.emitStats();
      });
      room.on(RoomEvent.DataReceived, (payload, participant) => {
        this.handleData(payload, participant?.identity ?? "guest");
      });
      room.on(RoomEvent.Disconnected, () => {
        if (this.closed || this.room !== room) return;
        this.emitStats();
        this.scheduleReconnect();
      });

      await room.connect(creds.url, creds.token);
      if (this.closed) {
        await room.disconnect();
        return;
      }
      await this.publish(this.stream);
      this.backoffMs = 1500;
      this.emitStats();
    } catch (err) {
      if (this.closed) return;
      if (err instanceof LiveConfigError && err.code === "unauthorized") throw err;
      this.scheduleReconnect();
      throw err;
    } finally {
      this.starting = false;
    }
  }

  stop() {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    void this.room?.disconnect();
    this.room = null;
    this.reports.clear();
    this.emitStats();
  }

  async replaceStream(next: MediaStream) {
    this.stream = next;
    if (!this.room || this.room.state !== ConnectionState.Connected) return;
    await this.swapTrack("video", next.getVideoTracks()[0]);
    await this.swapTrack("audio", next.getAudioTracks()[0]);
  }

  private scheduleReconnect() {
    if (this.closed || this.reconnectTimer) return;
    const wait = this.backoffMs;
    this.backoffMs = Math.min(8000, Math.round(this.backoffMs * 1.4));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.start().catch(() => undefined);
    }, wait);
  }

  private async swapTrack(kind: "video" | "audio", track?: MediaStreamTrack) {
    const room = this.room;
    if (!room || !track) return;
    const source = kind === "video" ? Track.Source.Camera : Track.Source.Microphone;
    const pub = room.localParticipant.getTrackPublication(source) as LocalTrackPublication | undefined;
    if (pub?.track) {
      await pub.track.replaceTrack(track);
      return;
    }
    await room.localParticipant.publishTrack(track, {
      ...hostPublishDefaults,
      source,
      name: kind === "video" ? "camera" : "mic",
      simulcast: kind === "video",
    });
  }

  private async publish(stream: MediaStream) {
    const room = this.room;
    if (!room) return;
    const video = stream.getVideoTracks()[0];
    const audio = stream.getAudioTracks()[0];
    if (video) {
      await room.localParticipant.publishTrack(video, {
        ...hostPublishDefaults,
        source: Track.Source.Camera,
        name: "camera",
      });
    }
    if (audio) {
      await room.localParticipant.publishTrack(audio, {
        source: Track.Source.Microphone,
        name: "mic",
        audioPreset: AudioPresets.music,
      });
    }
  }

  private handleData(payload: Uint8Array, from: string) {
    try {
      const msg = JSON.parse(new TextDecoder().decode(payload)) as { t?: string; v?: string };
      if (msg?.t === "report" && (msg.v === "ok" || msg.v === "bad")) {
        this.reports.set(from, msg.v);
        this.emitStats();
        return;
      }
      if (msg?.t === "chat" && typeof msg.v === "string" && isChatId(msg.v)) {
        this.onChat({ from, id: msg.v, label: chatLabel(msg.v) ?? msg.v, at: Date.now() });
      }
    } catch {
      // ignore
    }
  }

  private emitStats() {
    const watching = this.room
      ? [...this.room.remoteParticipants.values()].filter((p) => p.identity !== HOST_IDENTITY)
          .length
      : 0;
    const ok = [...this.reports.values()].filter((v) => v === "ok").length;
    const trouble = [...this.reports.values()].filter((v) => v === "bad").length;
    this.onStats({ watching, ok, trouble });
  }
}

export class ViewerSession {
  private closed = false;
  private room: Room | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private audioTrack: MediaStreamTrack | null = null;
  private report: "ok" | "bad" | null = null;
  private everLive = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1500;
  private lastChatAt = 0;
  private readonly onStream: (stream: MediaStream | null) => void;
  private readonly onStatus: (status: "waiting" | "live" | "reconnecting" | "full" | "offline") => void;
  private onChat: (line: ChatLine) => void;

  constructor(
    onStream: (stream: MediaStream | null) => void,
    onStatus: (status: "waiting" | "live" | "reconnecting" | "full" | "offline") => void,
    onChat: (line: ChatLine) => void = () => undefined,
  ) {
    this.onStream = onStream;
    this.onStatus = onStatus;
    this.onChat = onChat;
  }

  setOnChat(fn: (line: ChatLine) => void) {
    this.onChat = fn;
  }

  async startAudio() {
    try {
      await this.room?.startAudio();
    } catch {
      // iOS may still require the unmute tap on the video element
    }
  }

  setReport(value: "ok" | "bad") {
    this.report = value;
    void this.sendPayload({ t: "report", v: value });
  }

  sendChat(id: string) {
    if (!isChatId(id)) return false;
    const now = Date.now();
    if (now - this.lastChatAt < 8000) return false;
    this.lastChatAt = now;
    const line: ChatLine = {
      from: "you",
      id,
      label: chatLabel(id) ?? id,
      at: now,
    };
    this.onChat(line);
    void this.sendPayload({ t: "chat", v: id });
    return true;
  }

  async start() {
    if (this.closed) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      const prev = this.room;
      this.room = null;
      await prev?.disconnect();
    } catch {
      // ignore
    }
    this.onStatus(this.everLive ? "reconnecting" : "waiting");
    try {
      const creds = await fetchLiveToken("guest");
      if (this.closed) return;
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        disconnectOnPageLeave: false,
      });
      this.room = room;

      room.on(
        RoomEvent.TrackSubscribed,
        (track, pub: RemoteTrackPublication, participant) => {
          if (this.closed) return;
          if (!isHostParticipant(participant)) return;
          if (pub.kind === Track.Kind.Video) pub.setVideoQuality(VideoQuality.HIGH);
          this.attachRemote(track);
        },
      );
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        this.detachRemote(track);
      });
      room.on(RoomEvent.DataReceived, (payload, participant) => {
        if (this.closed) return;
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload)) as { t?: string; v?: string };
          if (msg?.t !== "chat" || typeof msg.v !== "string" || !isChatId(msg.v)) return;
          const from = participant?.identity ?? "guest";
          this.onChat({
            from,
            id: msg.v,
            label: chatLabel(msg.v) ?? msg.v,
            at: Date.now(),
          });
        } catch {
          // ignore
        }
      });
      room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
        if (isHostParticipant(p)) {
          this.videoTrack = null;
          this.audioTrack = null;
          this.emitStream();
          this.onStatus(this.everLive ? "reconnecting" : "waiting");
        }
      });
      room.on(RoomEvent.Reconnecting, () => {
        if (!this.closed) this.onStatus(this.everLive ? "reconnecting" : "waiting");
      });
      room.on(RoomEvent.Reconnected, () => {
        if (!this.closed && this.videoTrack) {
          this.onStatus("live");
          this.emitStream();
        }
      });
      room.on(RoomEvent.Disconnected, () => {
        if (this.closed || this.room !== room) return;
        this.videoTrack = null;
        this.audioTrack = null;
        this.emitStream();
        this.onStatus(this.everLive ? "reconnecting" : "waiting");
        this.scheduleReconnect();
      });

      await room.connect(creds.url, creds.token);
      if (this.closed) {
        await room.disconnect();
        return;
      }
      this.hydrateExisting();
      await this.sendPayload(this.report ? { t: "report", v: this.report } : null);
    } catch (err) {
      if (this.closed) return;
      if (err instanceof LiveConfigError && err.code === "not_configured") {
        this.onStatus("offline");
        return;
      }
      if (err instanceof LiveConfigError && err.code === "room_full") {
        this.onStatus("full");
        this.scheduleReconnect(12_000);
        return;
      }
      this.onStatus(this.everLive ? "reconnecting" : "waiting");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(overrideMs?: number) {
    if (this.closed) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const wait = overrideMs ?? this.backoffMs;
    this.backoffMs = Math.min(8000, Math.round(this.backoffMs * 1.4));
    this.reconnectTimer = setTimeout(() => {
      void this.start();
    }, wait);
  }

  stop() {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.videoTrack = null;
    this.audioTrack = null;
    this.emitStream();
    void this.room?.disconnect();
    this.room = null;
  }

  private hydrateExisting() {
    const room = this.room;
    if (!room) return;
    for (const participant of room.remoteParticipants.values()) {
      if (!isHostParticipant(participant)) continue;
      for (const pub of participant.trackPublications.values()) {
        if (pub.kind === Track.Kind.Video) pub.setVideoQuality(VideoQuality.HIGH);
        if (pub.track) this.attachRemote(pub.track);
      }
    }
  }

  private attachRemote(track: RemoteTrack) {
    if (track.kind === Track.Kind.Video) this.videoTrack = track.mediaStreamTrack;
    if (track.kind === Track.Kind.Audio) this.audioTrack = track.mediaStreamTrack;
    if (this.videoTrack) {
      this.everLive = true;
      this.backoffMs = 1500;
      this.onStatus("live");
      this.emitStream();
    }
  }

  private detachRemote(track: RemoteTrack) {
    if (track.mediaStreamTrack === this.videoTrack) this.videoTrack = null;
    if (track.mediaStreamTrack === this.audioTrack) this.audioTrack = null;
    if (!this.videoTrack) {
      this.emitStream();
      this.onStatus(this.everLive ? "reconnecting" : "waiting");
    } else {
      this.emitStream();
    }
  }

  private emitStream() {
    if (!this.videoTrack) {
      this.onStream(null);
      return;
    }
    const tracks: MediaStreamTrack[] = [this.videoTrack];
    if (this.audioTrack) tracks.push(this.audioTrack);
    this.onStream(new MediaStream(tracks));
  }

  private async sendPayload(body: { t: string; v: string } | null) {
    if (!body || !this.room || this.room.state !== ConnectionState.Connected) return;
    try {
      await this.room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(body)), {
        reliable: true,
      });
    } catch {
      // next reconnect
    }
  }
}

