import type { AuthSetupStatus } from "@/lib/auth/status";

const VERCEL_STEPS = [
  "Open the Vercel project → Settings → Environment Variables.",
  "Set DATABASE_URL to a Postgres URL (Neon is fine). Enable it for Production and Preview.",
  "Set BETTER_AUTH_SECRET to a long random string. Same environments.",
  "Redeploy the Preview (and Production) so the new values load.",
];

export function AuthSetupPanel({
  status,
  unreachable,
}: {
  status: AuthSetupStatus | null;
  unreachable: boolean;
}) {
  const title = unreachable
    ? "Account service is unreachable"
    : status?.code === "auth_disabled"
      ? "Sign-in is turned off"
      : "Accounts are not ready on this site yet";

  const body = unreachable
    ? "The sign-in page loaded, but this site could not reach its account service. Refresh in a moment. If it keeps happening, the latest deploy may still be starting."
    : status?.message ||
      "Create account and sign in need a database on this deployment. Until that is set, nobody can register.";

  return (
    <div className="mt-8 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-serif text-xl text-fg">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      {!unreachable && status?.code !== "auth_disabled" ? (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs tracking-[0.18em] text-subtle uppercase">
            For whoever manages Vercel
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
            {VERCEL_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-muted">
            Do not turn on Vercel Authentication / Deployment Protection for Production
            if guests need to open the site without a Vercel login. Preview protection
            can stay on for private drafts.
          </p>
        </div>
      ) : null}
    </div>
  );
}
