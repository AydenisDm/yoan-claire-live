import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { HOST_SOCIAL_PROVIDERS, type SocialId } from "@/lib/auth/social-providers";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.74-.06-1.28-.2-1.84H12v3.34h5.4c-.11.9-.7 2.26-2.02 3.18l-.02.12 2.94 2.22.2.02c1.86-1.68 2.94-4.16 2.94-7.04z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 4.96-.88 6.62-2.4l-3.15-2.38c-.84.58-1.97 1-3.47 1-2.65 0-4.9-1.73-5.7-4.14l-.12.01-3.08 2.33-.04.11C4.69 19.88 8.09 22 12 22z"
      />
      <path
        fill="currentColor"
        d="M6.3 13.09A6.6 6.6 0 0 1 5.94 12c0-.38.06-.75.1-1.09l-.01-.12-3.12-2.36-.1.05A9.96 9.96 0 0 0 2 12c0 1.61.4 3.14 1.1 4.48l3.2-3.39z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.88 0 3.14.8 3.86 1.46l2.82-2.7C16.95 2.53 14.7 1.5 12 1.5 8.09 1.5 4.69 3.62 3.2 7.52l3.2 2.4C7.1 7.5 9.35 5.38 12 5.38z"
      />
    </svg>
  );
}

const MARK: Partial<Record<SocialId, () => ReactNode>> = {
  google: GoogleMark,
};

export function SocialSignIn({
  busy,
  onPick,
}: {
  busy: string | null;
  onPick: (id: SocialId) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-center text-xs tracking-[0.18em] text-subtle uppercase">
        Continue with
      </p>
      {HOST_SOCIAL_PROVIDERS.map((provider) => {
        const Mark = MARK[provider.id];
        const pending = busy === provider.id;
        return (
          <Button
            key={provider.id}
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={Boolean(busy)}
            onClick={() => onPick(provider.id)}
          >
            {Mark ? <Mark /> : null}
            {pending ? "Opening…" : `Continue with ${provider.label}`}
          </Button>
        );
      })}
    </div>
  );
}
