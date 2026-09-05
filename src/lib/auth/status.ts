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
  /** Which backend each social id can use (null = not set up). Host UI only offers Google. */
  socialMethods: SocialMethods;
  /** Convenience flags for Android / older clients. Apple/X stay false unless env is set. */
  providers: {
    apple: boolean;
    google: boolean;
    twitter: boolean;
  };
  secretStable: boolean;
};
