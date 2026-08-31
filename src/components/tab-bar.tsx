import { Link } from "@tanstack/react-router";
import { Clapperboard, MessageCircleHeart, Radio, Tv } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", key: "watch", label: "Watch", Icon: Tv },
  { to: "/host", key: "live", label: "Live", Icon: Radio },
  { to: "/archive", key: "archive", label: "Archive", Icon: Clapperboard },
  { to: "/feedback", key: "hub", label: "Hub", Icon: MessageCircleHeart },
] as const;

export function TabBar({ active }: { active: "watch" | "live" | "archive" | "hub" }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-stretch justify-around pt-1">
        {items.map(({ to, key, label, Icon }) => (
          <Link
            key={key}
            to={to}
            className={cn(
              "flex min-h-12 min-w-14 flex-col items-center justify-center gap-0.5 px-2 text-xs font-medium",
              active === key ? "text-fg" : "text-subtle",
            )}
          >
            <Icon className="size-5" strokeWidth={active === key ? 2.2 : 1.8} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
