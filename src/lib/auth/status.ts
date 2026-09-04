/** Client-safe auth setup contract. The server fills this at `/api/auth/status`. */

export type AuthSetupCode =
  | "ready"
  | "missing_database"
  | "database_error"
  | "auth_disabled";

export type AuthSetupStatus = {
  ok: boolean;
  code: AuthSetupCode;
  /** Short sentence shown on the sign-in / register screens. */
  message: string;
  persist: "postgres" | "pglite" | "none";
  emailPassword: boolean;
  /** Google / X via the Grok broker — only when this host can complete OAuth. */
  social: boolean;
  secretStable: boolean;
};
