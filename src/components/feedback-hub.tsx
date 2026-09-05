import { useEffect, useState } from "react";
import { TabBar } from "@/components/tab-bar";
import { Button } from "@/components/ui/button";
import { SignedIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { FEEDBACK_GROUPS } from "@/lib/crowd";
import { eventConfig } from "@/lib/event-config";
import { guestIdentity } from "@/lib/live-config";
import { listFeedback, submitFeedback, type FeedbackCount } from "@/lib/feedback";

export function FeedbackHub() {
  const { user, isPending } = useCurrentUserState();
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<FeedbackCount[] | null>(null);

  useEffect(() => {
    if (!user) return;
    void listFeedback()
      .then(setCounts)
      .catch(() => setCounts([]));
  }, [user]);

  const choose = async (kind: string, choice: string) => {
    setPicked((prev) => ({ ...prev, [kind]: choice }));
    try {
      await submitFeedback({ data: { guest: guestIdentity(), kind, choice } });
      if (user) {
        const next = await listFeedback();
        setCounts(next);
      }
    } catch {
      // keep the local pick
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-28 sm:px-6">
      <header>
        <p className="text-xs tracking-[0.28em] text-subtle uppercase">{eventConfig.productName}</p>
        <h1 className="font-serif text-3xl text-fg sm:text-4xl">Feedback hub</h1>
        <p className="mt-1 text-sm text-muted">
          {isPending
            ? "Loading…"
            : user
              ? "What guests are reporting from the watch page."
              : "Tap how the picture looks and sounds. No account needed."}
        </p>
      </header>

      <SignedIn>
        {counts ? <FeedbackCounts counts={counts} /> : null}
      </SignedIn>

      {FEEDBACK_GROUPS.map((group) => (
        <section key={group.kind} className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="font-serif text-xl text-fg">{group.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.options.map((opt) => (
              <Button
                key={opt.id}
                type="button"
                variant={picked[group.kind] === opt.id ? "default" : "secondary"}
                onClick={() => void choose(group.kind, opt.id)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </section>
      ))}
      <TabBar active="hub" />
    </main>
  );
}

function FeedbackCounts({ counts }: { counts: FeedbackCount[] }) {
  const total = counts.reduce((n, row) => n + row.count, 0);
  if (!total) {
    return (
      <p className="rounded-xl border border-border bg-raised px-4 py-3 text-sm text-muted">
        No guest reports yet. They appear here as people tap from the watch page.
      </p>
    );
  }
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="font-serif text-xl text-fg">Live tally</h2>
      <ul className="mt-3 space-y-2">
        {FEEDBACK_GROUPS.map((group) => {
          const rows = group.options
            .map((opt) => ({
              ...opt,
              n: counts.find((c) => c.kind === group.kind && c.choice === opt.id)?.count ?? 0,
            }))
            .filter((r) => r.n > 0);
          if (!rows.length) return null;
          return (
            <li key={group.kind} className="text-sm">
              <span className="text-muted">{group.title}: </span>
              <span className="text-fg">
                {rows.map((r) => `${r.label} ${r.n}`).join(" · ")}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
