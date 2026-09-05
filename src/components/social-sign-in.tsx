import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SOCIAL_PROVIDERS, type SocialId } from "@/lib/auth/social-providers";

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.437 2.2-1.207 3.02-.834.89-2.21 1.57-3.33 1.48-.146-1.09.4-2.26 1.16-3.04.83-.86 2.27-1.5 3.38-1.46zM20.76 17.4c-.55 1.27-.81 1.83-1.52 2.95-1 1.56-2.4 3.5-4.14 3.52-1.54.03-1.94-.99-4.03-.98-2.1.02-2.54 1.01-4.08.98-1.74-.03-3.07-1.77-4.07-3.33-2.8-4.36-3.09-9.48-1.37-12.2 1.22-1.93 3.15-3.06 4.96-3.06 1.85 0 3.01 1.01 4.54 1.01 1.49 0 2.4-1.02 4.54-1.02 1.62 0 3.33.88 4.54 2.4-3.99 2.19-3.34 7.89.63 9.73z"
      />
    </svg>
  );
}

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

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M14.23 10.16 21.2 2h-1.65l-6.05 7.08L8.66 2H2.2l7.31 10.71L2.2 22h1.65l6.39-7.48L15.34 22h6.46l-7.57-11.84Zm-2.26 2.65-.74-1.06L4.44 3.3h2.54l4.75 6.84.74 1.06 6.18 8.9h-2.54l-5.14-7.4Z"
      />
    </svg>
  );
}

const MARK: Record<SocialId, () => ReactNode> = {
  apple: AppleMark,
  google: GoogleMark,
  twitter: XMark,
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
      {SOCIAL_PROVIDERS.map((provider) => {
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
            <Mark />
            {pending ? "Opening…" : `Continue with ${provider.label}`}
          </Button>
        );
      })}
    </div>
  );
}
