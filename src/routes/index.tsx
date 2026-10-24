import { createFileRoute, Link } from "@tanstack/react-router";
import { OperatorPortrait } from "@/components/mark";
import { OperatorLog } from "@/components/operator-log";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { highestUnlocked, isPassComplete } from "@/lib/protocol";
import { useCartographer } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const runs = useCartographer((s) => s.runs);
  const log = useCartographer((s) => s.operatorLog);
  const open = runs.filter((r) => !r.sealed);
  const sealed = runs.filter((r) => r.sealed);
  const habit = log.find((row) => row.repeatCount >= 4);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-10 md:py-16">
      <section className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div className="rise-in">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">
            Seven passes · one idea
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.1] tracking-tight md:text-6xl">
            A record of how you failed to explain it.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            Dump the mess. A cold reader who does not already know what you
            meant writes the ledger, the altitudes, and a prompt you can
            actually deploy. Pass 6 is a finding about you.
          </p>
          <blockquote className="mt-6 max-w-xl border-l-2 border-accent/50 pl-4 font-display text-xl leading-snug text-fg italic">
            Tools that check the people you’re supposed to trust, and show the
            evidence so you don’t have to trust me either.
          </blockquote>
          <Button asChild size="lg" className="mt-6">
            <Link to="/new">Open a fresh run</Link>
          </Button>
          <Link
            to="/quiz"
            className="mt-3 inline-flex min-h-11 items-center text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Or six questions, and a map that quotes you.
          </Link>
        </div>
        <OperatorPortrait className="rise-in-2 md:max-w-sm md:justify-self-end" />
      </section>

      {habit ? (
        <p className="rise-in-3 rounded-lg bg-warn/10 px-4 py-3 text-sm text-warn">
          The same move is on its fourth appearance
          {habit.tryNext ? ` — “${habit.tryNext}”` : ""}. Stop working on ideas.
          Work on the habit.
        </p>
      ) : null}

      <section className="rise-in-3 grid gap-10 lg:grid-cols-2">
        <div>
          <Header
            kicker="On the desk"
            title="Open runs"
            count={open.length}
          />
          {open.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No open runs. One idea per run. Do not clean the dump first.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {open.map((run) => (
                <RunRow
                  key={run.id}
                  id={run.id}
                  title={run.title}
                  date={run.updatedAt}
                  note={`Pass ${highestUnlocked(run)} unlocked`}
                />
              ))}
            </ul>
          )}
        </div>
        <div>
          <Header
            kicker="Sealed"
            title="Findings"
            count={sealed.length}
          />
          {sealed.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Pass 6 writes a row. If there is no row, the run did not count.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {sealed.map((run) => (
                <RunRow
                  key={run.id}
                  id={run.id}
                  title={run.title}
                  date={run.updatedAt}
                  note={isPassComplete(run, 6) ? "Operator log written" : "Sealed"}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <Header kicker="Across runs" title="Operator log" />
        <p className="mt-2 max-w-prose text-sm text-muted">
          Audience is you. If the same entry keeps appearing after four runs,
          stop working on ideas and work on that habit directly.
        </p>
        <div className="mt-6">
          <OperatorLog rows={log} />
        </div>
      </section>
    </main>
  );
}

function Header({
  kicker,
  title,
  count,
}: {
  kicker: string;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="font-mono text-xs tracking-widest text-subtle uppercase">
          {kicker}
        </p>
        <h2 className="font-display text-3xl tracking-tight">{title}</h2>
      </div>
      {typeof count === "number" ? <Badge>{count}</Badge> : null}
    </div>
  );
}

function RunRow({
  id,
  title,
  date,
  note,
}: {
  id: string;
  title: string;
  date: string;
  note: string;
}) {
  return (
    <li>
      <Link
        to="/run/$runId"
        params={{ runId: id }}
        className="flex items-center justify-between gap-3 rounded-lg bg-surface px-4 py-3 shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
      >
        <span className="min-w-0">
          <span className="block truncate font-display text-lg tracking-tight">
            {title}
          </span>
          <span className="block text-xs text-subtle">{note}</span>
        </span>
        <span className="shrink-0 font-mono text-xs text-subtle">
          {formatDate(date)}
        </span>
      </Link>
    </li>
  );
}
