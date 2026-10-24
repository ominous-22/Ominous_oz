import { createServerFn } from "@tanstack/react-start";
import { ownerMiddleware } from "@/lib/owner";
import { getSql } from "@/lib/db";
import { DESK_LIMITS, mergeDesks, parseDesk, type Desk } from "./desk";

async function readDesk(userId: string): Promise<Desk | null> {
  const sql = await getSql();
  const rows = await sql<{ data: string }>`
    select data from cartographer_desk where user_id = ${userId}`;
  return rows[0] ? parseDesk(rows[0].data) : null;
}

async function writeDesk(userId: string, desk: Desk): Promise<void> {
  const sql = await getSql();
  const data = JSON.stringify(desk);
  await sql`
    insert into cartographer_desk (user_id, data, updated_at)
    values (${userId}, ${data}, now())
    on conflict (user_id) do update set data = excluded.data, updated_at = now()`;
}

/** The signed-in person's saved desk. `found: false` means nothing saved yet. */
export const loadDesk = createServerFn({ method: "GET" })
  .middleware([ownerMiddleware])
  .handler(async ({ context }): Promise<{ found: boolean; desk: Desk }> => {
    const desk = await readDesk(context.userId);
    return desk
      ? { found: true, desk }
      : { found: false, desk: { runs: [], operatorLog: [], deleted: [] } };
  });

/**
 * Save the desk. The incoming copy is merged with what is stored, never
 * blindly overwritten, so a second device can't erase runs it hasn't seen.
 * Returns the merged desk for the caller to adopt.
 */
export const saveDesk = createServerFn({ method: "POST" })
  .validator((input: unknown): Desk => {
    const text = JSON.stringify(input ?? null);
    if (text.length > DESK_LIMITS.bytes) throw new Error("Desk is too large to save.");
    const desk = parseDesk(input);
    if (desk.runs.length > DESK_LIMITS.runs) throw new Error("Too many runs to save.");
    return desk;
  })
  .middleware([ownerMiddleware])
  .handler(async ({ context, data }): Promise<{ desk: Desk }> => {
    const stored = await readDesk(context.userId);
    const merged = stored ? mergeDesks(stored, data) : mergeDesks(data, data);
    await writeDesk(context.userId, merged);
    return { desk: merged };
  });
