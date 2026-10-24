import { cn } from "@/lib/utils";

export function TesseraMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("text-accent", className)}
      aria-hidden="true"
    >
      <rect x="1.5" y="1.5" width="9.5" height="9.5" fill="currentColor" />
      <rect
        x="13"
        y="1.5"
        width="9.5"
        height="9.5"
        fill="currentColor"
        opacity="0.45"
      />
      <rect
        x="1.5"
        y="13"
        width="9.5"
        height="9.5"
        fill="currentColor"
        opacity="0.45"
      />
      <rect
        x="13"
        y="13"
        width="9.5"
        height="9.5"
        fill="currentColor"
        opacity="0.18"
      />
    </svg>
  );
}

/** The operator, pinned to the desk. `mark` is the face crop used on a run. */
export function OperatorPortrait({
  size = "desk",
  className,
}: {
  size?: "desk" | "mark";
  className?: string;
}) {
  if (size === "mark") {
    return (
      <img
        src="/operator.jpg"
        alt="Operator"
        width={832}
        height={1248}
        className={cn(
          "size-14 shrink-0 rounded-md object-cover object-[center_28%] shadow-[var(--shadow-border)]",
          className,
        )}
      />
    );
  }

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-border)]",
        className,
      )}
    >
      <img
        src="/operator.jpg"
        alt=""
        width={832}
        height={1248}
        className="h-[min(52dvh,26rem)] w-full object-cover object-[center_22%] md:aspect-[2/3] md:h-auto"
      />
      <figcaption className="flex items-baseline justify-between gap-3 px-4 py-3">
        <span className="font-mono text-xs tracking-widest text-accent uppercase">
          Operator
        </span>
        <span className="text-sm text-muted">On the desk</span>
      </figcaption>
    </figure>
  );
}
