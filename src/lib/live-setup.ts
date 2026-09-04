import { useEffect, useState } from "react";

export type LiveSetupStatus = {
  configured: boolean;
  room?: string;
};

export function useLiveSetup(): {
  status: LiveSetupStatus | null;
  loading: boolean;
} {
  const [status, setStatus] = useState<LiveSetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/live", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as LiveSetupStatus;
        if (!cancelled) {
          setStatus({
            configured: Boolean(data.configured),
            room: typeof data.room === "string" ? data.room : undefined,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setStatus({ configured: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, loading };
}
