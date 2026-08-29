import { eventConfig } from "@/lib/event-config";

export function WaitingRoom({ status = "waiting" }: { status?: "waiting" | "reconnecting" }) {
  const title = status === "reconnecting" ? "Reconnecting" : "The stream will begin shortly";
  const copy =
    status === "reconnecting"
      ? "The live feed dropped for a moment. Holding this page open — we will restore the picture automatically."
      : "You are in the right place. Leave this page open. When the event goes live, the picture will appear here.";
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 bg-raised px-6 text-center">
      <span className="wait-dot size-1.5 rounded-full bg-muted" aria-hidden="true" />
      <p className="font-serif text-2xl text-fg sm:text-3xl">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-muted">{copy}</p>
      <p className="text-xs tracking-widest text-subtle uppercase">{eventConfig.productName}</p>
    </div>
  );
}
