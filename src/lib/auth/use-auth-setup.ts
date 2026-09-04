import { useEffect, useState } from "react";
import type { AuthSetupStatus } from "./status";

export function useAuthSetup(): {
  status: AuthSetupStatus | null;
  loading: boolean;
  unreachable: boolean;
} {
  const [status, setStatus] = useState<AuthSetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/status", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as AuthSetupStatus;
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setUnreachable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, loading, unreachable };
}
