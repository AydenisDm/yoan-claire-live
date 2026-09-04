import { createHash } from "node:crypto";

export type EnvMap = Record<string, string | undefined>;

/**
 * Session signing secret for Better Auth.
 *
 * On Vercel each serverless instance is a separate process. A random
 * per-process fallback (fine for local PGLite) makes sign-up appear to work
 * then fail on the next request, because the cookie was signed by a different
 * instance. Prefer an explicit `BETTER_AUTH_SECRET`. If that is missing but
 * `DATABASE_URL` is set, derive a stable secret from it so every lambda of this
 * deployment shares one key. Local preview without a database still uses the
 * process-stable random fallback.
 */
export function resolveAuthSecret(
  source: EnvMap,
  previewFallback: () => string,
): { secret: string; stable: boolean } {
  const explicit = source.BETTER_AUTH_SECRET?.trim();
  if (explicit) return { secret: explicit, stable: true };

  const databaseUrl = source.DATABASE_URL?.trim();
  if (databaseUrl) {
    return {
      secret: createHash("sha256")
        .update(`eventview.better-auth:${databaseUrl}`)
        .digest("hex"),
      stable: true,
    };
  }

  return { secret: previewFallback(), stable: false };
}
