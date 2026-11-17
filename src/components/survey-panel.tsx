import { useEffect, useState } from "react";
import { getRepoCommit, runSurvey } from "@/lib/cartographer";
import { AGING_MAX_COMMITS, latestSurvey, shortCommit, stalenessOf } from "@/lib/survey";
import type { Staleness } from "@/lib/survey";
import { useCartographer } from "@/lib/store";
import { markSignedOut } from "@/lib/use-owner";
import type { DigestMode, Run, Survey, SurveyStatus } from "@/lib/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const STATUS_TONE: Record<SurveyStatus, "ok" | "accent" | "warn" | "danger" | "muted"> = {
  built: "ok",
  partial: "accent",
  missing: "warn",
  contradicted: "danger",
  unverified: "muted",
};

const STALE_TONE: Record<Staleness, "ok" | "accent" | "warn" | "muted"> = {
  fresh: "ok",
  aging: "accent",
  stale: "warn",
  unknown: "muted",
};

const MODE_HELP: Record<DigestMode, string> = {
  breadth: "Breadth lists more files, so more claims can be checked. Shallower on each file.",
  depth:
    "Depth shows more exports and schema per file, but lists fewer files. Claims outside the list read as not measured.",
};

type Drift = { commitsSince: number | "unknown" };

const STATUS_ORDER: SurveyStatus[] = ["contradicted", "missing", "partial", "unverified", "built"];

const PATH_KEY = (runId: string) => `ic-survey-path:${runId}`;

function readPath(runId: string): string {
  try {
    return window.localStorage.getItem(PATH_KEY(runId)) ?? "";
  } catch {
    return "";
  }
}

function savePath(runId: string, path: string) {
  try {
    window.localStorage.setItem(PATH_KEY(runId), path);
  } catch {
    /* per-viewer convenience only */
  }
}

/**
 * Survey: after a seal, check the Pass 4 blueprint against the code. The code
 * is the truth; this panel reports drift and leaves the call to the operator.
 */
export function SurveyPanel({ run }: { run: Run }) {
  const addSurvey = useCartographer((s) => s.addSurvey);
  const blueprint = run.passes[4];
  const surveys = run.surveys ?? [];
  const [mode, setMode] = useState<"path" | "paste">("path");
  const [repoPath, setRepoPath] = useState("");
  const [digest, setDigest] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [digestMode, setDigestMode] = useState<DigestMode>("breadth");
  const [drift, setDrift] = useState<Record<string, Drift>>({});

  useEffect(() => {
    setRepoPath(readPath(run.id));
  }, [run.id]);

  const watched = surveys.find((s) => s.id === viewing) ?? latestSurvey(run);
  const watchedId = watched?.id;
  const watchedCommit = watched?.commit;

  // How far the repo has moved since the survey being viewed. Quiet on any
  // failure: staleness stays "unknown" instead of guessing.
  useEffect(() => {
    const path = readPath(run.id);
    if (!watchedId || !watchedCommit || !run.sealed || !path) return;
    let live = true;
    getRepoCommit({ data: { repoPath: path, since: watchedCommit } })
      .then((r) => {
        if (live)
          setDrift((d) => ({ ...d, [watchedId]: { commitsSince: r.commitsSince ?? "unknown" } }));
      })
      .catch(() => {
        if (live) setDrift((d) => ({ ...d, [watchedId]: { commitsSince: "unknown" } }));
      });
    return () => {
      live = false;
    };
  }, [run.id, run.sealed, watchedId, watchedCommit, surveys.length]);

  if (!blueprint) return null;

  if (!run.sealed) {
    return (
      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <Eyebrow>Survey</Eyebrow>
        <p className="mt-2 text-sm text-muted">
          Seal the run to survey it. A survey checks the sealed map against the code you build from
          it.
        </p>
      </section>
    );
  }

  const shown: Survey | undefined = surveys.find((s) => s.id === viewing) ?? latestSurvey(run);

  async function go(again?: { mode: DigestMode }) {
    if (!blueprint) return;
    setBusy(true);
    setError(null);
    try {
      const viaPath = again ? true : mode === "path";
      const path = (again ? readPath(run.id) : repoPath).trim();
      const result = await runSurvey({
        data: {
          title: run.title,
          blueprint,
          ledger: run.ledger,
          digest: viaPath ? undefined : digest,
          repoPath: viaPath ? path : undefined,
          priorCommit: latestSurvey(run)?.commit,
          mode: again?.mode ?? digestMode,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (viaPath) savePath(run.id, path);
      addSurvey(run.id, result.survey);
      setViewing(result.survey.id);
      if (!viaPath) setDigest("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "Unauthorized") markSignedOut();
      setError(
        message === "Unauthorized"
          ? "Sign in to run a survey — use Sign in at the top right."
          : message || "The survey failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  const ready = mode === "path" ? repoPath.trim().length > 0 : digest.trim().length > 0;

  return (
    <section className="flex flex-col gap-5 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] md:p-5">
      <header className="flex flex-col gap-1">
        <Eyebrow>Survey</Eyebrow>
        <h2 className="font-display text-2xl tracking-tight">Check the map against the code</h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted">
          The code is the truth. Each load-bearing line gets a status, and only files the digest
          lists count as evidence. Nothing here edits the code or the map.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2" role="tablist" aria-label="Where the code is">
          <Button
            size="sm"
            variant={mode === "path" ? "secondary" : "ghost"}
            role="tab"
            aria-selected={mode === "path"}
            onClick={() => setMode("path")}
          >
            Repo folder
          </Button>
          <Button
            size="sm"
            variant={mode === "paste" ? "secondary" : "ghost"}
            role="tab"
            aria-selected={mode === "paste"}
            onClick={() => setMode("paste")}
          >
            Paste digest
          </Button>
        </div>

        {mode === "path" ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="survey-path" className="text-sm text-muted">
              A folder on the machine this desk's server runs on.
            </label>
            <Input
              id="survey-path"
              value={repoPath}
              placeholder="/home/you/code/my-repo"
              spellCheck={false}
              onChange={(e) => setRepoPath(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="survey-digest" className="text-sm text-muted">
              Make a digest from this repo's folder, then paste it here:
            </label>
            <pre className="overflow-auto rounded-md bg-raised px-3 py-2 font-mono text-xs text-fg shadow-[var(--shadow-border)]">
              npm run digest -- /path/to/repo &gt; digest.md
            </pre>
            <Textarea
              id="survey-digest"
              rows={6}
              value={digest}
              placeholder="# Repo digest&#10;commit: …"
              spellCheck={false}
              className="font-mono text-xs"
              onChange={(e) => setDigest(e.target.value)}
            />
          </div>
        )}

        {mode === "path" ? (
          <div className="flex flex-col gap-1">
            <div
              className="flex gap-2"
              role="radiogroup"
              aria-label="How the digest spends its budget"
            >
              {(["breadth", "depth"] as const).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={digestMode === m ? "secondary" : "ghost"}
                  role="radio"
                  aria-checked={digestMode === m}
                  onClick={() => setDigestMode(m)}
                >
                  {m === "breadth" ? "Breadth" : "Depth"}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted">{MODE_HELP[digestMode]}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void go()} disabled={busy || !ready}>
            {surveys.length ? "Survey again" : "Run survey"}
          </Button>
          {busy ? (
            <p className="shimmer-text font-display text-lg italic">Walking the ground…</p>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}
      </div>

      {surveys.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-subtle">Surveys</span>
          {[...surveys].reverse().map((s) => (
            <Button
              key={s.id}
              size="sm"
              variant={shown?.id === s.id ? "secondary" : "ghost"}
              onClick={() => setViewing(s.id)}
            >
              <span className="font-mono">{shortCommit(s.commit)}</span>
              <span className="text-subtle">{s.at.slice(0, 10)}</span>
            </Button>
          ))}
        </div>
      ) : null}

      {shown ? (
        <SurveyView
          survey={shown}
          commitsSince={drift[shown.id]?.commitsSince}
          busy={busy}
          onResurvey={
            readPath(run.id) ? () => void go({ mode: shown.mode ?? "breadth" }) : undefined
          }
        />
      ) : null}
    </section>
  );
}

function SurveyView({
  survey,
  commitsSince,
  busy,
  onResurvey,
}: {
  survey: Survey;
  commitsSince?: number | "unknown";
  busy: boolean;
  onResurvey?: () => void;
}) {
  const staleness = stalenessOf(commitsSince ?? "unknown");
  const counts = STATUS_ORDER.map(
    (s) => [s, survey.loadBearing.filter((i) => i.status === s).length] as const,
  ).filter(([, n]) => n > 0);
  const items = [...survey.loadBearing].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );
  const resolved = survey.unknowns.filter((u) => u.resolvedAs);
  const open = survey.unknowns.filter((u) => !u.resolvedAs);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-subtle">
          {shortCommit(survey.commit)} · {survey.at.slice(0, 10)}
        </span>
        <span className="font-mono text-xs text-subtle">{survey.mode ?? "breadth"}</span>
        {counts.map(([s, n]) => (
          <Badge key={s} tone={STATUS_TONE[s]}>
            {n} {s}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STALE_TONE[staleness]}>
          {staleness === "fresh"
            ? "Fresh: no commits since"
            : staleness === "unknown"
              ? "Age unknown: can't count commits"
              : `${staleness === "aging" ? "Aging" : "Stale"}: ${commitsSince} commit${commitsSince === 1 ? "" : "s"} since`}
        </Badge>
        {staleness === "stale" || staleness === "aging" ? (
          <p className="text-xs text-muted">
            Stale means more than {AGING_MAX_COMMITS} commits since the survey. Findings may no
            longer describe the code.
          </p>
        ) : null}
        {staleness === "stale" && onResurvey ? (
          <Button size="sm" onClick={onResurvey} disabled={busy}>
            Re-survey now
          </Button>
        ) : null}
      </div>

      <div>
        <Eyebrow>Load-bearing</Eyebrow>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-muted">The blueprint marked nothing load-bearing.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {items.map((i) => (
              <li key={i.claim} className="rounded-lg bg-raised p-3 shadow-[var(--shadow-border)]">
                <div className="flex flex-wrap items-start gap-2">
                  <Badge tone={STATUS_TONE[i.status]}>{i.status}</Badge>
                  <p className="min-w-0 flex-1 text-sm leading-relaxed text-fg">{i.claim}</p>
                </div>
                {i.note ? <p className="mt-2 text-sm text-muted">{i.note}</p> : null}
                <Evidence paths={i.evidence} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {survey.unknowns.length ? (
        <div>
          <Eyebrow>UNKNOWNs</Eyebrow>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {resolved.map((u) => (
              <li key={u.unknown}>
                <span className="text-muted">{u.unknown}</span>{" "}
                <span className="text-ok">→ {u.resolvedAs}</span>
                <Evidence paths={u.evidence} />
              </li>
            ))}
            {open.map((u) => (
              <li key={u.unknown} className="text-muted">
                {u.unknown} <span className="font-mono text-xs text-subtle">still open</span>
              </li>
            ))}
          </ul>
          {resolved.length ? (
            <p className="mt-2 text-xs text-subtle">
              Resolved by code at {shortCommit(survey.commit)}. Fold these into the map on your next
              run if they're the right call.
            </p>
          ) : null}
        </div>
      ) : null}

      {survey.unmapped.length ? (
        <div>
          <Eyebrow>In the code, not on the map</Eyebrow>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {survey.unmapped.map((u) => (
              <li key={u.thing}>
                <Badge tone={u.kind === "scope creep" ? "warn" : "muted"}>{u.kind}</Badge>{" "}
                <span className="text-fg">{u.thing}</span>
                <Evidence paths={u.evidence} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {survey.finding ? (
        <blockquote className="border-l-2 border-accent/50 pl-4 font-display text-xl leading-snug text-fg italic">
          {survey.finding}
        </blockquote>
      ) : null}

      <p className="text-xs text-subtle">
        The latest survey rides along in Copy prompt, so the next coding session only gets the gap.
      </p>
    </div>
  );
}

function Evidence({ paths }: { paths: string[] }) {
  if (!paths.length) return null;
  return (
    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-subtle">
      {paths.map((p) => (
        <span key={p} className="break-all">
          {p}
        </span>
      ))}
    </p>
  );
}

function Eyebrow({ children }: { children: string }) {
  return <p className="font-mono text-xs tracking-widest text-subtle uppercase">{children}</p>;
}
