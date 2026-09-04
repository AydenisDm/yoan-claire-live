import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AccountScreen } from "@/components/account-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, authEnabled } from "@/lib/auth/client";
import { describeAuthError } from "@/lib/auth/email-errors";

export const Route = createFileRoute("/register")({ component: Register });

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for the password.");
      return;
    }
    setBusy(true);
    try {
      const trimmedEmail = email.trim();
      const display = name.trim() || trimmedEmail.split("@")[0] || "Host";
      const { error: fail } = await authClient.signUp.email({
        email: trimmedEmail,
        password,
        name: display,
      });
      if (fail) throw new Error(fail.message ?? "Could not create the account.");
      try {
        await authClient.getSession();
      } catch {
        // session store recovers
      }
      await navigate({ to: "/host" });
    } catch (err) {
      setError(describeAuthError(err, "Could not create the account."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountScreen
      title="Create account"
      subtitle="Register a camera account to go live. Guests watch without signing in."
    >
      {authEnabled ? (
        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-3">
          <Input
            type="text"
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
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
            autoComplete="new-password"
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
          {error ? <p className="text-sm text-warn">{error}</p> : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Creating account…" : "Create camera account"}
          </Button>
          <p className="pt-1 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link to="/login" className="text-fg underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      ) : (
        <p className="mt-8 text-center text-sm text-muted">Registration is disabled.</p>
      )}
    </AccountScreen>
  );
}
