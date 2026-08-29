import { Link } from "@tanstack/react-router";
import { LivePlayer } from "@/components/live-player";
import { eventConfig } from "@/lib/event-config";
import { parsePlayback } from "@/lib/playback";

export function WatchView() {
  const playback = parsePlayback(eventConfig.playbackUrl);
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col px-4 pt-4 pb-24 sm:px-6 sm:pt-8">
      <header className="relative mb-8 text-center">
        <Link
          to="/host"
          className="absolute top-0 right-0 z-10 inline-flex min-h-11 items-center text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          Streamer
        </Link>
        <p className="mb-3 pt-10 text-xs tracking-[0.28em] text-subtle uppercase sm:pt-0">
          {eventConfig.kicker}
        </p>
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
          Tap the picture for sound. Rotate your phone for a larger view. You do not need an
          account.
        </p>
        <p className="text-xs leading-relaxed text-subtle">
          If the picture pauses, stay on this page — it reconnects on its own.
        </p>
      </section>
    </main>
  );
}
