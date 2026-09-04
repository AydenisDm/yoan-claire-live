/** Map Better Auth / fetch failures to a short host-facing sentence. */

const ALREADY_EXISTS = /already exists|user.?already|duplicate/i;
const BAD_CREDENTIALS = /invalid (email|password)|incorrect|did not match|unauthorized|invalid_email_or_password/i;
const TOO_SHORT = /too short|min(imum)? password|at least/i;
const ORIGIN = /invalid origin/i;
const NETWORK = /failed to fetch|networkerror|load failed/i;

export function describeAuthError(err: unknown, fallback: string): string {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err && "message" in err
        ? String((err as { message: unknown }).message ?? "")
        : String(err ?? "");
  if (ORIGIN.test(message)) {
    return "This site is not allowed to create a session from this address. Try again in a moment.";
  }
  if (ALREADY_EXISTS.test(message)) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (TOO_SHORT.test(message)) {
    return "Use at least 8 characters for the password.";
  }
  if (BAD_CREDENTIALS.test(message)) {
    return "Email or password did not match.";
  }
  if (NETWORK.test(message)) {
    return "Could not reach the account service. Check your connection and try again.";
  }
  return message.trim() || fallback;
}
