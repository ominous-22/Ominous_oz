import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  QUESTIONS,
  RUBRIC,
  mapToText,
  toMindMap,
  type MindMap,
} from "@/lib/quiz";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quiz")({ component: Quiz });

function Quiz() {
  const [picks, setPicks] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const step = picks.length;
  const done = step >= QUESTIONS.length;
  const question = QUESTIONS[step];
  const map = done ? toMindMap(picks) : null;

  function choose(id: string) {
    setPicks((current) => [...current, id]);
    setCopied(false);
  }

  function back() {
    setPicks((current) => current.slice(0, -1));
    setCopied(false);
  }

  function reset() {
    setPicks([]);
    setCopied(false);
  }

  async function copy(current: MindMap) {
    try {
      await navigator.clipboard.writeText(mapToText(current));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col px-4 py-10 md:py-16">
      {map ? (
        <Result map={map} copied={copied} onCopy={() => void copy(map)} onReset={reset} />
      ) : question ? (
        <section aria-live="polite">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">
            The rubric · {step + 1} of {QUESTIONS.length}
          </p>
          <div className="mt-3 flex gap-1" aria-hidden>
            {QUESTIONS.map((item, index) => (
              <span
                key={item.id}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  index <= step ? "bg-accent" : "bg-raised",
                )}
              />
            ))}
          </div>
          <h1 className="mt-6 font-display text-3xl leading-tight tracking-tight md:text-4xl">
            {question.prompt}
          </h1>
          <ul className="mt-6 flex flex-col gap-2">
            {question.choices.map((choice) => (
              <li key={choice.id}>
                <button
                  type="button"
                  onClick={() => choose(choice.id)}
                  className="min-h-14 w-full rounded-lg bg-surface px-4 py-3 text-left text-base leading-snug shadow-[var(--shadow-border)] transition-[box-shadow,transform] duration-150 hover:shadow-[var(--shadow-border-hover)] active:scale-[0.99]"
                >
                  {choice.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Button variant="ghost" size="sm" onClick={back} disabled={step === 0}>
              Back
            </Button>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Result({
  map,
  copied,
  onCopy,
  onReset,
}: {
  map: MindMap;
  copied: boolean;
  onCopy: () => void;
  onReset: () => void;
}) {
  return (
    <section>
      <p className="font-mono text-xs tracking-widest text-accent uppercase">
        Your map
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
        {map.title}
      </h1>
      <p className="mt-5 font-display text-xl leading-snug text-fg italic">
        {map.center}
      </p>
      <p className="mt-3 text-sm text-muted">
        It feels like a tell because it quotes you. The weights are under the map.
      </p>

      <ol className="mt-8 ml-1 flex flex-col gap-3 border-l border-hairline pl-5">
        {map.nodes.map((node) => (
          <li key={node.id} className="relative">
            <span
              aria-hidden
              className={cn(
                "absolute top-5 -left-[1.45rem] size-2 rounded-full",
                node.shadow ? "bg-warn" : "bg-fg",
              )}
            />
            <article
              className={cn(
                "rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]",
                node.shadow && "border border-dashed border-warn/50",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl tracking-tight">{node.name}</h2>
                <span className="font-mono text-xs text-subtle">{node.score}</span>
              </div>
              <p className="mt-1 font-mono text-[11px] tracking-widest text-subtle uppercase">
                {node.shadow ? "Left on the floor" : "Filed"}
              </p>
              <p className="mt-3 text-base leading-snug">{node.line}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{node.note}</p>
            </article>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-lg bg-raised p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">
          The rubric
        </h2>
        <p className="mt-2 font-mono text-xs leading-relaxed text-muted">{RUBRIC}</p>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {map.nodes.map((node) => (
              <tr key={node.id} className="border-t border-hairline">
                <th className="py-2 pr-3 text-left font-normal">{node.name}</th>
                <td className="py-2 text-right font-mono text-muted">{node.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={onCopy}>{copied ? "Copied" : "Copy map"}</Button>
        <Button variant="secondary" onClick={onReset}>
          Again
        </Button>
      </div>
    </section>
  );
}
