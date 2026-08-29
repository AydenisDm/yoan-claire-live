import {
  Copy,
  Flashlight,
  FlashlightOff,
  FlipHorizontal2,
  Radio,
  Square,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LiveConfigError,
  cameraHasTorch,
  copyWatchLink,
  openCamera,
  StreamerBroadcast,
  hostPasswordFromSession,
  toggleTorch,
  type LiveStats,
} from "@/lib/live-broadcast";
import { cn } from "@/lib/utils";

type Runtime = {
  broadcast: StreamerBroadcast;
  stream: MediaStream;
  facing: "environment" | "user";
};

let runtime: Runtime | null = null;

async function keepAwake() {
  if (!("wakeLock" in navigator)) return;
  try {
    await navigator.wakeLock.request("screen");
  } catch {
    // ignore
  }
}

function errorCopy(err: unknown) {
  if (err instanceof LiveConfigError) return err.message;
  const name = err && typeof err === "object" && "name" in err ? String(err.name) : "";
  if (name === "NotAllowedError" || name === "NotFoundError" || name === "NotReadableError") {
    return "Allow camera and microphone, then try Go live again.";
  }
  return "Could not start the live picture. Try Go live again.";
}

export function GoLive() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<"environment" | "user">(runtime?.facing ?? "environment");
  const [live, setLive] = useState(() => Boolean(runtime));
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<LiveStats>({ watching: 0, ok: 0, trouble: 0 });
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [chromeOn, setChromeOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const [flipping, setFlipping] = useState(false);

  const attach = (stream: MediaStream) => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    void el.play().catch(() => undefined);
  };

  useEffect(() => {
    if (!runtime) return;
    runtime.broadcast.setOnViewers(setStats);
    attach(runtime.stream);
    setFacing(runtime.facing);
    setTorch(cameraHasTorch(runtime.stream));
    setLive(true);
  }, []);

  useEffect(() => {
    if (runtime) attach(runtime.stream);
  }, [live]);

  useEffect(() => {
    if (!live || !chromeOn) return;
    const t = window.setTimeout(() => setChromeOn(false), 8000);
    return () => window.clearTimeout(t);
  }, [live, chromeOn]);

  useEffect(() => {
    if (!live) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onVis = () => {
      if (document.visibilityState === "visible") void keepAwake();
    };
    window.addEventListener("beforeunload", onLeave);
    document.addEventListener("visibilitychange", onVis);
    void keepAwake();
    const pulse = window.setInterval(() => void keepAwake(), 20000);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(pulse);
    };
  }, [live]);

  const stopAll = () => {
    runtime?.broadcast.stop();
    runtime?.stream.getTracks().forEach((t) => t.stop());
    runtime = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
    setStats({ watching: 0, ok: 0, trouble: 0 });
    setTorch(false);
    setTorchOn(false);
    setChromeOn(true);
  };

  const goLive = async () => {
    setBusy(true);
    setError(null);
    try {
      const password = hostPasswordFromSession();
      const stream = await openCamera(facing);
      attach(stream);
      const session = new StreamerBroadcast(stream, setStats, password);
      runtime = { broadcast: session, stream, facing };
      await session.start();
      await keepAwake();
      setTorch(cameraHasTorch(stream));
      setLive(true);
      setChromeOn(true);
    } catch (err) {
      stopAll();
      setError(errorCopy(err));
    } finally {
      setBusy(false);
    }
  };

  const flip = async () => {
    if (!runtime || flipping) return;
    const previous = facing;
    const next = facing === "environment" ? "user" : "environment";
    setFlipping(true);
    setError(null);
    runtime.stream.getTracks().forEach((t) => t.stop());
    try {
      const stream = await openCamera(next);
      attach(stream);
      runtime.stream = stream;
      runtime.facing = next;
      setFacing(next);
      setTorchOn(false);
      setTorch(cameraHasTorch(stream));
      await runtime.broadcast.replaceStream(stream);
    } catch {
      try {
        const stream = await openCamera(previous);
        attach(stream);
        runtime.stream = stream;
        runtime.facing = previous;
        setFacing(previous);
        setTorch(cameraHasTorch(stream));
        await runtime.broadcast.replaceStream(stream);
        setError("Could not switch camera.");
      } catch {
        setError("Could not switch camera. Stop, then Go live again.");
      }
    } finally {
      setFlipping(false);
    }
  };

  const onTorch = async () => {
    if (!runtime) return;
    const next = !torchOn;
    const ok = await toggleTorch(runtime.stream, next);
    if (ok) {
      setTorchOn(next);
      setError(null);
    } else {
      setTorch(false);
      setError("Light is not available on this camera.");
    }
  };

  const shareLink = async () => {
    const result = await copyWatchLink();
    if (result === "failed") {
      setError("Could not copy the watch link. Share the site address instead.");
      return;
    }
    if (result === "cancelled") return;
    setCopied(true);
    setError(null);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const preview = (
    <video
      ref={videoRef}
      className={cn("h-full w-full object-cover", facing === "user" && "scale-x-[-1]")}
      playsInline
      muted
      autoPlay
      disablePictureInPicture
    />
  );

  if (live) {
    return (
      <div className="fixed inset-0 z-50 bg-bg" onClick={() => setChromeOn(true)}>
        <div className="absolute inset-0">{preview}</div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 bg-gradient-to-b from-bg/80 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <Badge tone="live">
            <span className="size-1.5 rounded-full bg-live" />
            Live
          </Badge>
          <Button
            type="button"
            variant="secondary"
            className="pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              stopAll();
            }}
          >
            <Square />
            Stop
          </Button>
        </div>
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-bg/90 via-bg/70 to-transparent p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-10 transition-opacity duration-200",
            chromeOn ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-center text-sm font-medium text-fg tabular-nums">
              {stats.watching} watching
              {stats.ok ? ` · ${stats.ok} clear` : ""}
              {stats.trouble ? ` · ${stats.trouble} trouble` : ""}
            </p>
            {error ? (
              <p className="rounded-md bg-bg/80 px-3 py-2 text-center text-sm text-warn">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" variant="secondary" disabled={flipping} onClick={() => void flip()}>
                <FlipHorizontal2 />
                {flipping ? "Switching…" : "Flip"}
              </Button>
              {torch ? (
                <Button type="button" variant="secondary" onClick={() => void onTorch()}>
                  {torchOn ? <FlashlightOff /> : <Flashlight />}
                  {torchOn ? "Light off" : "Light"}
                </Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={() => void shareLink()}>
                <Copy />
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="px-5 pt-6 pb-2 text-center sm:px-6">
        <p className="font-serif text-2xl text-fg">Ready when you are</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          One tap fills this phone’s screen. Guests only watch the link. Keep the tab open
          and the phone plugged in.
        </p>
      </div>
      {error ? <p className="px-5 pt-3 text-sm text-warn">{error}</p> : null}
      <div className="p-3">
        <Button
          type="button"
          variant="live"
          size="lg"
          className="w-full"
          disabled={busy}
          onClick={() => void goLive()}
        >
          <Radio />
          {busy ? "Starting…" : "Go live — full screen"}
        </Button>
      </div>
    </div>
  );
}
