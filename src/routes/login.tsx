import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
} from "@/lib/auth/client";
import { eventConfig } from "@/lib/event-config";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const afterAuth = async () => {
    try {
      await authClient.getSession();
    } catch {
      // session store recovers
    }
    await navigate({ to: "/host" });
  };

  const onSocial = async (providerId: string) => {
    setError(null);
    setBusy(providerId);
    try {
      await signIn(providerId, { callbackURL: "/host", errorCallbackURL: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(null);
    }
  };

  const onEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy("email");
    try {
      if (mode === "up") {
        const { error: fail } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: email.trim().split("@")[0] ?? "Streamer",
        });
        if (fail) throw new Error(fail.message ?? "Could not create the account.");
      } else {
        const { error: fail } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (fail) throw new Error(fail.message ?? "Email or password did not match.");
      }
      await afterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-start px-5 pt-[max(3.5rem,calc(env(safe-area-inset-top)+2rem))] pb-16 sm:justify-center">
      <p className="mb-2 text-center text-xs tracking-[0.28em] text-subtle uppercase">
        {eventConfig.productName}
      </p>
      <h1 className="text-center font-serif text-4xl text-fg">Camera account</h1>
      <p className="mx-auto mt-3 max-w-sm text-center text-sm text-muted">
        Sign in to go live and keep a video archive on this phone. Guests never need an
        account.
      </p>

      {authEnabled ? (
        <div className="mt-8 space-y-3">
          {GROK_PROVIDERS.map((p) => (
            <Button
              key={p.providerId}
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              disabled={Boolean(busy)}
              onClick={() => void onSocial(p.providerId)}
            >
              {busy === p.providerId ? "Opening…" : `Continue with ${p.label}`}
            </Button>
          ))}

          <div className="flex items-center gap-3 py-2">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs tracking-wide text-subtle uppercase">or email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={(e) => void onEmail(e)} className="space-y-3">
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            {error ? <p className="text-sm text-warn">{error}</p> : null}
            <Button type="submit" size="lg" className="w-full" disabled={Boolean(busy)}>
              {busy === "email"
                ? "Please wait…"
                : mode === "up"
                  ? "Create camera account"
                  : "Sign in with email"}
            </Button>
          </form>
          <button
            type="button"
            className="w-full min-h-11 text-sm text-muted"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setError(null);
            }}
          >
            {mode === "in" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-muted">Sign-in is disabled.</p>
      )}

      <p className="mt-10 text-center">
        <Link to="/" className="text-sm text-muted underline-offset-4 hover:underline">
          Back to the watch page
        </Link>
      </p>
    </main>
  );
}
