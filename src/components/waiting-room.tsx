import { eventConfig } from "@/lib/event-config";

export function WaitingRoom({
  status = "waiting",
}: {
  status?: "waiting" | "reconnecting" | "full";
}) {
  const copy =
    status === "reconnecting"
      ? {
          title: "Reconnecting",
          body: "The live feed dropped. Stay on this page — the picture comes back on its own.",
        }
      : status === "full"
        ? {
            title: "The room is full",
            body: "About 200 people are already watching. Stay here — a seat opens as soon as someone leaves.",
          }
        : {
            title: "The stream will begin shortly",
            body: "Leave this page open. When the event goes live, the picture appears here.",
          };
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-raised px-5 py-8 text-center sm:gap-3 sm:px-6">
      <span className="wait-dot size-1.5 rounded-full bg-muted" aria-hidden="true" />
      <p className="font-serif text-xl text-fg sm:text-3xl">{copy.title}</p>
      <p className="max-w-md text-sm leading-relaxed text-muted">{copy.body}</p>
      <p className="text-xs tracking-widest text-subtle uppercase">{eventConfig.productName}</p>
    </div>
  );
}
