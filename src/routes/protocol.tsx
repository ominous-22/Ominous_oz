import { createFileRoute } from "@tanstack/react-router";
import { ALTITUDES, HARD_RULES, PASS_META } from "@/lib/protocol";
import type { PassId } from "@/lib/types";

export const Route = createFileRoute("/protocol")({ component: Protocol });

const PASSES: PassId[] = [0, 1, 2, 3, 4, 5, 6];

function Protocol() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-14 px-4 py-10 md:py-16">
      <header>
        <p className="font-mono text-xs tracking-widest text-accent uppercase">
          Field manual
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          Cartographer, not co-author.
        </h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-muted">
          The output is not a map of the idea. It is a record of how you failed
          to explain it, accumulated across runs. Audience is you. Not a product.
        </p>
      </header>

      <section>
        <h2 className="font-display text-2xl tracking-tight">Hard rules</h2>
        <ol className="mt-4 divide-y divide-hairline border-y border-hairline">
          {HARD_RULES.map((rule) => (
            <li key={rule.n} className="grid grid-cols-[2rem_1fr] gap-3 py-4">
              <span className="font-mono text-sm text-accent">{rule.n}</span>
              <div>
                <p className="font-medium">{rule.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {rule.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="font-display text-2xl tracking-tight">Three altitudes</h2>
        <ul className="mt-4 grid gap-3">
          {ALTITUDES.map((a) => (
            <li
              key={a.id}
              className="rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]"
            >
              <p className="font-mono text-xs tracking-widest text-accent uppercase">
                {a.id} — {a.name}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{a.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          If you answer at L3 when asked for L1, the cartographer says so and
          asks again.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl tracking-tight">The loop</h2>
        <ol className="mt-4 flex flex-col gap-3">
          {PASSES.map((pass) => {
            const meta = PASS_META[pass];
            return (
              <li
                key={pass}
                className="grid grid-cols-[2.5rem_1fr] gap-3 rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]"
              >
                <span className="font-mono text-lg text-accent">{pass}</span>
                <div>
                  <p className="font-medium">
                    {meta.name}
                    {pass === 2 ? (
                      <span className="ml-2 font-mono text-xs text-subtle">
                        load-bearing
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {meta.instruction}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2 className="font-display text-2xl tracking-tight">Done when</h2>
        <p className="mt-3 text-base leading-relaxed text-muted">
          You can say L1 without hedging, the cold reader’s first question is
          about fit rather than comprehension, and every ledger term is glossed
          in L2 or deleted. The blueprint copies as a prompt a model can run.
          If any fail after three passes, the problem is the idea, not the
          phrasing. If two ideas were batched, pick one before Pass 1.
        </p>
      </section>
    </main>
  );
}
