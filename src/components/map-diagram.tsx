import type { Pass3 } from "@/lib/types";
import { captionOverFive } from "@/lib/protocol";
import { cn } from "@/lib/utils";

export function MapDiagram({ map }: { map: Pass3 }) {
  return (
    <div className="flex flex-col gap-8">
      <Tier
        label="Tier 1 — the invariant"
        hint="Sequential stages"
        boxes={map.tier1}
        connected
      />
      <Tier
        label="Tier 2 — instances"
        hint="One box each"
        boxes={map.tier2}
      />
      <Tier
        label="Tier 3 — standalone pieces"
        hint="Could leave the idea"
        boxes={map.tier3}
      />
      {map.prose ? (
        <p className="max-w-prose text-base leading-relaxed text-muted">{map.prose}</p>
      ) : null}
    </div>
  );
}

function Tier({
  label,
  hint,
  boxes,
  connected,
}: {
  label: string;
  hint: string;
  boxes: Pass3["tier1"];
  connected?: boolean;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-xs tracking-widest text-subtle uppercase">
          {label}
        </h3>
        <span className="text-xs text-subtle">{hint}</span>
      </div>
      {boxes.length === 0 ? (
        <p className="text-sm text-muted">None named.</p>
      ) : (
        <ul
          className={cn(
            "flex flex-wrap gap-3",
            connected && "md:flex-nowrap",
          )}
        >
          {boxes.map((box, i) => (
            <li key={`${box.title}-${i}`} className="flex min-w-0 flex-1 items-stretch gap-3">
              <article className="min-w-36 flex-1 rounded-lg bg-raised p-3 shadow-[var(--shadow-border)]">
                <h4 className="font-display text-lg leading-tight tracking-tight">
                  {box.title}
                </h4>
                <p
                  className={cn(
                    "mt-1 text-sm",
                    captionOverFive(box.caption) ? "text-warn" : "text-muted",
                  )}
                >
                  {box.caption}
                </p>
              </article>
              {connected && i < boxes.length - 1 ? (
                <span
                  aria-hidden
                  className="hidden w-4 shrink-0 self-center border-t border-hairline md:block"
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
