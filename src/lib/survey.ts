import type {
  DigestMode,
  Pass4,
  Run,
  Survey,
  SurveyItem,
  SurveyStatus,
  SurveyUnknown,
  SurveyUnmapped,
  SurveyUnmappedKind,
} from "./types";

/**
 * Evidence guards for Survey. Hard rule 4 ("never invent detail") is enforced
 * here in code rather than trusted to the model: whatever the model says, a
 * survey only keeps what the repo digest can back up.
 *
 * - An evidence path counts only if the digest's file list has it.
 * - built / partial / contradicted with no evidence left becomes unverified.
 * - Claims and UNKNOWNs are matched to the blueprint's own lines; anything the
 *   blueprint doesn't say is dropped, and anything the model skipped is kept
 *   as unverified so nothing quietly disappears.
 * - The commit comes from the digest header, never from the model.
 */

const STATUSES: SurveyStatus[] = ["built", "partial", "missing", "contradicted", "unverified"];
const NEEDS_EVIDENCE: SurveyStatus[] = ["built", "partial", "contradicted"];
const UNMAPPED_KINDS: SurveyUnmappedKind[] = [
  "scope creep",
  "incidental hardened",
  "missing from map",
];
const MAX_EVIDENCE = 8;
const MAX_UNMAPPED = 20;
const NO_EVIDENCE = "No evidence in the digest.";
const NOT_MEASURED_DEPTH =
  "Not measured at this depth: the file list was shortened to spend the budget on exports and schema.";

/** Repo paths listed under `## Files` in a digest from scripts/digest.mjs. */
export function digestFiles(digest: string): string[] {
  const lines = digest.split("\n");
  const start = lines.findIndex((l) => /^## Files\b/.test(l));
  if (start < 0) return [];
  const files: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    const path = line.trim();
    if (path && !path.startsWith("(+")) files.push(path);
  }
  return files;
}

/** The commit hash from a digest header, or "unknown". */
export function digestCommit(digest: string): string {
  return digest.match(/^commit:\s*([0-9a-f]{7,40}|unknown)\s*$/m)?.[1] ?? "unknown";
}

/** The digest mode from a digest header. Digests without one were breadth. */
export function digestMode(digest: string): DigestMode {
  return digest.match(/^mode:\s*(breadth|depth)\s*$/m)?.[1] === "depth" ? "depth" : "breadth";
}

/** Undefined means "the default"; anything else must be a known mode. */
export function parseDigestMode(v: unknown): DigestMode | undefined {
  if (v == null) return undefined;
  if (v === "breadth" || v === "depth") return v;
  throw new Error("Unknown digest mode.");
}

/**
 * Bring a model-cited path to the digest's form: POSIX, repo-relative, no
 * quotes, no line numbers (`src/a.ts:42`, `src/a.ts#L42`).
 */
export function normalizePath(p: string): string {
  return p
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, "")
    .replace(/\\/g, "/")
    .replace(/#L\d+(-L?\d+)?$/, "")
    .replace(/:\d+(:\d+)?(-\d+)?$/, "")
    .replace(/^\.?\/+/, "");
}

/** Compare two lines of prose loosely: case, spacing, trailing period. */
function sameText(a: string, b: string): boolean {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[.\s]+$/, "")
      .trim();
  return clean(a) === clean(b);
}

function asString(v: unknown, max = 600): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function asRecords(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object")
    : [];
}

/** Keep only evidence the digest lists; dedupe; cap. */
function keepEvidence(v: unknown, listed: Set<string>): string[] {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
  const kept: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const path = normalizePath(item);
    if (listed.has(path) && !kept.includes(path)) kept.push(path);
    if (kept.length >= MAX_EVIDENCE) break;
  }
  return kept;
}

function guardItem(
  claim: string,
  raw: Record<string, unknown> | undefined,
  listed: Set<string>,
  noEvidence: string = NO_EVIDENCE,
): SurveyItem {
  if (!raw) return { claim, status: "unverified", evidence: [], note: "Not surveyed." };
  const evidence = keepEvidence(raw.evidence, listed);
  const asked = asString(raw.status).toLowerCase() as SurveyStatus;
  let status: SurveyStatus = STATUSES.includes(asked) ? asked : "unverified";
  let note = asString(raw.note);
  if (NEEDS_EVIDENCE.includes(status) && evidence.length === 0) {
    status = "unverified";
    note = note ? `${noEvidence} ${note}` : noEvidence;
  }
  return { claim, status, evidence, note };
}

function guardUnknown(
  unknown: string,
  raw: Record<string, unknown> | undefined,
  listed: Set<string>,
): SurveyUnknown {
  if (!raw) return { unknown, resolvedAs: null, evidence: [] };
  const evidence = keepEvidence(raw.evidence, listed);
  const resolvedAs = asString(raw.resolvedAs) || null;
  return evidence.length && resolvedAs
    ? { unknown, resolvedAs, evidence }
    : { unknown, resolvedAs: null, evidence: [] };
}

function guardUnmapped(raw: Record<string, unknown>[], listed: Set<string>): SurveyUnmapped[] {
  const out: SurveyUnmapped[] = [];
  for (const r of raw) {
    const thing = asString(r.thing, 300);
    const evidence = keepEvidence(r.evidence, listed);
    if (!thing || evidence.length === 0) continue;
    if (out.some((u) => sameText(u.thing, thing))) continue;
    const asked = asString(r.kind).toLowerCase() as SurveyUnmappedKind;
    out.push({
      thing,
      kind: UNMAPPED_KINDS.includes(asked) ? asked : "missing from map",
      evidence,
    });
    if (out.length >= MAX_UNMAPPED) break;
  }
  return out;
}

/**
 * Turn whatever the model returned into a Survey the digest can back up.
 * `raw` may be the whole reply or its `payload`.
 */
export function normalizeSurvey(
  raw: unknown,
  ctx: { blueprint: Pass4; digest: string; id: string; at: string },
): Survey {
  const top = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const body =
    top.payload && typeof top.payload === "object" ? (top.payload as Record<string, unknown>) : top;
  const listed = new Set(digestFiles(ctx.digest));
  const mode = digestMode(ctx.digest);
  const noEvidence = mode === "depth" ? NOT_MEASURED_DEPTH : NO_EVIDENCE;

  const rawItems = asRecords(body.loadBearing);
  const loadBearing = ctx.blueprint.l3.loadBearing.map((claim) =>
    guardItem(
      claim,
      rawItems.find((r) => sameText(asString(r.claim, 2000), claim)),
      listed,
      noEvidence,
    ),
  );

  const rawUnknowns = asRecords(body.unknowns);
  const unknowns = ctx.blueprint.unknowns.map((unknown) =>
    guardUnknown(
      unknown,
      rawUnknowns.find((r) => sameText(asString(r.unknown, 2000), unknown)),
      listed,
    ),
  );

  return {
    id: ctx.id,
    at: ctx.at,
    commit: digestCommit(ctx.digest),
    mode,
    loadBearing,
    unknowns,
    unmapped: guardUnmapped(asRecords(body.unmapped), listed),
    finding: asString(body.finding),
  };
}

/* Exports: the Survey section that rides along in the coding-agent prompt. */

export const shortCommit = (commit: string) =>
  commit === "unknown" ? "unknown commit" : commit.slice(0, 7);
export const cite = (evidence: string[]) => (evidence.length ? ` (${evidence.join(", ")})` : "");

/** The newest survey on a run, if any. */
export function latestSurvey(run: Pick<Run, "surveys">): Survey | undefined {
  const list = run.surveys ?? [];
  return list[list.length - 1];
}

/**
 * Staleness is counted in commits, not days: a commit is the unit of "the code
 * changed". Current defaults, tunable. 0 is fresh, up to AGING_MAX_COMMITS is
 * aging, beyond that stale. "unknown" is a first-class state, never a guess.
 */
export const AGING_MAX_COMMITS = 10;
export type Staleness = "fresh" | "aging" | "stale" | "unknown";

export function stalenessOf(commitsSince: number | "unknown"): Staleness {
  if (commitsSince === "unknown" || !Number.isFinite(commitsSince) || commitsSince < 0) {
    return "unknown";
  }
  if (commitsSince === 0) return "fresh";
  return commitsSince <= AGING_MAX_COMMITS ? "aging" : "stale";
}

/** The staleness line for a survey, in the words the agent prompt uses. */
export function stalenessNote(survey: Survey, commitsSince?: number | "unknown"): string {
  const at = shortCommit(survey.commit);
  const state = commitsSince === undefined ? "unknown" : stalenessOf(commitsSince);
  if (state === "fresh") return "";
  if (state === "aging" || state === "stale") {
    return `Note: ${commitsSince} ${commitsSince === 1 ? "commit has" : "commits have"} landed since this survey (taken at ${at}). Treat findings as ${state === "stale" ? "provisional and re-survey first" : "possibly out of date"}.`;
  }
  if (survey.commit === "unknown") {
    return "Note: this survey has no commit on record, so its age can't be measured. Treat findings as provisional.";
  }
  return `Note: this survey was taken at ${at}. Before trusting it, run \`git rev-list --count ${survey.commit}..HEAD\`. If that is more than ${AGING_MAX_COMMITS}, treat findings as provisional.`;
}

/**
 * Survey section for the coding-agent prompt: only the gap. What's built is
 * named so the agent doesn't redo it; contradictions come first because they
 * need the operator's call before anyone touches them.
 */
export function surveyToPrompt(
  survey: Survey,
  opts: { commitsSince?: number | "unknown" } = {},
): string {
  const by = (s: string) => survey.loadBearing.filter((i) => i.status === s);
  const contradicted = by("contradicted");
  const todo = [...by("missing"), ...by("partial")];
  const unverified = by("unverified");
  const built = by("built");
  const resolved = survey.unknowns.filter((u) => u.resolvedAs);
  const section = (title: string, lines: string[]) =>
    lines.length ? [`### ${title}`, ...lines].join("\n") : "";

  return [
    `## Survey — code at ${shortCommit(survey.commit)}, ${survey.at.slice(0, 10)}`,
    "The code is the truth. These lines say where it stands against the blueprint above.",
    stalenessNote(survey, opts.commitsSince),
    section(
      "Contradicted — stop and ask the operator before touching",
      contradicted.map((i) => `- ${i.claim}${i.note ? ` — ${i.note}` : ""}${cite(i.evidence)}`),
    ),
    section(
      "Build next",
      todo.map(
        (i) => `- [${i.status}] ${i.claim}${i.note ? ` — ${i.note}` : ""}${cite(i.evidence)}`,
      ),
    ),
    section(
      "Unverified — check before assuming either way",
      unverified.map((i) => `- ${i.claim}`),
    ),
    section(
      "Already built — do not redo",
      built.map((i) => `- ${i.claim}${cite(i.evidence)}`),
    ),
    section(
      "UNKNOWNs the code has settled",
      resolved.map((u) => `- ${u.unknown} → ${u.resolvedAs}${cite(u.evidence)}`),
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}
