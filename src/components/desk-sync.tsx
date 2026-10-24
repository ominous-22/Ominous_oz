import { useEffect, useSyncExternalStore } from "react";
import { deskKey, mergeDesks, type Desk } from "@/lib/desk";
import { useCartographer } from "@/lib/store";
import { loadDesk, saveDesk } from "@/lib/sync";
import { markSignedOut, useOwner } from "@/lib/use-owner";

export type SyncStatus = "local" | "syncing" | "saved" | "error";

let status: SyncStatus = "local";
const listeners = new Set<() => void>();
function setStatus(next: SyncStatus) {
  if (next === status) return;
  status = next;
  listeners.forEach((l) => l());
}

/** "local" signed out · "syncing" · "saved" · "error" (kept locally, will retry). */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => "local" as SyncStatus,
  );
}

function localDesk(): Desk {
  const s = useCartographer.getState();
  return { runs: s.runs, operatorLog: s.operatorLog, deleted: s.deleted };
}

const SAVE_DELAY_MS = 1200;
const RETRY_MS = 30_000;

/**
 * Keeps the browser copy of the desk and the signed-in account's saved desk in
 * step. The browser copy stays the thing the pages read, so nothing waits on the
 * network; the server copy is what survives a cleared browser or a new device.
 */
function unauthorized(err: unknown): boolean {
  return err instanceof Error && err.message === "Unauthorized";
}

export function DeskSync() {
  const { status: owner, pending: isPending } = useOwner();
  const hydrated = useCartographer((s) => s.hydrated);
  const userId = owner?.signedIn ? "owner" : null;

  useEffect(() => {
    if (isPending || !hydrated || !userId) {
      if (!isPending && !userId) setStatus("local");
      return;
    }

    let stopped = false;
    let ready = false;
    let lastSaved = "";
    let timer: number | undefined;
    let saving = false;

    const adopt = (desk: Desk) => {
      if (deskKey(desk) !== deskKey(localDesk())) {
        useCartographer.getState().replaceDesk(desk, userId);
      } else if (useCartographer.getState().ownerId !== userId) {
        useCartographer.setState({ ownerId: userId });
      }
    };

    const save = async () => {
      if (stopped || saving) return;
      const sent = localDesk();
      const sentKey = deskKey(sent);
      if (sentKey === lastSaved) {
        setStatus("saved");
        return;
      }
      saving = true;
      setStatus("syncing");
      try {
        const { desk } = await saveDesk({ data: sent });
        if (stopped) return;
        lastSaved = deskKey(desk);
        // If nothing changed locally while saving, take the merged copy as is;
        // otherwise fold it in and let the next save carry the new edits.
        if (deskKey(localDesk()) === sentKey) adopt(desk);
        else adopt(mergeDesks(desk, localDesk()));
        setStatus(deskKey(localDesk()) === lastSaved ? "saved" : "syncing");
        if (deskKey(localDesk()) !== lastSaved) schedule();
      } catch (err) {
        if (stopped) return;
        if (unauthorized(err)) return markSignedOut();
        setStatus("error");
        window.clearTimeout(timer);
        timer = window.setTimeout(() => void save(), RETRY_MS);
      } finally {
        saving = false;
      }
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void save(), SAVE_DELAY_MS);
    };

    const pull = async () => {
      if (stopped || saving) return;
      setStatus("syncing");
      try {
        const { desk: server } = await loadDesk();
        if (stopped) return;
        // One owner: whatever is in this browser belongs on the desk.
        const local = localDesk();
        const merged = mergeDesks(server, local);
        lastSaved = deskKey(server);
        adopt(merged);
        ready = true;
        if (deskKey(merged) !== lastSaved) await save();
        else setStatus("saved");
      } catch (err) {
        if (stopped) return;
        if (unauthorized(err)) return markSignedOut();
        setStatus("error");
        window.clearTimeout(timer);
        timer = window.setTimeout(() => void pull(), RETRY_MS);
      }
    };

    void pull();

    const unsub = useCartographer.subscribe((s, prev) => {
      if (!ready) return;
      if (
        s.runs === prev.runs &&
        s.operatorLog === prev.operatorLog &&
        s.deleted === prev.deleted
      ) {
        return;
      }
      setStatus("syncing");
      schedule();
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") void pull();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      unsub();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [isPending, hydrated, userId]);

  return null;
}
