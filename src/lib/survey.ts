import type {
  Pass4,
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
): SurveyItem {
  if (!raw) return { claim, status: "unverified", evidence: [], note: "Not surveyed." };
  const evidence = keepEvidence(raw.evidence, listed);
  const asked = asString(raw.status).toLowerCase() as SurveyStatus;
  let status: SurveyStatus = STATUSES.includes(asked) ? asked : "unverified";
  let note = asString(raw.note);
  if (NEEDS_EVIDENCE.includes(status) && evidence.length === 0) {
    status = "unverified";
    note = note ? `${NO_EVIDENCE} ${note}` : NO_EVIDENCE;
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

  const rawItems = asRecords(body.loadBearing);
  const loadBearing = ctx.blueprint.l3.loadBearing.map((claim) =>
    guardItem(
      claim,
      rawItems.find((r) => sameText(asString(r.claim, 2000), claim)),
      listed,
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
    loadBearing,
    unknowns,
    unmapped: guardUnmapped(asRecords(body.unmapped), listed),
    finding: asString(body.finding),
  };
}
