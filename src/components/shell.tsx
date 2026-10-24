import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AccountChip } from "./account-chip";
import { TesseraMark } from "./mark";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Desk" },
  { to: "/quiz", label: "Quiz" },
  { to: "/new", label: "New run" },
  { to: "/protocol", label: "Protocol" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-hairline bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2">
          <Link to="/" className="flex min-h-11 shrink-0 items-center gap-2.5 text-fg">
            <TesseraMark className="size-5" />
            <span className="font-display text-lg tracking-tight">
              Idea Cartographer
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-md px-3 text-sm transition-colors duration-150",
                    active ? "bg-raised text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <AccountChip />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
