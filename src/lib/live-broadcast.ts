import Peer, { type DataConnection, type MediaConnection } from "peerjs";
import { eventConfig } from "@/lib/event-config";

export const STREAMER_ID = "streamer";
export const MAX_VIEWERS = 50;

export type LiveStats = {
  watching: number;
  ok: number;
  trouble: number;
};

export function iceServers(): RTCIceServer[] {
  return [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun.cloudflare.com:3478",
      ],
    },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:80?transport=tcp",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
        "turns:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: [
        "turn:staticauth.openrelay.metered.ca:80",
        "turn:staticauth.openrelay.metered.ca:80?transport=tcp",
        "turn:staticauth.openrelay.metered.ca:443?transport=tcp",
        "turns:staticauth.openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayprojectsecret",
    },
  ];
}

export function hostPeerId() {
  const slug = `${eventConfig.coupleNames}${eventConfig.roomId}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);
  return `vows${slug}`;
}

function peerConfig() {
  return {
    debug: 0 as const,
    config: {
      iceServers: iceServers(),
      iceTransportPolicy: "all" as RTCIceTransportPolicy,
      bundlePolicy: "max-bundle" as RTCBundlePolicy,
    },
  };
}

function bitrateForViewers(n: number) {
  if (n <= 8) return { maxBitrate: 1_200_000, maxFramerate: 30 };
  if (n <= 20) return { maxBitrate: 650_000, maxFramerate: 24 };
  return { maxBitrate: 320_000, maxFramerate: 20 };
}

function bindNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  const conn = (navigator as Navigator & { connection?: EventTarget }).connection;
  conn?.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
    conn?.removeEventListener("change", onChange);
  };
}

type Guest = {
  call?: MediaConnection;
  data?: DataConnection;
  report: "guest" | "ok" | "bad";
};

export class StreamerBroadcast {
  private closed = false;
  private peer: Peer | null = null;
  private unbindNet: (() => void) | null = null;
  private readonly guests = new Map<string, Guest>();
  private stream: MediaStream;
  private onStats: (stats: LiveStats) => void;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(stream: MediaStream, onStats: (stats: LiveStats) => void) {
    this.stream = stream;
    this.onStats = onStats;
  }

  setOnViewers(fn: (stats: LiveStats) => void) {
    this.onStats = fn;
  }

  async start() {
    this.unbindNet = bindNetwork(() => this.scheduleReconnect());
    this.listen();
  }

  stop() {
    this.closed = true;
    this.unbindNet?.();
    this.unbindNet = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    for (const g of this.guests.values()) {
      g.call?.close();
      g.data?.close();
    }
    this.guests.clear();
    this.peer?.destroy();
    this.peer = null;
    this.emitStats();
  }

  async replaceStream(next: MediaStream) {
    this.stream = next;
    const tracks = next.getTracks();
    for (const g of this.guests.values()) {
      const pc = g.call?.peerConnection;
      if (!pc) continue;
      for (const sender of pc.getSenders()) {
        const match = tracks.find((t) => t.kind === sender.track?.kind);
        if (match) await sender.replaceTrack(match);
      }
    }
    await this.applyBitrate();
  }

  private listen() {
    if (this.closed) return;
    this.peer?.destroy();
    const peer = new Peer(hostPeerId(), peerConfig());
    this.peer = peer;

    peer.on("open", () => {
      if (this.closed) return;
      this.emitStats();
    });
    peer.on("call", (call) => {
      if (this.closed || this.guests.size >= MAX_VIEWERS) {
        call.close();
        return;
      }
      const guest = this.guests.get(call.peer) ?? { report: "guest" };
      guest.call = call;
      this.guests.set(call.peer, guest);
      call.answer(this.stream);
      call.on("close", () => this.drop(call.peer));
      call.on("error", () => this.drop(call.peer));
      void this.applyBitrate();
      this.emitStats();
    });
    peer.on("connection", (conn) => {
      if (this.closed) {
        conn.close();
        return;
      }
      this.attachData(conn);
      try {
        const call = peer.call(conn.peer, this.stream);
        const guest = this.guests.get(conn.peer) ?? { report: "guest" };
        guest.call = call;
        this.guests.set(conn.peer, guest);
        call.on("close", () => this.drop(conn.peer));
        call.on("error", () => this.drop(conn.peer));
        void this.applyBitrate();
        this.emitStats();
      } catch {
        // viewer will retry
      }
    });
    peer.on("error", (err) => {
      const type = (err as { type?: string }).type;
      if (type === "unavailable-id" || type === "network" || type === "server-error") {
        this.scheduleReconnect();
      }
    });
    peer.on("disconnected", () => {
      if (this.closed) return;
      try {
        peer.reconnect();
      } catch {
        this.scheduleReconnect();
      }
    });
  }

  private attachData(conn: DataConnection) {
    const guest = this.guests.get(conn.peer) ?? { report: "guest" };
    guest.data = conn;
    this.guests.set(conn.peer, guest);
    conn.on("data", (raw) => {
      const msg = raw as { t?: string; v?: string };
      if (msg?.t === "report" && (msg.v === "ok" || msg.v === "bad")) {
        guest.report = msg.v;
        this.emitStats();
      }
    });
    conn.on("close", () => this.drop(conn.peer));
    this.emitStats();
  }

  private drop(id: string) {
    const g = this.guests.get(id);
    if (!g) return;
    g.call?.close();
    g.data?.close();
    this.guests.delete(id);
    this.emitStats();
    void this.applyBitrate();
  }

  private scheduleReconnect() {
    if (this.closed) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.listen(), 1200);
  }

  private emitStats() {
    const list = [...this.guests.values()];
    this.onStats({
      watching: list.filter((g) => g.call).length,
      ok: list.filter((g) => g.report === "ok").length,
      trouble: list.filter((g) => g.report === "bad").length,
    });
  }

  private async applyBitrate() {
    const { maxBitrate, maxFramerate } = bitrateForViewers(this.guests.size);
    for (const g of this.guests.values()) {
      const pc = g.call?.peerConnection;
      if (!pc) continue;
      for (const sender of pc.getSenders()) {
        if (sender.track?.kind !== "video") continue;
        try {
          const params = sender.getParameters();
          if (!params.encodings?.length) params.encodings = [{}];
          params.encodings[0].maxBitrate = maxBitrate;
          params.encodings[0].maxFramerate = maxFramerate;
          await sender.setParameters(params);
        } catch {
          // ignore
        }
      }
    }
  }
}

export class ViewerSession {
  private closed = false;
  private peer: Peer | null = null;
  private call: MediaConnection | null = null;
  private data: DataConnection | null = null;
  private report: "ok" | "bad" | null = null;
  private unbindNet: (() => void) | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private everLive = false;
  private readonly onStream: (stream: MediaStream | null) => void;
  private readonly onStatus: (status: "waiting" | "live" | "reconnecting") => void;

  constructor(
    onStream: (stream: MediaStream | null) => void,
    onStatus: (status: "waiting" | "live" | "reconnecting") => void,
  ) {
    this.onStream = onStream;
    this.onStatus = onStatus;
  }

  setReport(value: "ok" | "bad") {
    this.report = value;
    try {
      this.data?.send({ t: "report", v: value });
    } catch {
      // next reconnect
    }
  }

  async start() {
    this.unbindNet = bindNetwork(() => this.scheduleReconnect());
    this.connect();
  }

  stop() {
    this.closed = true;
    this.unbindNet?.();
    this.unbindNet = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.teardown();
  }

  private connect() {
    if (this.closed) return;
    this.teardown();
    this.onStatus(this.everLive ? "reconnecting" : "waiting");
    const peer = new Peer(peerConfig());
    this.peer = peer;

    peer.on("open", () => {
      if (this.closed || this.peer !== peer) return;
      const data = peer.connect(hostPeerId(), { reliable: true });
      this.data = data;
      data.on("open", () => {
        if (this.report) {
          try {
            data.send({ t: "report", v: this.report });
          } catch {
            // ignore
          }
        }
      });
      data.on("close", () => this.scheduleReconnect());
    });
    peer.on("call", (call) => {
      if (this.closed) return;
      this.call = call;
      call.answer();
      call.on("stream", (stream) => {
        if (this.closed) return;
        this.everLive = true;
        this.onStream(stream);
        this.onStatus("live");
      });
      call.on("close", () => {
        this.onStream(null);
        this.scheduleReconnect();
      });
    });
    peer.on("error", (err) => {
      const type = (err as { type?: string }).type;
      if (type === "peer-unavailable") {
        this.onStatus(this.everLive ? "reconnecting" : "waiting");
        this.scheduleReconnect();
        return;
      }
      this.scheduleReconnect();
    });
    peer.on("disconnected", () => {
      if (this.closed) return;
      this.onStatus("reconnecting");
      try {
        peer.reconnect();
      } catch {
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect() {
    if (this.closed) return;
    this.onStatus(this.everLive ? "reconnecting" : "waiting");
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 1600);
  }

  private teardown() {
    this.call?.close();
    this.call = null;
    this.data?.close();
    this.data = null;
    this.peer?.destroy();
    this.peer = null;
    this.onStream(null);
  }
}



export async function openCamera(facing: "environment" | "user") {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: true,
      channelCount: 1,
    },
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
    },
  });
  for (const track of stream.getVideoTracks()) {
    track.contentHint = "motion";
  }
  for (const track of stream.getAudioTracks()) {
    track.contentHint = "speech";
  }
  return stream;
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
