import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  children,
}: {
  className?: string;
  tone?: "muted" | "live" | "warn";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide",
        tone === "live" && "bg-live/20 text-live",
        tone === "warn" && "bg-warn/15 text-warn",
        tone === "muted" && "bg-raised text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
