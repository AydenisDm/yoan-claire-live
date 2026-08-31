import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

export type RecordingRow = {
  id: string;
  title: string;
  durationMs: number;
  sizeBytes: number;
  mime: string;
  createdAt: string;
};

export const listRecordings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      title: string;
      duration_ms: number;
      size_bytes: number;
      mime: string;
      created_at: string;
    }>`
      select id, title, duration_ms, size_bytes, mime, created_at::text as created_at
      from recordings
      where user_id = ${context.userId}
      order by created_at desc
    `;
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      durationMs: Number(row.duration_ms) || 0,
      sizeBytes: Number(row.size_bytes) || 0,
      mime: row.mime,
      createdAt: row.created_at,
    })) satisfies RecordingRow[];
  });

export const addRecording = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().min(8).max(64),
      title: z.string().min(1).max(80),
      durationMs: z.number().int().nonnegative(),
      sizeBytes: z.number().int().nonnegative(),
      mime: z.string().min(1).max(64),
    }),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into recordings (id, user_id, title, duration_ms, size_bytes, mime)
      values (${data.id}, ${context.userId}, ${data.title}, ${data.durationMs}, ${data.sizeBytes}, ${data.mime})
    `;
    return { ok: true as const };
  });

export const deleteRecording = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().min(8).max(64) }))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from recordings where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });
