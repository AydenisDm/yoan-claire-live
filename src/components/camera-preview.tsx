import { FlipHorizontal2, Flashlight, FlashlightOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function CameraPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [on, setOn] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setOn(false);
    setTorch(false);
  };

  const start = async (mode: "environment" | "user") => {
    setError(null);
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setOn(true);
      setFacing(mode);
      if ("wakeLock" in navigator) {
        await navigator.wakeLock.request("screen").catch(() => undefined);
      }
    } catch {
      setError(
        "Camera permission was declined, or this browser cannot open the camera. Use the YouTube app on this phone to go live instead.",
      );
      setOn(false);
    }
  };

  useEffect(() => () => stop(), []);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torch;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorch(next);
    } catch {
      setError("Torch is not available on this camera.");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="relative aspect-video bg-raised">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {!on ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-serif text-xl text-fg">Frame the ceremony</p>
            <p className="max-w-sm text-sm text-muted">
              This preview stays on this phone. Guests never receive this camera
              feed — they watch the YouTube or HLS stream you start separately.
            </p>
          </div>
        ) : null}
      </div>
      {error ? <p className="px-4 pt-3 text-sm text-warn">{error}</p> : null}
      <div className="flex flex-wrap gap-2 p-3">
        {on ? (
          <Button type="button" variant="secondary" onClick={stop}>
            <VideoOff />
            Close camera
          </Button>
        ) : (
          <Button type="button" onClick={() => void start(facing)}>
            <Video />
            Open camera preview
          </Button>
        )}
        {on ? (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void start(facing === "environment" ? "user" : "environment")}
            >
              <FlipHorizontal2 />
              Flip camera
            </Button>
            <Button type="button" variant="secondary" onClick={() => void toggleTorch()}>
              {torch ? <FlashlightOff /> : <Flashlight />}
              {torch ? "Torch off" : "Torch"}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
