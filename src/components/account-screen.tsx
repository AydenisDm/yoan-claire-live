import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { eventConfig } from "@/lib/event-config";

export function AccountScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-start px-5 pt-[max(3.5rem,calc(env(safe-area-inset-top)+2rem))] pb-16 sm:justify-center">
      <p className="mb-2 text-center text-xs tracking-[0.28em] text-subtle uppercase">
        {eventConfig.productName}
      </p>
      <h1 className="text-center font-serif text-4xl text-fg">{title}</h1>
      <p className="mx-auto mt-3 max-w-sm text-center text-sm text-muted">{subtitle}</p>
      {children}
      <p className="mt-10 text-center">
        <Link to="/" className="text-sm text-muted underline-offset-4 hover:underline">
          Back to the watch page
        </Link>
      </p>
    </main>
  );
}
