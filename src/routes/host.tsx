import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { GoLive } from "@/components/go-live";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eventConfig } from "@/lib/event-config";
import { rememberHostPassword } from "@/lib/live-broadcast";
import { HOST_GATE_KEY, HOST_PW_KEY } from "@/lib/live-config";

export const Route = createFileRoute("/host")({ ssr: false, component: HostPage });

function HostPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [gateError, setGateError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(HOST_GATE_KEY) === "1" && sessionStorage.getItem(HOST_PW_KEY)) {
      setAuthed(true);
    }
  }, []);

  const unlock = async (e: FormEvent) => {
    e.preventDefault();
    setGateError(false);
    try {
      const res = await fetch("/api/live", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "host", password, check: true }),
      });
      const body = (await res.json()) as { error?: string; ok?: boolean };
      if (res.status === 401 || body.error === "unauthorized") {
        setGateError(true);
        return;
      }
      if (!res.ok && body.error !== "not_configured") {
        setGateError(true);
        return;
      }
      sessionStorage.setItem(HOST_GATE_KEY, "1");
      rememberHostPassword(password);
      setAuthed(true);
    } catch {
      setGateError(true);
    }
  };

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-start px-5 pt-16 pb-12 sm:justify-center sm:pt-12">
        <p className="mb-2 text-center text-xs tracking-[0.28em] text-subtle uppercase">
          Streamer only
        </p>
        <h1 className="mb-6 text-center font-serif text-4xl text-fg">
          Go live for {eventConfig.coupleNames}
        </h1>
        <form onSubmit={(e) => void unlock(e)} className="space-y-3">
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Host password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={gateError}
          />
          {gateError ? <p className="text-sm text-warn">That password does not match.</p> : null}
          <Button type="submit" className="w-full" size="lg">
            Continue
          </Button>
        </form>
        <p className="mt-8 text-center text-xs text-subtle">
          Guests never see this page. They only get the watch link you copy after signing in here.
        </p>
        <p className="mt-4 text-center">
          <Link to="/" className="text-sm text-muted underline-offset-4 hover:underline">
            Back to the ceremony
          </Link>
        </p>
      </main>
    );
  }

  return <HostConsole />;
}

function HostConsole() {
  const [copied, setCopied] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const watchUrl = typeof window === "undefined" ? "/" : `${window.location.origin}/`;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/live")
      .then((r) => r.json())
      .then((body: { configured?: boolean }) => {
        if (!cancelled) setConfigured(Boolean(body.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copyWatch = async () => {
    try {
      await navigator.clipboard.writeText(watchUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-8 pb-24 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.28em] text-subtle uppercase">Streamer controls</p>
          <h1 className="font-serif text-3xl text-fg sm:text-4xl">{eventConfig.coupleNames}</h1>
          <p className="mt-1 text-sm text-muted">{eventConfig.eventDate}</p>
        </div>
        <Link to="/" className="text-sm text-muted underline-offset-4 hover:underline">
          Preview guest view
        </Link>
      </header>

      {configured === false ? (
        <section className="rounded-xl border border-border bg-raised px-4 py-3 text-sm text-muted">
          The live room is not connected yet. Add your LiveKit Cloud project URL, API key, and
          API secret to this site’s server settings, then refresh. Guests can still open the
          watch link and will see the waiting room until you go live.
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <h2 className="font-serif text-xl text-fg">Guest watch link</h2>
        <p className="mt-1 text-sm text-muted">
          Send this. Relatives only watch. The live picture stays on this site — not posted
          publicly.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input readOnly value={watchUrl} aria-label="Watch link" />
          <Button type="button" onClick={() => void copyWatch()} className="sm:w-40">
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-fg">Go live from this phone</h2>
        <p className="text-sm text-muted">
          One tap. This phone publishes once; guests subscribe from the live room. Keep this
          page open. A phone hotspot is still the most stable if venue Wi-Fi is packed. Plug
          the phone in.
        </p>
        <GoLive />
      </section>
    </main>
  );
}
