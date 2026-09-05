import { Download, Share2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { TabBar } from "@/components/tab-bar";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { deleteClipBlob, loadClipBlob } from "@/lib/archive-db";
import { eventConfig } from "@/lib/event-config";
import {
  deleteRecording,
  listRecordings,
  type RecordingRow,
} from "@/lib/recordings";

function formatDuration(ms: number) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ArchiveView() {
  const { user, isPending } = useCurrentUserState();
  const [rows, setRows] = useState<RecordingRow[] | null>(null);
  const [active, setActive] = useState<{ id: string; url: string } | null>(null);
  const [missing, setMissing] = useState<string | null>(null);

  const refresh = () =>
    listRecordings()
      .then(setRows)
      .catch(() => setRows([]));

  useEffect(() => {
    if (!user) return;
    void refresh();
    return () => {
      if (active) URL.revokeObjectURL(active.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (isPending) {
    return (
      <main className="min-h-dvh bg-bg px-5 pt-[max(2rem,env(safe-area-inset-top))]">
        <p className="text-sm text-muted">Loading account…</p>
      </main>
    );
  }
  if (!user) return <RedirectToSignIn />;

  const play = async (id: string) => {
    if (active) URL.revokeObjectURL(active.url);
    const blob = await loadClipBlob(id);
    if (!blob) {
      setActive(null);
      setMissing(id);
      return;
    }
    setMissing(null);
    setActive({ id, url: URL.createObjectURL(blob) });
  };

  const share = async (row: RecordingRow) => {
    const blob = await loadClipBlob(row.id);
    if (!blob) {
      setMissing(row.id);
      return;
    }
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const file = new File([blob], `${row.title}.${ext}`, { type: blob.type });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: row.title });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id: string) => {
    await deleteClipBlob(id);
    await deleteRecording({ data: { id } });
    if (active?.id === id) {
      URL.revokeObjectURL(active.url);
      setActive(null);
    }
    await refresh();
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-28 sm:px-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.28em] text-subtle uppercase">{eventConfig.productName}</p>
          <h1 className="font-serif text-3xl text-fg sm:text-4xl">Archive</h1>
          <p className="mt-1 text-sm text-muted">Clips stay on this phone after you stop a live.</p>
        </div>
        <UserButton />
      </header>

      {active ? (
        <video
          src={active.url}
          className="aspect-video w-full rounded-xl bg-raised object-contain"
          controls
          playsInline
          preload="metadata"
        />
      ) : null}
      {missing ? (
        <p className="rounded-xl border border-border bg-raised px-4 py-3 text-sm text-muted">
          That clip was filmed on another phone. Open Archive on the device that went live.
        </p>
      ) : null}

      {rows === null ? (
        <div className="ev-skeleton h-24 rounded-xl bg-raised" />
      ) : rows.length === 0 ? (
        <section className="rounded-xl border border-border bg-surface px-5 py-10 text-center">
          <p className="font-serif text-2xl text-fg">No clips yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Go live from this phone. When you tap Stop, the recording lands here.
          </p>
        </section>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left transition-opacity duration-quick ease-snappy active:opacity-80"
                onClick={() => void play(row.id)}
              >
                <p className="truncate font-medium text-fg">{row.title}</p>
                <p className="text-xs text-muted">
                  {formatWhen(row.createdAt)} · {formatDuration(row.durationMs)}
                </p>
              </button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Share"
                onClick={() => void share(row)}
              >
                {typeof navigator.share === "function" ? <Share2 /> : <Download />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Delete"
                onClick={() => void remove(row.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <TabBar active="archive" />
    </main>
  );
}
