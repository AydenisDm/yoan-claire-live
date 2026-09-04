/**
 * Resolve the Postgres URL from any of the names Vercel / Neon / Marketplace
 * actually inject. A project can have a working database as POSTGRES_URL while
 * DATABASE_URL is empty — that used to look like "no database" and crashed or
 * showed the setup screen even though Postgres was there.
 *
 * Shared by `scripts/migrate.mjs` (build) and `src/lib/db.ts` (runtime).
 */

/** @type {readonly string[]} */
export const DATABASE_URL_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "NEON_DATABASE_URL",
];

/**
 * @param {Record<string, string | undefined>} [source]
 * @returns {{ url: string, key: string } | { url: undefined, key: undefined }}
 */
export function resolveDatabaseUrl(source = process.env) {
  for (const key of DATABASE_URL_KEYS) {
    const value = source[key]?.trim();
    if (value) return { url: value, key };
  }
  return { url: undefined, key: undefined };
}
