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
  const [chromeOn, setChromeOn] = useState(true);
  const [copied, setCopied] = useState(false);

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
    setLive(true);
  }, []);

  useEffect(() => {
    if (runtime) attach(runtime.stream);
  }, [live]);

  useEffect(() => {
    const hide = () => {
      if (!live) return;
      setChromeOn(false);
    };
    if (!live || !chromeOn) return;
    const t = window.setTimeout(hide, 4000);
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
    const next = facing === "environment" ? "user" : "environment";
    try {
      const stream = await openCamera(next);
      runtime?.stream.getTracks().forEach((t) => t.stop());
      attach(stream);
      setFacing(next);
      setTorch(false);
      if (runtime) {
        runtime.stream = stream;
        runtime.facing = next;
        await runtime.broadcast.replaceStream(stream);
      }
    } catch {
      setError("Could not switch camera.");
    }
  };

  const onTorch = async () => {
    if (!runtime) return;
    const next = !torch;
    const ok = await toggleTorch(runtime.stream, next);
    if (ok) setTorch(next);
    else setError("Torch is not available on this camera.");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const preview = (
    <video
      ref={videoRef}
      className={cn("h-full w-full object-cover", facing === "user" && "scale-x-[-1]")}
      playsInline
      muted
      autoPlay
    />
  );

  if (live) {
    return (
      <div className="fixed inset-0 z-50 bg-fg" onClick={() => setChromeOn(true)}>
        <div className="absolute inset-0">{preview}</div>
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-opacity duration-200",
            chromeOn ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <Badge tone="live">
              <span className="size-1.5 rounded-full bg-live" />
              Live
            </Badge>
            <p className="max-w-[70%] rounded-full bg-fg/55 px-3 py-1.5 text-right text-sm font-medium text-accent-fg tabular-nums">
              {stats.watching} watching
              {stats.ok ? ` · ${stats.ok} can see & hear` : ""}
              {stats.trouble ? ` · ${stats.trouble} trouble` : ""}
            </p>
          </div>
          <div
            className="flex flex-wrap items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button type="button" variant="secondary" onClick={stopAll}>
              <Square />
              Stop
            </Button>
            <Button type="button" variant="secondary" onClick={() => void flip()}>
              <FlipHorizontal2 />
              Flip
            </Button>
            <Button type="button" variant="secondary" onClick={() => void onTorch()}>
              {torch ? <FlashlightOff /> : <Flashlight />}
              {torch ? "Light off" : "Light"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void copyLink()}>
              <Copy />
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="relative aspect-[9/16] max-h-[70vh] bg-raised sm:aspect-video">
        {preview}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg/75 px-6 text-center">
          <p className="font-serif text-2xl text-fg">Ready when you are</p>
          <p className="max-w-sm text-sm text-muted">
            Go live fills this phone’s screen. Guests only watch the link. Keep the phone
            plugged in and this page open.
          </p>
        </div>
      </div>
      {error ? <p className="px-4 pt-3 text-sm text-warn">{error}</p> : null}
      <div className="p-3">
        <Button
          type="button"
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
