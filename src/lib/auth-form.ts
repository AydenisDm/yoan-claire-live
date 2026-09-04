export function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function emailFieldError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Enter your email.";
  if (!looksLikeEmail(trimmed)) return "Enter a valid email address.";
  return null;
}

export function passwordFieldError(value: string, { creating }: { creating: boolean }) {
  if (!value) return creating ? "Choose a password." : "Enter your password.";
  if (creating && value.length < 8) return "Use at least 8 characters.";
  return null;
}

export function confirmFieldError(password: string, confirm: string) {
  if (!confirm) return "Confirm your password.";
  if (password !== confirm) return "Those passwords do not match.";
  return null;
}
