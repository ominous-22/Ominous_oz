import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LedgerPanel } from "@/components/ledger-panel";
import { OperatorPortrait } from "@/components/mark";
import { PassRail } from "@/components/pass-rail";
import { PassWork } from "@/components/pass-work";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { runCartographerPass } from "@/lib/cartographer";
import { runToMarkdown, runToPrompt } from "@/lib/export-run";
import { highestUnlocked, isPassComplete, unglossed } from "@/lib/protocol";
import { useCartographer, useRun } from "@/lib/store";
import { markSignedOut } from "@/lib/use-owner";
import type { PassId } from "@/lib/types";

export const Route = createFileRoute("/run/$runId")({ component: RunDesk });

const inflight = new Map<string, Promise<void>>();

function RunDesk() {
  const { runId } = Route.useParams();
  const navigate = useNavigate();
  const run = useRun(runId);
  const applyPass = useCartographer((s) => s.applyPass);
  const setGloss = useCartographer((s) => s.setGloss);
  const addTerm = useCartographer((s) => s.addTerm);
  const setViewing = useCartographer((s) => s.setViewing);
  const deleteRun = useCartographer((s) => s.deleteRun);
  const operatorLog = useCartographer((s) => s.operatorLog);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"page" | "prompt" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  async function runPass(pass: PassId, target = run) {
    if (!target) return;
    if (pass > 0 && !isPassComplete(target, (pass - 1) as PassId)) {
      setError("Do not skip a pass. Pass 2 is the one that does the work.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await runCartographerPass({
        data: {
          pass,
          dump: target.dump,
          ledger: target.ledger,
          passes: target.passes,
          reply: target.replies[pass],
          focus: target.focus,
          priorOperatorMoves: operatorLog.map((row) => row.move),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      applyPass(target.id, pass, result.payload, {
        title: result.title,
        ledger: result.ledger,
      });
      if (pass === 0) {
        const nextLedger = result.ledger ?? target.ledger;
        if (unglossed(nextLedger).length > 0) setLedgerOpen(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "Unauthorized") markSignedOut();
      setError(
        message === "Unauthorized"
          ? "Sign in to run a pass — use Sign in at the top right."
          : message || "The pass failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!run || run.sealed || run.passes[0] || !run.dump.trim()) return;

    let cancelled = false;
    setBusy(true);

    let pending = inflight.get(run.id);
    if (!pending) {
      pending = runPass(0, run).finally(() => {
        inflight.delete(run.id);
      });
      inflight.set(run.id, pending);
    }

    void pending.finally(() => {
      if (!cancelled) setBusy(false);
    });

    return () => {
      cancelled = true;
    };
    // Auto-start Pass 0 once per fresh dump. runPass reads current store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.id]);

  if (!run) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-3xl tracking-tight">No such run</h1>
        <p className="mt-2 text-muted">It may have been deleted from this desk.</p>
        <Button asChild className="mt-6">
          <Link to="/">Back to the desk</Link>
        </Button>
      </main>
    );
  }

  const current = run;
  const missing = unglossed(current.ledger).length;
  const prompt = runToPrompt(current);

  async function copy(kind: "page" | "prompt") {
    const text = kind === "prompt" ? prompt : runToMarkdown(current);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setError("Could not copy.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <OperatorPortrait size="mark" />
          <div className="min-w-0">
            <p className="font-mono text-xs text-subtle">{run.id}</p>
            <h1 className="truncate font-display text-2xl tracking-tight md:text-3xl">
              {run.title}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {run.sealed ? (
            <Badge tone="ok">Sealed</Badge>
          ) : (
            <Badge>Unlocked {highestUnlocked(run)}</Badge>
          )}
          {prompt ? (
            <Button variant="secondary" size="sm" onClick={() => void copy("prompt")}>
              {copied === "prompt" ? "Copied" : "Copy prompt"}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => void copy("page")}>
            {copied === "page" ? "Copied" : "Copy page"}
          </Button>
          {confirmDelete ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                deleteRun(run.id);
                void navigate({ to: "/" });
              }}
            >
              Confirm delete
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            onClick={() => setLedgerOpen(true)}
          >
            Ledger{missing ? ` (${missing})` : ""}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)_18rem]">
        <PassRail run={run} onSelect={(p) => setViewing(run.id, p)} />
        <PassWork
          run={run}
          busy={busy}
          error={error}
          onRun={(p) => void runPass(p)}
        />
        <div className="hidden lg:block">
          <LedgerPanel
            ledger={run.ledger}
            editable={!run.sealed && run.viewingPass === 0}
            onChange={(term, gloss) => setGloss(run.id, term, gloss)}
            onAdd={(term, gloss) => addTerm(run.id, term, gloss)}
          />
        </div>
      </div>

      {ledgerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-bg/70"
            aria-label="Close ledger"
            onClick={() => setLedgerOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-auto rounded-t-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <LedgerPanel
              ledger={run.ledger}
              editable={!run.sealed && run.viewingPass === 0}
              onChange={(term, gloss) => setGloss(run.id, term, gloss)}
              onAdd={(term, gloss) => addTerm(run.id, term, gloss)}
            />
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => setLedgerOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
