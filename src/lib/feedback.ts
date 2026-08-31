import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { isFeedbackChoice } from "@/lib/crowd";

export type FeedbackCount = {
  kind: string;
  choice: string;
  count: number;
};

export const submitFeedback = createServerFn({ method: "POST" })
  .validator(
    z.object({
      guest: z.string().regex(/^g-[a-zA-Z0-9_-]{6,32}$/),
      kind: z.string().min(1).max(16),
      choice: z.string().min(1).max(16),
    }),
  )
  .handler(async ({ data }) => {
    if (!isFeedbackChoice(data.kind, data.choice)) return { ok: false as const };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const id = `${data.guest}:${data.kind}`;
    await sql`
      insert into feedback (id, kind, choice)
      values (${id}, ${data.kind}, ${data.choice})
      on conflict (id) do update set choice = excluded.choice, created_at = now()
    `;
    return { ok: true as const };
  });

export const listFeedback = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ kind: string; choice: string; n: number }>`
      select kind, choice, count(*)::int as n
      from feedback
      group by kind, choice
    `;
    return rows.map((row) => ({
      kind: row.kind,
      choice: row.choice,
      count: Number(row.n) || 0,
    })) satisfies FeedbackCount[];
  });
