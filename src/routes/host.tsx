import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { GoLive } from "@/components/go-live";
import { TabBar } from "@/components/tab-bar";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { eventConfig } from "@/lib/event-config";
import { guestSharePayload } from "@/lib/guest-share";
import { copyWatchLink, shareWatchLink } from "@/lib/live-broadcast";
import { useLiveSetup } from "@/lib/live-setup";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/host")({ ssr: false, component: HostPage });

function HostPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <main className="min-h-dvh bg-bg px-5 pt-[max(2rem,env(safe-area-inset-top))]">
        <p className="text-sm text-muted">Loading account…</p>
      </main>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <HostConsole />;
}

function HostConsole() {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const { status: liveSetup, loading: liveLoading } = useLiveSetup();
  const share = guestSharePayload();
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === "function");
  }, []);

  const markOk = (kind: "copied" | "shared") => {
    setCopyError(false);
    if (kind === "copied") {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    }
  };

  const copyWatch = async () => {
    const result = await copyWatchLink();
    if (result === "failed") {
      setCopyError(true);
      setCopied(false);
      return;
    }
    if (result === "cancelled") return;
    markOk(result === "shared" ? "shared" : "copied");
  };

  const shareWatch = async () => {
    const result = await shareWatchLink();
    if (result === "failed") {
      setCopyError(true);
      return;
    }
    if (result === "cancelled") return;
    markOk(result === "copied" ? "copied" : "shared");
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-28 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.28em] text-subtle uppercase">{eventConfig.productName}</p>
          <h1 className="font-serif text-3xl text-fg sm:text-4xl">Live</h1>
          <p className="mt-1 text-sm text-muted">Film from this iPhone. Guests only watch.</p>
        </div>
        <UserButton />
      </header>

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <h2 className="font-serif text-xl text-fg">EventView guest link</h2>
        <p className="mt-1 text-sm text-muted">
          Copy or share this EventView invite. Guests never sign in. The address stays
          the production site; the message is what they see.
        </p>
        <textarea
          readOnly
          value={share.text}
          aria-label="EventView guest invite"
          rows={2}
          className={cn(
            "mt-4 min-h-16 w-full resize-none rounded-md border border-border bg-raised px-3 py-2",
            "text-base leading-relaxed text-fg shadow-none outline-none",
            "focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/30",
          )}
          onFocus={(e) => e.currentTarget.select()}
        />
        <p className="mt-2 text-xs text-subtle">
          The production address is unchanged — only the invite wording says EventView.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="button" onClick={() => void copyWatch()} className="w-full sm:w-auto">
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy invite"}
          </Button>
          {canNativeShare ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void shareWatch()}
              className="w-full sm:w-auto"
            >
              {shared ? <Check /> : <Share2 />}
              {shared ? "Opened share" : "Share"}
            </Button>
          ) : null}
        </div>
        {copyError ? (
          <p className="mt-2 text-sm text-warn">
            Copy failed. Select the EventView invite and share it yourself.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-fg">Go live</h2>
        <p className="text-sm text-muted">
          One tap fills the screen. Keep the phone plugged in. The room holds about 200
          guests. A hotspot beats packed venue Wi-Fi.
        </p>
        {!liveLoading && liveSetup && !liveSetup.configured ? (
          <p className="rounded-xl border border-border bg-raised px-4 py-3 text-sm text-warn">
            The live room is not connected on this deployment yet. Add LIVEKIT_URL,
            LIVEKIT_API_KEY, and LIVEKIT_API_SECRET on Vercel for Production and Preview,
            then redeploy. Guests can still open the watch page and wait.
          </p>
        ) : null}
        {!liveLoading && liveSetup?.configured ? (
          <p className="text-xs text-subtle">
            Live room ready{liveSetup.room ? ` · ${liveSetup.room}` : ""}. Signed in is
            enough — tap Go live.
          </p>
        ) : null}
        <GoLive />
      </section>
      <TabBar active="live" />
    </main>
  );
}
