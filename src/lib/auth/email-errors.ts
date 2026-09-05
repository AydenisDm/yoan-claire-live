/** Map Better Auth / fetch failures to a short host-facing sentence. */

const ALREADY_EXISTS = /already exists|user.?already|duplicate/i;
const BAD_CREDENTIALS = /invalid (email|password)|incorrect|did not match|unauthorized|invalid_email_or_password/i;
const TOO_SHORT = /too short|min(imum)? password|at least/i;
const ORIGIN = /invalid origin/i;
const NETWORK = /failed to fetch|networkerror|load failed/i;
const MISSING_DB =
  /missing_database|DATABASE_URL|cannot save accounts|pglite|required on Vercel/i;
const DB_DOWN = /database_error|account database is not reachable|ECONNREFUSED|connection refused|timeout/i;
const SERVER = /internal.?server|AUTH_ERROR|unexpected/i;
const OAUTH_DENIED = /access_denied|cancelled|user.?denied|oauth.*denied/i;
const SOCIAL_SETUP = /not set up on this site yet/i;

export function describeAuthError(err: unknown, fallback: string): string {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err && "message" in err
        ? String((err as { message: unknown }).message ?? "")
        : String(err ?? "");
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code: unknown }).code ?? "")
      : "";
  const blob = `${code} ${message}`;
  if (ORIGIN.test(blob)) {
    return "This site is not allowed to create a session from this address. Try again in a moment.";
  }
  if (MISSING_DB.test(blob)) {
    return "This site cannot save accounts yet. It needs a Postgres database on Vercel (DATABASE_URL) and a session secret (BETTER_AUTH_SECRET), then a redeploy.";
  }
  if (DB_DOWN.test(blob)) {
    return "The account database is not reachable. Try again in a moment, or check DATABASE_URL on Vercel.";
  }
  if (ALREADY_EXISTS.test(blob)) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (TOO_SHORT.test(blob)) {
    return "Use at least 8 characters for the password.";
  }
  if (BAD_CREDENTIALS.test(blob)) {
    return "Email or password did not match.";
  }
  if (SOCIAL_SETUP.test(blob)) {
    return message.trim() || fallback;
  }
  if (OAUTH_DENIED.test(blob)) {
    return "That sign-in was cancelled.";
  }
  if (NETWORK.test(blob)) {
    return "Could not reach the account service. Check your connection and try again.";
  }
  if (SERVER.test(blob)) {
    return "The account service hit an error. Try again in a moment.";
  }
  return message.trim() || fallback;
}
