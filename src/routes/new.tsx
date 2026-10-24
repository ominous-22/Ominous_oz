import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getCartographerStatus } from "@/lib/cartographer";
import { SAMPLE_DUMPS } from "@/lib/seed";
import { useCartographer } from "@/lib/store";
import { wordCount } from "@/lib/utils";

export const Route = createFileRoute("/new")({
  loader: () => getCartographerStatus(),
  component: NewRun,
});

const OPENER = `Idea Cartographer, Pass 0. Load prior state from memory if it exists. Ledger only — do not organize.`;

function NewRun() {
  const navigate = useNavigate();
  const status = Route.useLoaderData();
  const createRun = useCartographer((s) => s.createRun);
  const [dump, setDump] = useState("");
  const words = wordCount(dump);

  function start() {
    const text = dump.trim();
    if (!text) return;
    const run = createRun(text);
    void navigate({ to: "/run/$runId", params: { runId: run.id } });
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 md:py-16">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs tracking-widest text-accent uppercase">
          Pass 0
        </p>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Dump. Do not clean it up.
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-muted">
          One idea. A stale thread already knows what you meant, which defeats
          the cold read. Raw, unstructured — cleaning it up beforehand is the
          failure mode this exists to catch. If you paste two ideas, you will
          be asked to pick one.
        </p>
      </header>

      {!status.available ? (
        <p className="rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
          The local model isn’t answering. Start it (or check
          CARTOGRAPHER_LLM_URL), then come back. You can still walk the sealed
          Tessera run on the desk.
        </p>
      ) : null}

      <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] md:p-6">
        <p className="font-display text-lg text-muted italic">{OPENER}</p>
        <label htmlFor="dump" className="sr-only">
          Idea dump
        </label>
        <Textarea
          id="dump"
          className="mt-4 min-h-72 font-sans"
          value={dump}
          placeholder="Paste the mess. Proper nouns, asides, the thing you always skip."
          onChange={(e) => setDump(e.target.value)}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-xs text-subtle tabular-nums">
            {words} words
          </span>
          <Button disabled={!dump.trim()} onClick={start}>
            Begin the run
          </Button>
        </div>
      </div>

      <section>
        <p className="font-mono text-xs tracking-widest text-subtle uppercase">
          Load a dump
        </p>
        <p className="mt-1 text-sm text-muted">
          Best first candidate is an idea you are confident you already explain
          well.
        </p>
        <ul className="mt-3 grid gap-2">
          {SAMPLE_DUMPS.map((sample) => (
            <li key={sample.label}>
              <button
                type="button"
                onClick={() => setDump(sample.dump)}
                className="flex w-full flex-col rounded-lg bg-surface px-4 py-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
              >
                <span className="font-display text-lg tracking-tight">
                  {sample.label}
                </span>
                <span className="text-sm text-muted">{sample.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
