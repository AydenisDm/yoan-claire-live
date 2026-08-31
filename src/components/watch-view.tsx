import { LivePlayer } from "@/components/live-player";
import { TabBar } from "@/components/tab-bar";
import { eventConfig } from "@/lib/event-config";
import { parsePlayback } from "@/lib/playback";

export function WatchView() {
  const playback = parsePlayback(eventConfig.playbackUrl);
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28 sm:px-6 sm:pt-8">
      <header className="mb-6 text-center">
        <p className="mb-3 text-xs tracking-[0.28em] text-subtle uppercase">{eventConfig.kicker}</p>
        <h1 className="font-serif text-4xl leading-tight text-fg sm:text-5xl">
          {eventConfig.eventName}
        </h1>
        {eventConfig.eventDate ? (
          <p className="mt-3 text-sm text-muted">{eventConfig.eventDate}</p>
        ) : null}
      </header>
      <LivePlayer playback={playback} />
      <section className="mt-6 space-y-3 text-center">
        <p className="text-sm text-muted">
          When the picture appears, tap for sound. Rotate for a larger view.
        </p>
        <p className="text-xs leading-relaxed text-subtle">
          If the picture pauses, stay on this page — it reconnects on its own.
        </p>
      </section>
      <TabBar active="watch" />
    </main>
  );
}
