export type RecordedClip = {
  blob: Blob;
  mime: string;
  durationMs: number;
};

function pickMime() {
  const types = [
    "video/mp4",
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function recorderSupported() {
  return typeof MediaRecorder !== "undefined" && Boolean(pickMime());
}

export class LiveRecorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private mime = "";

  start(stream: MediaStream) {
    this.stopTracks();
    const mime = pickMime();
    if (!mime) return;
    try {
      const clone = new MediaStream(stream.getTracks().map((t) => t.clone()));
      const rec = new MediaRecorder(clone, {
        mimeType: mime,
        videoBitsPerSecond: 2_400_000,
        audioBitsPerSecond: 128_000,
      });
      this.rec = rec;
      this.chunks = [];
      this.mime = mime.split(";")[0] ?? mime;
      this.startedAt = Date.now();
      rec.ondataavailable = (e) => {
        if (e.data.size) this.chunks.push(e.data);
      };
      rec.start(1000);
    } catch {
      this.rec = null;
    }
  }

  replace(stream: MediaStream) {
    if (!this.rec) return;
    this.start(stream);
  }

  stop(): Promise<RecordedClip | null> {
    const rec = this.rec;
    this.rec = null;
    if (!rec || rec.state === "inactive") {
      this.stopTracks();
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      rec.onstop = () => {
        this.stopTracks(rec.stream);
        const blob = new Blob(this.chunks, { type: this.mime || rec.mimeType });
        this.chunks = [];
        if (blob.size < 24_000) {
          resolve(null);
          return;
        }
        resolve({
          blob,
          mime: blob.type || this.mime,
          durationMs: Math.max(0, Date.now() - this.startedAt),
        });
      };
      try {
        rec.stop();
      } catch {
        this.stopTracks(rec.stream);
        resolve(null);
      }
    });
  }

  private stopTracks(stream?: MediaStream) {
    stream?.getTracks().forEach((t) => t.stop());
    this.rec?.stream.getTracks().forEach((t) => t.stop());
  }
}
