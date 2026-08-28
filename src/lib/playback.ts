export type Playback =
  | { kind: "none" }
  | { kind: "youtube"; videoId: string }
  | { kind: "hls"; src: string };

const YT_ID = /^[\w-]{11}$/;

export function extractYouTubeId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (YT_ID.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && YT_ID.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const v = url.searchParams.get("v");
      if (v && YT_ID.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      const liveIdx = parts.indexOf("live");
      if (liveIdx >= 0 && parts[liveIdx + 1] && YT_ID.test(parts[liveIdx + 1])) return parts[liveIdx + 1];
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1] && YT_ID.test(parts[embedIdx + 1])) return parts[embedIdx + 1];
    }
  } catch {
    return null;
  }
  return null;
}

export function parsePlayback(raw: string): Playback {
  const url = raw.trim();
  if (!url) return { kind: "none" };
  const yt = extractYouTubeId(url);
  if (yt) return { kind: "youtube", videoId: yt };
  if (/\.m3u8(\?|$)/i.test(url) || /mux\.com|cloudflarestream\.com|livekit/i.test(url) || /^https?:\/\//i.test(url)) {
    return { kind: "hls", src: url };
  }
  return { kind: "none" };
}
