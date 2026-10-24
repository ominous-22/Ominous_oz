import type { PassId, Run } from "@/lib/types";
import { PASS_META, highestUnlocked, isPassComplete } from "@/lib/protocol";
import { cn } from "@/lib/utils";

const PASSES: PassId[] = [0, 1, 2, 3, 4, 5, 6];

export function PassRail({
  run,
  onSelect,
}: {
  run: Run;
  onSelect: (pass: PassId) => void;
}) {
  const unlocked = highestUnlocked(run);

  return (
    <ol className="flex flex-row flex-nowrap gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
      {PASSES.map((pass) => {
        const done = isPassComplete(run, pass);
        const locked = pass > unlocked;
        const current = run.viewingPass === pass;
        const meta = PASS_META[pass];
        return (
          <li key={pass} className="min-w-11 shrink-0 lg:min-w-0 lg:flex-none">
            <button
              type="button"
              disabled={locked}
              onClick={() => onSelect(pass)}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left shadow-[var(--shadow-border)] transition-[background-color,box-shadow,opacity] duration-150 lg:px-3 lg:py-2.5",
                current ? "bg-raised shadow-[var(--shadow-border-hover)]" : "bg-surface",
                locked && "opacity-40",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md font-mono text-xs",
                  done
                    ? "bg-accent/15 text-accent"
                    : current
                      ? "bg-fg text-bg"
                      : "bg-raised text-muted",
                )}
              >
                {pass}
              </span>
              <span className="hidden min-w-0 lg:block">
                <span className="block text-sm text-fg">{meta.name}</span>
                <span className="block truncate text-xs text-subtle">
                  {meta.short}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
