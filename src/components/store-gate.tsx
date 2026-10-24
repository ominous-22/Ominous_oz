import { useEffect, type ReactNode } from "react";
import { useCartographer } from "@/lib/store";
import { DeskSync } from "./desk-sync";

export function StoreGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    const finish = () => {
      useCartographer.getState().ensureSeed();
      useCartographer.getState().markHydrated();
    };
    const unsub = useCartographer.persist.onFinishHydration(finish);
    void useCartographer.persist.rehydrate();
    if (useCartographer.persist.hasHydrated()) finish();
    const fallback = window.setTimeout(finish, 400);
    return () => {
      unsub();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <>
      <DeskSync />
      {children}
    </>
  );
}
