/** Client-safe auth setup contract. The server fills this at `/api/auth/status`. */

import type { SocialMethods } from "./social-providers";

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
  /** True when at least one social method can complete on this host. */
  social: boolean;
  /** Which backend each EventView social button should use (null = not set up). */
  socialMethods: SocialMethods;
  /** Convenience flags for Android / older clients. */
  providers: {
    apple: boolean;
    google: boolean;
    twitter: boolean;
  };
  secretStable: boolean;
};
