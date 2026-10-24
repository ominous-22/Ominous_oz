import { useEffect, useSyncExternalStore } from "react";
import { getOwnerStatus, type OwnerStatus } from "./owner";

/** null while the first status check is in flight. */
let current: OwnerStatus | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: OwnerStatus | null) {
  current = next;
  listeners.forEach((l) => l());
}

/** Re-check with the server (after sign-in / sign-out, or on first mount). */
export function refreshOwner(): Promise<void> {
  inflight ??= getOwnerStatus()
    .then((s) => publish(s))
    .catch(() => publish({ signedIn: false, passwordSet: true, devOpen: false }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Mark signed out locally, e.g. when a server call answered "Unauthorized". */
export function markSignedOut() {
  if (current?.signedIn) publish({ ...current, signedIn: false });
}

export function useOwner(): { status: OwnerStatus | null; pending: boolean } {
  const status = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
  useEffect(() => {
    if (!current) void refreshOwner();
  }, []);
  return { status, pending: status === null };
}
