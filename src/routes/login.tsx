import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/owner";
import { refreshOwner, useOwner } from "@/lib/use-owner";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { status, pending } = useOwner();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status?.signedIn) return <Navigate to="/" />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signIn({ data: { password } });
      if (!res.ok) {
        setError(res.error ?? "Sign-in failed.");
        return;
      }
      setPassword("");
      await refreshOwner();
    } catch {
      setError("Sign-in failed. Is the server running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-16 md:py-24">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs tracking-widest text-accent uppercase">
          Your desk
        </p>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Sign in to run passes.
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-muted">
          One password, set on the server. Runs and the operator log save to
          the desk, so a cleared browser or another device doesn’t lose them.
          Anything already on this browser comes with you.
        </p>
      </header>

      {!pending && status && !status.passwordSet ? (
        <p className="rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
          No password is set on this server. Set{" "}
          <code className="font-mono">CARTOGRAPHER_PASSWORD</code> and restart
          it.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label htmlFor="pw" className="sr-only">
            Password
          </label>
          <input
            id="pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl bg-surface px-4 py-3 text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-subtle focus:shadow-[var(--shadow-border-hover)]"
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={!password || busy} className="self-start">
            {busy ? "Checking…" : "Sign in"}
          </Button>
        </form>
      )}
    </main>
  );
}
