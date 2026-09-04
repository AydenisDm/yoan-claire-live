import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { eventConfig } from "@/lib/event-config";

/**
 * The Remix / "Created with Grok" chip is injected by the platform. Hiding it
 * is a project setting, not a CSS change. On auth screens we only: keep form
 * controls clear of it, and add an accessible name if the chip has none.
 */
function nameBrandChip() {
  if (typeof document === "undefined") return;
  for (const el of document.querySelectorAll("a, button")) {
    if (!(el instanceof HTMLElement)) continue;
    const style = getComputedStyle(el);
    if (style.position !== "fixed") continue;
    const right = Number.parseFloat(style.right);
    if (!Number.isFinite(right) || right > 64) continue;
    const named =
      el.getAttribute("aria-label")?.trim() ||
      el.getAttribute("title")?.trim() ||
      el.textContent?.trim();
    if (!named) el.setAttribute("aria-label", "Created with Grok");
  }
}

export function AccountScreen({
  title,
  subtitle,
  guestCta = false,
  children,
}: {
  title: string;
  subtitle: string;
  guestCta?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    nameBrandChip();
    const timer = window.setTimeout(nameBrandChip, 800);
    const observer = new MutationObserver(nameBrandChip);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-start px-5 pr-16 pt-[max(3.5rem,calc(env(safe-area-inset-top)+2rem))] pb-28 sm:justify-center sm:pr-8">
      <p className="mb-2 text-center text-xs tracking-[0.28em] text-subtle uppercase">
        {eventConfig.productName}
      </p>
      <h1 className="text-center font-serif text-4xl text-fg">{title}</h1>
      <p className="mx-auto mt-3 max-w-sm text-center text-sm text-muted">{subtitle}</p>
      {guestCta ? (
        <div className="mt-8 space-y-2">
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link to="/">Watch as guest</Link>
          </Button>
          <p className="text-center text-xs text-subtle">No account. You only watch.</p>
        </div>
      ) : null}
      {children}
      {!guestCta ? (
        <p className="mt-10 text-center">
          <Link to="/" className="text-sm text-muted underline-offset-4 hover:underline">
            Watch as guest
          </Link>
        </p>
      ) : null}
    </main>
  );
}
