import { useState } from "react";
import { CHAT_OPTIONS, type ChatLine } from "@/lib/crowd";
import { cn } from "@/lib/utils";

export function GuestChat({
  lines,
  onSend,
  disabled,
}: {
  lines: ChatLine[];
  onSend: (id: string) => boolean;
  disabled?: boolean;
}) {
  const [cool, setCool] = useState(false);
  const [mine, setMine] = useState<string | null>(null);

  const send = (id: string) => {
    if (cool || disabled) return;
    const ok = onSend(id);
    if (!ok) {
      setCool(true);
      window.setTimeout(() => setCool(false), 8000);
      return;
    }
    setMine(id);
    setCool(true);
    window.setTimeout(() => setCool(false), 8000);
  };

  const recent = lines.slice(-6).reverse();

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="font-serif text-xl text-fg">Send a note</h2>
      <p className="mt-1 text-sm text-muted">Tap one. Guests and the streamer can see it. No typing.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {CHAT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled || cool}
            onClick={() => send(opt.id)}
            className={cn(
              "min-h-11 rounded-full border px-4 text-sm",
              mine === opt.id
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-raised text-fg",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {cool ? (
        <p className="mt-3 text-xs text-subtle">Wait a moment before sending another.</p>
      ) : null}
      {recent.length ? (
        <ul className="mt-4 space-y-1.5">
          {recent.map((line, i) => (
            <li key={`${line.at}-${i}`} className="text-sm text-muted">
              <span className="text-fg">{line.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
