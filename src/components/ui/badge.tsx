import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "muted" | "accent" | "warn" | "ok" | "danger";
}) {
  const tones = {
    muted: "text-muted bg-raised",
    accent: "text-accent bg-accent/10",
    warn: "text-warn bg-warn/10",
    ok: "text-ok bg-ok/10",
    danger: "text-danger bg-danger/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
