import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AccountScreen } from "@/components/account-screen";
import { AuthSetupPanel } from "@/components/auth-setup-panel";
import { FormAlert, PasswordField, TextField } from "@/components/field";
import { Button } from "@/components/ui/button";
import { emailFieldError, passwordFieldError } from "@/lib/auth-form";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { describeAuthError } from "@/lib/auth/email-errors";
import { useAuthSetup } from "@/lib/auth/use-auth-setup";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const { status, loading, unreachable } = useAuthSetup();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const setupBlocked = unreachable || (status != null && !status.ok);
  const showSocial = Boolean(status?.ok && status.social);

  const afterAuth = async () => {
    try {
      await authClient.getSession();
    } catch {
      // session store recovers
    }
    await navigate({ to: "/host", replace: true });
  };

  const onSocial = async (providerId: string) => {
    setFormError(null);
    setBusy(providerId);
    try {
      await signIn(providerId, { callbackURL: "/host", errorCallbackURL: "/login" });
    } catch (err) {
      setFormError(describeAuthError(err, "Could not continue with that account."));
    } finally {
      setBusy(null);
    }
  };

  const onEmail = async (e: FormEvent) => {
    e.preventDefault();
    const next = {
      email: emailFieldError(email) ?? undefined,
      password: passwordFieldError(password, { creating: false }) ?? undefined,
    };
    setFieldErrors(next);
    setFormError(null);
    if (next.email || next.password) return;
    setBusy("email");
    try {
      const { error: fail } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (fail) {
        throw Object.assign(new Error(fail.message ?? "Email or password did not match."), {
          code: fail.code,
        });
      }
      await afterAuth();
    } catch (err) {
      setFormError(describeAuthError(err, "Could not sign in."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AccountScreen
      title="Host sign in"
      subtitle="Use your camera account to go live. Guests never need an account."
      guestCta
    >
      {!authEnabled ? (
        <p className="mt-8 text-center text-sm text-muted">Sign-in is disabled.</p>
      ) : loading ? (
        <p className="mt-8 text-center text-sm text-muted">Checking account service…</p>
      ) : setupBlocked ? (
        <AuthSetupPanel status={status} unreachable={unreachable} />
      ) : (
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs tracking-wide text-subtle uppercase">Host</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={(e) => void onEmail(e)} noValidate className="space-y-4">
            <TextField
              id="login-email"
              label="Email"
              type="email"
              autoComplete="username"
              inputMode="email"
              name="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              error={fieldErrors.email}
            />
            <PasswordField
              id="login-password"
              label="Password"
              autoComplete="current-password"
              name="password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={fieldErrors.password}
            />
            <p className="text-right text-sm">
              <Link to="/forgot" className="text-muted underline-offset-4 hover:text-fg hover:underline">
                Forgot password?
              </Link>
            </p>
            <FormAlert>{formError}</FormAlert>
            <Button type="submit" size="lg" className="w-full" disabled={Boolean(busy)}>
              {busy === "email" ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="pt-1 text-center text-sm text-muted">
            New here?{" "}
            <Link to="/register" className="text-fg underline-offset-4 hover:underline">
              Create a camera account
            </Link>
          </p>

          {showSocial ? (
            <>
              <div className="flex items-center gap-3 py-2">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs tracking-wide text-subtle uppercase">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
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
            </>
          ) : null}
        </div>
      )}
    </AccountScreen>
  );
}
