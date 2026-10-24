import type { OperatorRow, Run } from "./types";

/** Everything that is saved per person: what the server stores and the browser caches. */
export type Desk = {
  runs: Run[];
  operatorLog: OperatorRow[];
  /** Ids of runs deleted on any device, so a stale copy elsewhere can't bring them back. */
  deleted: string[];
};

export const EMPTY_DESK: Desk = { runs: [], operatorLog: [], deleted: [] };

/** Caps that keep one desk inside a sane request and row size. */
export const DESK_LIMITS = {
  runs: 500,
  logRows: 500,
  deleted: 2000,
  bytes: 4_000_000,
};

function time(iso: string | undefined): number {
  const t = Date.parse(iso ?? "");
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Merge two copies of a desk (local + server, or server + incoming save).
 * - Runs: union by id; the copy with the later `updatedAt` wins (ties go to `b`).
 * - Deleted ids: union; a deleted run never comes back.
 * - Operator log: one row per run, newest `date` wins; a row is dropped when its
 *   run exists but is no longer sealed (re-running a pass reopens the run).
 * Order: runs and log rows keep `b`'s order first, then anything only in `a`.
 */
export function mergeDesks(a: Desk, b: Desk): Desk {
  const deleted = [...new Set([...(b.deleted ?? []), ...(a.deleted ?? [])])].slice(
    -DESK_LIMITS.deleted,
  );
  const gone = new Set(deleted);

  const byId = new Map<string, Run>();
  for (const run of [...(b.runs ?? []), ...(a.runs ?? [])]) {
    if (!run?.id || gone.has(run.id)) continue;
    const prev = byId.get(run.id);
    if (!prev || time(run.updatedAt) > time(prev.updatedAt)) byId.set(run.id, run);
  }
  const runs = [...byId.values()]
    .sort((x, y) => time(y.createdAt) - time(x.createdAt))
    .slice(0, DESK_LIMITS.runs);
  const runMap = new Map(runs.map((r) => [r.id, r]));

  const logById = new Map<string, OperatorRow>();
  for (const row of [...(b.operatorLog ?? []), ...(a.operatorLog ?? [])]) {
    if (!row?.runId || gone.has(row.runId)) continue;
    const run = runMap.get(row.runId);
    if (run && !run.sealed) continue;
    const prev = logById.get(row.runId);
    if (!prev || time(row.date) > time(prev.date)) logById.set(row.runId, row);
  }
  const operatorLog = [...logById.values()]
    .sort((x, y) => time(y.date) - time(x.date))
    .slice(0, DESK_LIMITS.logRows);

  return { runs, operatorLog, deleted };
}

/** Parse a stored desk defensively; anything malformed becomes an empty desk. */
export function parseDesk(raw: unknown): Desk {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return { ...EMPTY_DESK };
    }
  }
  if (!value || typeof value !== "object") return { ...EMPTY_DESK };
  const o = value as Partial<Desk>;
  return {
    runs: Array.isArray(o.runs) ? o.runs.filter((r) => r && typeof r.id === "string") : [],
    operatorLog: Array.isArray(o.operatorLog)
      ? o.operatorLog.filter((r) => r && typeof r.runId === "string")
      : [],
    deleted: Array.isArray(o.deleted) ? o.deleted.filter((d) => typeof d === "string") : [],
  };
}

/** Stable fingerprint used to skip no-op saves and no-op local updates. */
export function deskKey(d: Desk): string {
  return JSON.stringify([d.runs, d.operatorLog, d.deleted]);
}
