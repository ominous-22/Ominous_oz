import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_LOG, SEED_RUN } from "./seed";
import type { Desk } from "./desk";
import type {
  Gloss,
  OperatorRow,
  PassId,
  PassPayload,
  Run,
} from "./types";
import { highestUnlocked, isPassComplete, mergeLedger } from "./protocol";
import { newId } from "./utils";

type State = {
  hydrated: boolean;
  seedInstalled: boolean;
  runs: Run[];
  operatorLog: OperatorRow[];
  /** Run ids deleted here, kept so sync can delete them on other devices too. */
  deleted: string[];
  /** The signed-in account this local copy belongs to (null = never synced). */
  ownerId: string | null;
  replaceDesk: (desk: Desk, ownerId: string) => void;
  markHydrated: () => void;
  ensureSeed: () => void;
  createRun: (dump: string, title?: string) => Run;
  updateRun: (id: string, patch: Partial<Run>) => void;
  setLedger: (id: string, ledger: Gloss[]) => void;
  setGloss: (id: string, term: string, gloss: string) => void;
  addTerm: (id: string, term: string, gloss: string) => void;
  setFocus: (id: string, focus: string) => void;
  parkOtherIdeas: (id: string) => Run[];
  applyPass: (
    id: string,
    pass: PassId,
    payload: PassPayload[PassId],
    extras?: { title?: string; ledger?: Gloss[] },
  ) => void;
  setReply: (id: string, pass: PassId, reply: string) => void;
  setViewing: (id: string, pass: PassId) => void;
  sealRun: (id: string, row: OperatorRow) => void;
  deleteRun: (id: string) => void;
};

export const useCartographer = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      seedInstalled: true,
      runs: [SEED_RUN],
      operatorLog: [SEED_LOG],
      deleted: [],
      ownerId: null,
      replaceDesk: (desk, ownerId) =>
        set({
          runs: desk.runs,
          operatorLog: desk.operatorLog,
          deleted: desk.deleted,
          ownerId,
        }),
      markHydrated: () => set({ hydrated: true }),
      ensureSeed: () => {
        if (get().seedInstalled) return;
        set({
          seedInstalled: true,
          runs: [SEED_RUN, ...get().runs.filter((r) => r.id !== SEED_RUN.id)],
          operatorLog: [
            SEED_LOG,
            ...get().operatorLog.filter((r) => r.runId !== SEED_LOG.runId),
          ],
        });
      },
      createRun: (dump: string, title?: string) => {
        const now = new Date().toISOString();
        const run: Run = {
          id: newId("ic"),
          createdAt: now,
          updatedAt: now,
          title: title?.trim() || "Untitled run",
          sealed: false,
          dump,
          ledger: [],
          currentPass: 0,
          viewingPass: 0,
          passes: {},
          replies: {},
        };
        set({ runs: [run, ...get().runs] });
        return run;
      },
      updateRun: (id, patch) => {
        set({
          runs: get().runs.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r,
          ),
        });
      },
      setLedger: (id, ledger) => {
        get().updateRun(id, { ledger });
      },
      setGloss: (id, term, gloss) => {
        const run = get().runs.find((r) => r.id === id);
        if (!run) return;
        const next = run.ledger.map((g) =>
          g.term === term ? { ...g, gloss, source: "operator" as const } : g,
        );
        get().updateRun(id, { ledger: next });
      },
      addTerm: (id, term, gloss) => {
        const run = get().runs.find((r) => r.id === id);
        if (!run) return;
        const t = term.trim();
        if (!t) return;
        const existing = run.ledger.find(
          (g) => g.term.toLowerCase() === t.toLowerCase(),
        );
        if (existing) {
          if (gloss.trim()) get().setGloss(id, existing.term, gloss.trim());
          return;
        }
        get().updateRun(id, {
          ledger: [
            ...run.ledger,
            { term: t, gloss: gloss.trim(), source: "operator" },
          ],
        });
      },
      setFocus: (id, focus) => {
        const run = get().runs.find((r) => r.id === id);
        if (!run) return;
        const next = { ...run, focus, updatedAt: new Date().toISOString() };
        next.currentPass = highestUnlocked(next);
        set({
          runs: get().runs.map((r) => (r.id === id ? next : r)),
        });
      },
      parkOtherIdeas: (id) => {
        const run = get().runs.find((r) => r.id === id);
        const ideas = run?.passes[0]?.ideas ?? [];
        const chosen = run?.focus;
        if (!run || !chosen) return [];
        const now = new Date().toISOString();
        const parked: Run[] = ideas
          .filter((idea) => idea.label !== chosen)
          .map((idea) => ({
            id: newId("ic"),
            createdAt: now,
            updatedAt: now,
            title: idea.label,
            sealed: false,
            dump: `This run is only about: ${idea.label}.\n\n${idea.excerpt}\n\n---\nBatched dump (context only — do not cartograph the others):\n${run.dump}`,
            focus: idea.label,
            ledger: [],
            currentPass: 0,
            viewingPass: 0,
            passes: {},
            replies: {},
          }));
        if (parked.length === 0) return [];
        set({
          runs: [
            ...get().runs.filter((r) => r.id === id),
            ...parked,
            ...get().runs.filter((r) => r.id !== id),
          ],
        });
        return parked;
      },
      applyPass: (id, pass, payload, extras) => {
        const run = get().runs.find((r) => r.id === id);
        if (!run) return;
        const passes = { ...run.passes, [pass]: payload };
        for (let i = (pass + 1) as PassId; i <= 6; i++) {
          delete passes[i as PassId];
        }
        const merged: Run = {
          ...run,
          passes,
          title: extras?.title?.trim() || run.title,
          ledger: mergeLedger(run.ledger, extras?.ledger),
          updatedAt: new Date().toISOString(),
          sealed: pass === 6 ? run.sealed : false,
        };
        merged.currentPass = highestUnlocked(merged);
        merged.viewingPass = pass;
        set({
          runs: get().runs.map((r) => (r.id === id ? merged : r)),
          operatorLog:
            pass < 6
              ? get().operatorLog.filter((row) => row.runId !== id)
              : get().operatorLog,
        });
      },
      setReply: (id, pass, reply) => {
        const run = get().runs.find((r) => r.id === id);
        if (!run) return;
        get().updateRun(id, { replies: { ...run.replies, [pass]: reply } });
      },
      setViewing: (id, pass) => {
        const run = get().runs.find((r) => r.id === id);
        if (!run) return;
        const max = highestUnlocked(run);
        const viewing = (pass > max ? max : pass) as PassId;
        get().updateRun(id, { viewingPass: viewing });
      },
      sealRun: (id, row) => {
        const run = get().runs.find((r) => r.id === id);
        if (!run || !isPassComplete(run, 6)) return;
        get().updateRun(id, { sealed: true, title: row.runTitle || run.title });
        set({
          operatorLog: [
            row,
            ...get().operatorLog.filter((r) => r.runId !== id),
          ],
        });
      },
      deleteRun: (id) => {
        set({
          runs: get().runs.filter((r) => r.id !== id),
          operatorLog: get().operatorLog.filter((r) => r.runId !== id),
          deleted: get().deleted.includes(id)
            ? get().deleted
            : [...get().deleted, id],
        });
      },
    }),
    {
      name: "idea-cartographer-v1",
      skipHydration: true,
      partialize: (s) => ({
        seedInstalled: s.seedInstalled,
        runs: s.runs,
        operatorLog: s.operatorLog,
        deleted: s.deleted,
        ownerId: s.ownerId,
      }),
    },
  ),
);

export function useRun(id: string | undefined): Run | undefined {
  return useCartographer((s) => s.runs.find((r) => r.id === id));
}
