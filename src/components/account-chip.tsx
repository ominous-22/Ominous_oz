import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/owner";
import { refreshOwner, useOwner } from "@/lib/use-owner";
import { cn } from "@/lib/utils";
import { useSyncStatus, type SyncStatus } from "./desk-sync";
import { TesseraMark } from "./mark";

const STATUS_TEXT: Record<SyncStatus, string> = {
  local: "Saved in this browser only",
  syncing: "Saving…",
  saved: "Saved to your desk",
  error: "Not saved to your desk yet — kept here, retrying",
};

const STATUS_DOT: Record<SyncStatus, string> = {
  local: "bg-subtle",
  syncing: "bg-warn",
  saved: "bg-ok",
  error: "bg-danger",
};

/** Header slot: "Sign in" when signed out; a small owner mark with save status when signed in. */
export function AccountChip() {
  const { status, pending } = useOwner();
  const sync = useSyncStatus();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (pending) {
    return <span aria-hidden className="mx-2 size-7 rounded-full bg-raised" />;
  }

  if (!status?.signedIn) {
    return (
      <Link
        to="/login"
        className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-muted transition-colors duration-150 hover:text-fg"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Desk — ${STATUS_TEXT[sync]}`}
        title={STATUS_TEXT[sync]}
        className="relative inline-flex min-h-11 items-center rounded-md px-2"
      >
        <span className="grid size-7 place-items-center rounded-full bg-raised shadow-[var(--shadow-border)]">
          <TesseraMark className="size-3.5" />
        </span>
        <span
          aria-hidden
          className={cn(
            "absolute right-1.5 bottom-2 size-2 rounded-full ring-2 ring-bg",
            STATUS_DOT[sync],
          )}
        />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-1 w-64 rounded-lg bg-surface p-3 text-sm shadow-[var(--shadow-border-hover)]">
          <p className="text-fg">{status.ownerName}</p>
          <p className="mt-2 flex items-center gap-2 font-mono text-[11px] tracking-wide text-muted">
            <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[sync])} />
            {STATUS_TEXT[sync]}
          </p>
          {status.devOpen ? (
            <p className="mt-2 text-xs text-subtle">
              Local dev, no password set — open on this machine only.
            </p>
          ) : (
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut()
                  .then(() => refreshOwner())
                  .finally(() => {
                    setSigningOut(false);
                    setOpen(false);
                  });
              }}
              className="mt-3 text-muted underline-offset-4 hover:text-fg hover:underline disabled:cursor-wait"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
