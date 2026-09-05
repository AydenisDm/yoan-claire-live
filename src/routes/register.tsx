import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AccountScreen } from "@/components/account-screen";
import { AuthSetupPanel } from "@/components/auth-setup-panel";
import { FormAlert, PasswordField, TextField } from "@/components/field";
import { SocialSignIn } from "@/components/social-sign-in";
import { Button } from "@/components/ui/button";
import { confirmFieldError, emailFieldError, passwordFieldError } from "@/lib/auth-form";
import { authClient, authEnabled, signInSocial } from "@/lib/auth/client";
import { describeAuthError } from "@/lib/auth/email-errors";
import type { SocialId } from "@/lib/auth/social-providers";
import { useAuthSetup } from "@/lib/auth/use-auth-setup";

export const Route = createFileRoute("/register")({ component: Register });

type FieldKey = "name" | "email" | "password" | "confirm";

function Register() {
  const navigate = useNavigate();
  const { status, loading, unreachable } = useAuthSetup();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const setupBlocked = unreachable || (status != null && !status.ok);

  const clearField = (key: FieldKey) => {
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSocial = async (id: SocialId) => {
    setFormError(null);
    setBusy(id);
    try {
      await signInSocial(id, {
        callbackURL: "/host",
        errorCallbackURL: "/register",
        via: status?.socialMethods?.[id] ?? null,
      });
    } catch (err) {
      setFormError(describeAuthError(err, "Could not continue with that account."));
    } finally {
      setBusy(null);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<FieldKey, string>> = {
      email: emailFieldError(email) ?? undefined,
      password: passwordFieldError(password, { creating: true }) ?? undefined,
      confirm: confirmFieldError(password, confirm) ?? undefined,
    };
    setFieldErrors(next);
    setFormError(null);
    if (next.email || next.password || next.confirm) return;
    setBusy("email");
    try {
      const trimmedEmail = email.trim();
      const display = name.trim() || trimmedEmail.split("@")[0] || "Host";
      const { error: fail } = await authClient.signUp.email({
        email: trimmedEmail,
        password,
        name: display,
      });
      if (fail) {
        throw Object.assign(new Error(fail.message ?? "Could not create the account."), {
          code: fail.code,
        });
      }
      try {
        await authClient.getSession();
      } catch {
        // session store recovers
      }
      await navigate({ to: "/host", replace: true, viewTransition: true });
    } catch (err) {
      setFormError(describeAuthError(err, "Could not create the account."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AccountScreen
      title="Create camera account"
      subtitle="Continue with Google or register with email. Guests watch without signing in."
    >
      {!authEnabled ? (
        <p className="mt-8 text-center text-sm text-muted">Registration is disabled.</p>
      ) : loading ? (
        <p className="mt-8 text-center text-sm text-muted">Checking account service…</p>
      ) : setupBlocked ? (
        <AuthSetupPanel status={status} unreachable={unreachable} />
      ) : (
        <div className="mt-8 space-y-4">
          <SocialSignIn busy={busy} onPick={(id) => void onSocial(id)} />
          <FormAlert>{formError}</FormAlert>
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs tracking-wide text-subtle uppercase">or email</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-4">
            <TextField
              id="register-name"
              label="Your name"
              hint="Shown on this device. Optional."
              type="text"
              autoComplete="name"
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearField("name");
              }}
              maxLength={80}
              error={fieldErrors.name}
            />
            <TextField
              id="register-email"
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              name="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearField("email");
              }}
              error={fieldErrors.email}
            />
            <PasswordField
              id="register-password"
              label="Password"
              hint="At least 8 characters."
              autoComplete="new-password"
              name="password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                clearField("password");
                if (confirm) clearField("confirm");
              }}
              error={fieldErrors.password}
            />
            <PasswordField
              id="register-confirm"
              label="Confirm password"
              autoComplete="new-password"
              name="confirm-password"
              value={confirm}
              onChange={(value) => {
                setConfirm(value);
                clearField("confirm");
              }}
              error={fieldErrors.confirm}
            />
            <Button type="submit" size="lg" className="w-full" disabled={Boolean(busy)}>
              {busy === "email" ? "Creating account…" : "Create camera account"}
            </Button>
            <p className="pt-1 text-center text-sm text-muted">
              Already have an account?{" "}
              <Link
                to="/login"
                viewTransition
                className="text-fg underline-offset-4 transition-colors duration-quick ease-snappy hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      )}
    </AccountScreen>
  );
}
