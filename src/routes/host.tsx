import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { GoLive } from "@/components/go-live";
import { TabBar } from "@/components/tab-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { eventConfig } from "@/lib/event-config";
import { copyWatchLink } from "@/lib/live-broadcast";
import { useLiveSetup } from "@/lib/live-setup";

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
  const [copyError, setCopyError] = useState(false);
  const { status: liveSetup, loading: liveLoading } = useLiveSetup();
  const watchUrl = typeof window === "undefined" ? "/" : `${window.location.origin}/`;

  const copyWatch = async () => {
    const result = await copyWatchLink();
    if (result === "failed") {
      setCopyError(true);
      setCopied(false);
      return;
    }
    if (result === "cancelled") return;
    setCopyError(false);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
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
        <h2 className="font-serif text-xl text-fg">Guest watch link</h2>
        <p className="mt-1 text-sm text-muted">
          Send this. Guests never sign in. Stopping a live saves a clip to Archive on this
          phone.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            readOnly
            value={watchUrl}
            aria-label="Watch link"
            className="min-w-0 flex-1"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button type="button" onClick={() => void copyWatch()} className="w-full shrink-0 sm:w-auto">
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
        {copyError ? (
          <p className="mt-2 text-sm text-warn">Copy failed. Select the link and share it yourself.</p>
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
