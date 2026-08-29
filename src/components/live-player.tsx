import { Maximize, Volume2, VolumeX } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WaitingRoom } from "@/components/waiting-room";
import { type Playback } from "@/lib/playback";
import { cn } from "@/lib/utils";

type Status = "waiting" | "live" | "reconnecting";

type ViewerHandle = {
  start: () => Promise<void>;
  stop: () => void;
  setReport: (value: "ok" | "bad") => void;
  startAudio: () => Promise<void>;
};

export function LivePlayer({ playback }: { playback: Playback }) {
  if (playback.kind === "youtube") {
    return <YouTubePlayer videoId={playback.videoId} />;
  }
  if (playback.kind === "hls") {
    return <HlsPlayer src={playback.src} />;
  }
  return <WebRtcViewer />;
}

function PlayerShell({
  status,
  children,
  onUnmute,
  muted,
  onFullscreen,
  className,
}: {
  status: Status;
  children: ReactNode;
  onUnmute?: () => void;
  muted?: boolean;
  onFullscreen?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-surface",
        className,
      )}
    >
      {children}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
        <Badge
          tone={
            status === "live" ? "live" : status === "reconnecting" ? "warn" : "muted"
          }
        >
          {status === "live" ? (
            <>
              <span className="size-1.5 rounded-full bg-live" />
              Live
            </>
          ) : status === "reconnecting" ? (
            "Reconnecting"
          ) : (
            "Waiting"
          )}
        </Badge>
      </div>
      {status === "live" && muted && onUnmute ? (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-bg/55 p-4 pb-6">
          <Button
            type="button"
            size="lg"
            className="pointer-events-auto shadow-lg"
            onClick={onUnmute}
          >
            <Volume2 />
            Tap for sound
          </Button>
        </div>
      ) : null}
      <div className="absolute right-3 bottom-3 z-20 flex gap-2">
        {status === "live" && onUnmute && !muted ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Mute"
            onClick={onUnmute}
          >
            <VolumeX />
          </Button>
        ) : null}
        {status === "live" && onFullscreen ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Fullscreen"
            onClick={onFullscreen}
          >
            <Maximize />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function WebRtcViewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ViewerHandle | null>(null);
  const [status, setStatus] = useState<Status>("waiting");
  const [muted, setMuted] = useState(true);
  const [report, setReport] = useState<"ok" | "bad" | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("@/lib/live-broadcast").then(({ ViewerSession }) => {
      if (cancelled) return;
      const session = new ViewerSession(
        (stream) => {
          const video = videoRef.current;
          if (!video) return;
          video.srcObject = stream;
          if (stream) void video.play().catch(() => undefined);
        },
        (next) => setStatus(next),
      );
      sessionRef.current = session;
      void session.start();
    });
    return () => {
      cancelled = true;
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, []);

  const sendReport = (value: "ok" | "bad") => {
    sessionRef.current?.setReport(value);
    setReport(value);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
    if (!next) {
      void sessionRef.current?.startAudio();
      void video.play().catch(() => undefined);
    }
  };

  const fullscreen = () => {
    const video = videoRef.current;
    const wrap = wrapRef.current;
    if (video && "webkitEnterFullscreen" in video) {
      (
        video as HTMLVideoElement & { webkitEnterFullscreen: () => void }
      ).webkitEnterFullscreen();
      return;
    }
    if (wrap?.requestFullscreen) void wrap.requestFullscreen();
  };

  return (
    <>
      <PlayerShell
        status={status}
        muted={muted}
        onUnmute={toggleMute}
        onFullscreen={fullscreen}
      >
        <div ref={wrapRef} className="relative aspect-video w-full bg-raised">
          {status !== "live" ? (
            <div className="absolute inset-0 z-10">
              <WaitingRoom status={status === "reconnecting" ? "reconnecting" : "waiting"} />
            </div>
          ) : null}
          <video
            ref={videoRef}
            className="h-full w-full bg-raised object-contain"
            playsInline
            muted={muted}
            autoPlay
            disablePictureInPicture
          />
        </div>
      </PlayerShell>
      {status === "live" && !muted && report === null ? (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-center">
          <p className="font-serif text-lg text-fg">Can you see and hear clearly?</p>
          <p className="mt-1 text-sm text-muted">
            This tells the streamer — they cannot hear you back.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => sendReport("ok")}>
              Yes, all good
            </Button>
            <Button type="button" variant="secondary" onClick={() => sendReport("bad")}>
              Something’s wrong
            </Button>
          </div>
        </div>
      ) : null}
      {report === "ok" ? (
        <p className="mt-3 text-center text-sm text-muted">
          Thanks — they can see that you’re watching.
        </p>
      ) : null}
      {report === "bad" ? (
        <p className="mt-3 text-center text-sm text-warn">
          They’ve been told. Try turning the volume up, rotating the phone, or
          staying on this page while it reconnects.
        </p>
      ) : null}
    </>
  );
}

function ytCommand(win: Window | null | undefined, func: string) {
  win?.postMessage(
    JSON.stringify({ event: "command", func, args: [] }),
    "*",
  );
}

function YouTubePlayer({ videoId }: { videoId: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [muted, setMuted] = useState(true);
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`;

  const toggleMute = () => {
    const win = iframeRef.current?.contentWindow;
    if (muted) {
      ytCommand(win, "unMute");
      ytCommand(win, "playVideo");
    } else {
      ytCommand(win, "mute");
    }
    setMuted((m) => !m);
  };

  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (el.requestFullscreen) void el.requestFullscreen();
  };

  return (
    <PlayerShell
      status="live"
      muted={muted}
      onUnmute={toggleMute}
      onFullscreen={fullscreen}
    >
      <div ref={wrapRef} className="aspect-video w-full bg-raised">
        <iframe
          ref={iframeRef}
          title="Live stream"
          src={src}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </PlayerShell>
  );
}

function HlsPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("waiting");
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let hls: { destroy: () => void } | null = null;
    let timer: number | null = null;
    let attempt = 0;

    const clearTimer = () => {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const retry = () => {
      if (cancelled) return;
      setStatus("reconnecting");
      const delay = Math.min(12000, 2500 * 2 ** Math.min(attempt, 3));
      attempt += 1;
      clearTimer();
      timer = window.setTimeout(() => {
        void start();
      }, delay);
    };

    const start = async () => {
      if (cancelled || !videoRef.current) return;
      hls?.destroy();
      hls = null;

      const native = video.canPlayType("application/vnd.apple.mpegurl");
      try {
        if (native) {
          video.src = src;
          await video.play().catch(() => undefined);
          return;
        }

        const { default: Hls } = await import("hls.js");
        if (cancelled) return;
        if (!Hls.isSupported()) {
          setStatus("waiting");
          return;
        }

        const instance = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          manifestLoadingMaxRetry: 4,
          manifestLoadingRetryDelay: 2000,
        });
        hls = instance;
        instance.loadSource(src);
        instance.attachMedia(video);
        instance.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => undefined);
        });
        instance.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          instance.destroy();
          hls = null;
          retry();
        });
      } catch {
        retry();
      }
    };

    void start();

    return () => {
      cancelled = true;
      clearTimer();
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  const onPlaying = () => setStatus("live");
  const onWaiting = () => setStatus((s) => (s === "live" ? "reconnecting" : s));
  const onError = () => setStatus("reconnecting");

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
    if (!next) void video.play().catch(() => undefined);
  };

  const fullscreen = () => {
    const video = videoRef.current;
    const wrap = wrapRef.current;
    if (video && "webkitEnterFullscreen" in video) {
      (
        video as HTMLVideoElement & { webkitEnterFullscreen: () => void }
      ).webkitEnterFullscreen();
      return;
    }
    if (wrap?.requestFullscreen) void wrap.requestFullscreen();
  };

  return (
    <PlayerShell
      status={status}
      muted={muted}
      onUnmute={toggleMute}
      onFullscreen={fullscreen}
    >
      <div ref={wrapRef} className="relative aspect-video w-full bg-raised">
        {status !== "live" ? (
          <div className="absolute inset-0 z-10">
            <WaitingRoom
              status={status === "reconnecting" ? "reconnecting" : "waiting"}
            />
          </div>
        ) : null}
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          playsInline
          muted={muted}
          autoPlay
          controls={false}
          onPlaying={onPlaying}
          onWaiting={onWaiting}
          onError={onError}
          onStalled={onError}
        />
      </div>
    </PlayerShell>
  );
}
