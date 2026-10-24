import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  PASS_META,
  ideaQuestion,
  isPassComplete,
  l1ProperNounHits,
  unglossed,
} from "@/lib/protocol";
import { runToPrompt } from "@/lib/export-run";
import { useCartographer } from "@/lib/store";
import type {
  Gloss,
  Pass0,
  Pass1,
  Pass2,
  Pass3,
  Pass4,
  Pass5,
  Pass6,
  PassId,
  Run,
} from "@/lib/types";
import { wordCount } from "@/lib/utils";
import { MapDiagram } from "./map-diagram";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export function PassWork({
  run,
  busy,
  error,
  onRun,
}: {
  run: Run;
  busy: boolean;
  error: string | null;
  onRun: (pass: PassId) => void;
}) {
  const pass = run.viewingPass;
  const meta = PASS_META[pass];
  const payload = run.passes[pass];
  const sealed = run.sealed;

  return (
    <article className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-subtle uppercase">
          Pass {pass}
        </p>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          {meta.name}
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-muted">
          {meta.instruction}
        </p>
        {run.focus ? (
          <p className="font-mono text-xs text-accent">Focus: {run.focus}</p>
        ) : null}
      </header>

      {busy ? (
        <p className="shimmer-text font-display text-xl italic">{meta.waiting}</p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {pass === 0 ? (
        <Pass0View run={run} busy={busy} onRun={onRun} />
      ) : null}
      {pass === 1 && payload ? <Pass1View run={run} data={payload as Pass1} /> : null}
      {pass === 2 && payload ? <Pass2View run={run} data={payload as Pass2} /> : null}
      {pass === 3 && payload ? <Pass3View data={payload as Pass3} /> : null}
      {pass === 4 && payload ? <Pass4View run={run} data={payload as Pass4} /> : null}
      {pass === 5 && payload ? <Pass5View data={payload as Pass5} /> : null}
      {pass === 6 && payload ? <Pass6View run={run} data={payload as Pass6} /> : null}

      {pass >= 4 && runToPrompt(run) ? <PromptCard run={run} /> : null}

      {!sealed ? (
        <RunAgain
          run={run}
          pass={pass}
          hasOutput={Boolean(payload)}
          busy={busy}
          onRun={onRun}
        />
      ) : (
        <p className="font-mono text-xs text-subtle">
          This run is sealed. Open a fresh run to go again — a stale thread
          already knows what you meant.
        </p>
      )}
    </article>
  );
}

function RunAgain({
  run,
  pass,
  hasOutput,
  busy,
  onRun,
}: {
  run: Run;
  pass: PassId;
  hasOutput: boolean;
  busy: boolean;
  onRun: (pass: PassId) => void;
}) {
  const setReply = useCartographer((s) => s.setReply);
  const reply = run.replies[pass] ?? "";
  const blocked = pass > 0 && !isPassComplete(run, (pass - 1) as PassId);
  const waitingGloss = pass === 0 && unglossed(run.ledger).length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <label className="text-sm text-muted" htmlFor="reply">
        {waitingGloss
          ? "Lock every gloss first. The cartographer stops until you do."
          : hasOutput
            ? "Reply if the cartographer got the tell wrong, then run again. Re-running clears later passes."
            : pass === 0
              ? "Extract the ledger from the dump. Do not organize it yourself first."
              : "Run this pass. Do not skip ahead."}
      </label>
      {hasOutput || pass > 0 ? (
        <Textarea
          id="reply"
          rows={3}
          value={reply}
          placeholder="Optional note to the cartographer"
          onChange={(e) => setReply(run.id, pass, e.target.value)}
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || blocked} onClick={() => onRun(pass)}>
          {busy ? "Working" : hasOutput ? "Run again" : `Run pass ${pass}`}
        </Button>
      </div>
    </div>
  );
}

function Pass0View({
  run,
  busy,
  onRun,
}: {
  run: Run;
  busy: boolean;
  onRun: (pass: PassId) => void;
}) {
  const data = run.passes[0];
  const setViewing = useCartographer((s) => s.setViewing);
  const setFocus = useCartographer((s) => s.setFocus);
  const parkOtherIdeas = useCartographer((s) => s.parkOtherIdeas);
  const setGloss = useCartographer((s) => s.setGloss);
  const missing = unglossed(run.ledger);
  const ready = isPassComplete(run, 0) && !run.passes[1];
  const ideas = data?.ideas ?? [];

  return (
    <div className="flex flex-col gap-5">
      {data?.cleanedBeforeDump ? (
        <Callout tone="warn">
          This dump looks cleaned. That is the failure mode this protocol exists
          to catch. Next run: paste raw.
        </Callout>
      ) : null}
      {data?.multipleIdeas ? (
        <Callout tone="warn">
          Two or more ideas were batched. Neither gets a real Pass 2 until you
          pick one.
        </Callout>
      ) : null}
      {data?.notes ? (
        <p className="max-w-prose text-base leading-relaxed text-fg">{data.notes}</p>
      ) : null}

      {data?.multipleIdeas && ideas.length > 1 ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">
            Pick one
          </h2>
          <ul className="flex flex-col gap-2">
            {ideas.map((idea) => {
              const chosen = run.focus === idea.label;
              return (
                <li key={idea.label}>
                  <button
                    type="button"
                    onClick={() => setFocus(run.id, idea.label)}
                    className={
                      chosen
                        ? "w-full rounded-lg bg-raised p-3 text-left shadow-[var(--shadow-border-hover)]"
                        : "w-full rounded-lg bg-surface p-3 text-left shadow-[var(--shadow-border)]"
                    }
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-display text-lg tracking-tight">
                        {idea.label}
                      </span>
                      {chosen ? <Badge tone="ok">This run</Badge> : null}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted">
                      {idea.excerpt}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {run.focus ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => parkOtherIdeas(run.id)}
            >
              Park the rest on the desk
            </Button>
          ) : null}
        </div>
      ) : null}

      {missing.length > 0 ? (
        <div>
          <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">
            Stop and ask
          </h2>
          <p className="mt-2 text-sm text-muted">
            Twelve words or fewer. Pass 1 stays locked until every term is
            glossed.
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {missing.map((g) => (
              <GlossAsk
                key={g.term}
                item={g}
                question={ideaQuestion(g.term, data?.questions ?? [])}
                onLock={(gloss) => setGloss(run.id, g.term, gloss)}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {ready ? (
        <div className="flex flex-col gap-3 rounded-xl bg-raised p-4 shadow-[var(--shadow-border)]">
          <p className="text-sm text-ok">Ledger closed. Pass 1 is unlocked.</p>
          <Button
            disabled={busy}
            onClick={() => {
              setViewing(run.id, 1);
              onRun(1);
            }}
          >
            Run Extract
          </Button>
        </div>
      ) : null}

      {run.dump.trim() ? (
        data ? (
          <details className="rounded-lg bg-raised p-4 shadow-[var(--shadow-border)]">
            <summary className="cursor-pointer text-sm text-muted">The dump</summary>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg">
              {run.dump}
            </pre>
          </details>
        ) : (
          <div className="rounded-lg bg-raised p-4 shadow-[var(--shadow-border)]">
            <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">
              The dump
            </h2>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg">
              {run.dump}
            </pre>
          </div>
        )
      ) : null}
    </div>
  );
}

function GlossAsk({
  item,
  question,
  onLock,
}: {
  item: Gloss;
  question: string;
  onLock: (gloss: string) => void;
}) {
  const [draft, setDraft] = useState(item.gloss);
  const count = wordCount(draft);
  const over = count > 12;

  useEffect(() => {
    setDraft(item.gloss);
  }, [item.gloss]);

  return (
    <li className="rounded-lg bg-raised p-3 shadow-[var(--shadow-border)]">
      <p className="font-mono text-sm text-accent">{item.term}</p>
      <p className="mt-1 text-sm text-muted">{question}</p>
      <div className="mt-2 flex flex-col gap-2">
        <Input
          value={draft}
          maxLength={140}
          placeholder="Twelve words or fewer"
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <span
            className={
              over ? "font-mono text-xs text-danger" : "font-mono text-xs text-subtle"
            }
          >
            {count} / 12
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={over || !draft.trim()}
            onClick={() => onLock(draft.trim())}
          >
            Lock gloss
          </Button>
        </div>
      </div>
    </li>
  );
}

function Pass1View({ run, data }: { run: Run; data: Pass1 }) {
  const hits = l1ProperNounHits(data.l1, run.ledger);
  return (
    <div className="flex flex-col gap-6">
      <Field label="Invariant" body={data.invariant} />
      <Field label="Instance" body={data.instance} />
      <div>
        <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">
          Claims that are assumptions
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-relaxed">
          {data.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
      <Field label="Weakest joint" body={data.weakestJoint} />
      <div className="rounded-xl bg-raised p-4 shadow-[var(--shadow-border)]">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">
            L1 — the sentence
          </h2>
          {hits.length > 0 ? <Badge tone="danger">Proper nouns</Badge> : <Badge tone="ok">Clean</Badge>}
        </div>
        <p className="mt-2 font-display text-2xl leading-snug tracking-tight">
          {data.l1}
        </p>
        {hits.length > 0 ? (
          <p className="mt-2 text-sm text-danger">
            L1 still uses {hits.map((h) => h.term).join(", ")}. The idea is not
            yet articulable.
          </p>
        ) : null}
      </div>
      <Field label="L2 — the paragraph" body={data.l2} />
    </div>
  );
}

function Pass2View({ run, data }: { run: Run; data: Pass2 }) {
  const l2 = run.passes[1]?.l2 ?? "";
  const sentences = splitSentences(l2);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">
          L2, as a stranger
        </h2>
        <p className="mt-3 max-w-prose text-base leading-relaxed">
          {sentences.length === 0
            ? l2
            : sentences.map((s) => {
                const hit = data.lostAt && s.includes(data.lostAt.slice(0, 40));
                return (
                  <span
                    key={s}
                    className={hit ? "bg-warn/20 text-fg" : "text-muted"}
                  >
                    {s}{" "}
                  </span>
                );
              })}
        </p>
      </div>
      <Field label="Lost at" body={data.lostAt} />
      <Field label="First question" body={data.firstQuestion} />
      <Field label="They assume it is" body={data.assumedItIs} />
      <Field label="It isn’t" body={data.actuallyIsNot} />
      {data.notes ? <Field label="Notes" body={data.notes} /> : null}
    </div>
  );
}

function Pass3View({ data }: { data: Pass3 }) {
  return <MapDiagram map={data} />;
}

function Pass4View({ run, data }: { run: Run; data: Pass4 }) {
  const hits = l1ProperNounHits(data.l1, run.ledger);
  return (
    <div className="flex flex-col gap-6 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] md:p-8">
      <p className="font-mono text-xs tracking-widest text-subtle uppercase">
        Blueprint — one page
      </p>
      <div>
        <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">L1</h2>
        <p className="mt-2 font-display text-2xl leading-snug tracking-tight">
          {data.l1}
        </p>
        {hits.length > 0 ? (
          <p className="mt-2 text-sm text-danger">
            Proper nouns at L1: {hits.map((h) => h.term).join(", ")}.
          </p>
        ) : null}
      </div>
      <Field label="L2" body={data.l2} />
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Components" body={data.l3.components} />
        <Field label="Data flow" body={data.l3.dataFlow} />
        <Field label="Constraints" body={data.l3.constraints} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <List label="Load-bearing" items={data.l3.loadBearing} />
        <List label="Incidental" items={data.l3.incidental} />
      </div>
      <div>
        <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">
          Open UNKNOWNs
        </h2>
        {data.unknowns.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None marked. Be suspicious.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {data.unknowns.map((u) => (
              <li key={u} className="text-warn">
                UNKNOWN — {u}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Pass5View({ data }: { data: Pass5 }) {
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(60);

  useEffect(() => {
    if (!running) return;
    setLeft(60);
    const started = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const next = Math.max(0, 60 - elapsed);
      setLeft(next);
      if (next === 0) {
        window.clearInterval(id);
        setRunning(false);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [running]);

  if (!data.willCompress) {
    return (
      <Callout tone="warn">
        It will not compress. Go back to {data.sendBackTo ?? "an upstream pass"}.
        This is a test, not a deliverable.
      </Callout>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Badge tone="accent">~{data.estimatedSeconds}s</Badge>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setRunning((v) => !v)}
        >
          {running ? `${left}s` : "Start sixty seconds"}
        </Button>
      </div>
      <p className="max-w-prose font-display text-xl leading-relaxed tracking-tight">
        {data.script}
      </p>
      <p className="font-mono text-xs text-subtle">{wordCount(data.script)} words</p>
    </div>
  );
}

function Pass6View({ run, data }: { run: Run; data: Pass6 }) {
  const sealRun = useCartographer((s) => s.sealRun);
  return (
    <div className="flex flex-col gap-5">
      <Field label="The move" body={data.move} />
      <blockquote className="border-l-2 border-accent/50 pl-4 font-display text-2xl leading-snug text-fg italic">
        {data.tell}
      </blockquote>
      <p className="text-sm text-muted">
        Repeat count <span className="font-mono text-fg">{data.repeatCount}</span>
        {data.priorNote ? ` — ${data.priorNote}` : ""}
      </p>
      {data.repeatCount >= 4 ? (
        <Callout tone="warn">
          The same move is on its fourth appearance. Stop working on ideas. Work
          on the habit.
        </Callout>
      ) : null}
      <Field label="Try next (one)" body={data.tryNext} />
      {!run.sealed ? (
        <Button
          onClick={() =>
            sealRun(run.id, {
              runId: run.id,
              runTitle: run.title,
              date: new Date().toISOString(),
              move: data.move,
              tell: data.tell,
              repeatCount: data.repeatCount,
              tryNext: data.tryNext,
            })
          }
        >
          Write the row
        </Button>
      ) : (
        <p className="text-sm text-ok">Row written. The run counted.</p>
      )}
      <Link to="/" className="text-sm text-accent hover:underline">
        Back to the desk
      </Link>
    </div>
  );
}

function PromptCard({ run }: { run: Run }) {
  const prompt = runToPrompt(run);
  const [copied, setCopied] = useState(false);
  if (!prompt) return null;
  const text = prompt;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-raised p-4 shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">
          Deployable prompt
        </h2>
        <Button variant="secondary" size="sm" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy prompt"}
        </Button>
      </div>
      <p className="text-sm text-muted">
        L1, L2, L3, glossary, UNKNOWNs. Paste into a fresh chat. Do not add
        scope.
      </p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-fg">
        {prompt}
      </pre>
    </div>
  );
}

function Field({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">
        {label}
      </h2>
      <p className="mt-2 max-w-prose text-base leading-relaxed text-fg">{body}</p>
    </div>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">
        {label}
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Callout({
  tone,
  children,
}: {
  tone: "warn" | "muted";
  children: ReactNode;
}) {
  return (
    <p
      className={
        tone === "warn"
          ? "rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn"
          : "rounded-lg bg-raised px-3 py-2 text-sm text-muted"
      }
    >
      {children}
    </p>
  );
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
