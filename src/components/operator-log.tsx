import { Link } from "@tanstack/react-router";
import type { OperatorRow } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function OperatorLog({ rows }: { rows: OperatorRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        If there is no row, the run did not count. Pass 6 writes here.
      </p>
    );
  }

  return (
    <ol className="flex flex-col divide-y divide-hairline border-y border-hairline">
      {rows.map((row) => (
        <li key={`${row.runId}-${row.date}`} className="py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link
              to="/run/$runId"
              params={{ runId: row.runId }}
              className="font-display text-xl tracking-tight text-fg hover:text-accent"
            >
              {row.runTitle}
            </Link>
            <span
              className={
                row.repeatCount >= 4
                  ? "font-mono text-xs text-warn"
                  : "font-mono text-xs text-subtle"
              }
            >
              {formatDate(row.date)} · ×{row.repeatCount}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-fg">
            <span className="font-mono text-xs tracking-widest text-subtle uppercase">
              The move
            </span>
            <br />
            {row.move}
          </p>
          <blockquote className="mt-3 border-l-2 border-accent/50 pl-3 font-display text-lg leading-snug text-muted italic">
            {row.tell}
          </blockquote>
          <p className="mt-3 text-sm text-muted">
            <span className="text-subtle">Try next. </span>
            {row.tryNext}
          </p>
        </li>
      ))}
    </ol>
  );
}
