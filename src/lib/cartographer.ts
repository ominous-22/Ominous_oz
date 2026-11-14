import { createServerFn } from "@tanstack/react-start";
import { ownerMiddleware } from "@/lib/owner";
import type {
  CartographerRequest,
  CartographerResult,
  Gloss,
  IdeaSlice,
  Pass0,
  Pass1,
  Pass2,
  Pass3,
  Pass4,
  Pass5,
  Pass6,
  PassId,
  Survey,
} from "./types";
import { normalizeSurvey } from "./survey";

const SYSTEM = `You are the Idea Cartographer. Not a cheerleader. Not a co-author. Not a product manager.

The operator's ideas are not underdeveloped. The problem is that they are the only reader, so everything reads as clear to them because they already know what they meant. Your job is to be the reader who doesn't.

Separate the invariant from the instance. Force every idea to three altitudes. Refuse to let a proper noun pass undefined. Say where it stops being legible in the first paragraph, not the last.

Hard rules:
1. Jargon ledger. Track every proper noun, codename, or invented term. Each gets a gloss of twelve words or fewer. If a term has no gloss, stop and ask. Never use an unglossed term back at them.
2. No proper nouns at L1. If the one-sentence version needs one of their names, the idea is not yet articulable. Say so.
3. Invariant before instance. State the pattern that survives if every domain detail is swapped out. If two ideas share an invariant, say so.
4. Never invent detail to fill a gap. Mark it UNKNOWN and ask.
5. Every run ends in a finding about the operator — not a verdict on the idea.
6. One idea per run. If the dump batches two or more, set multipleIdeas true and list them. Do not cartograph a blend.

Three altitudes:
- L1 — the sentence. One sentence, plain English, none of their proper nouns. What it is, who it's for.
- L2 — the paragraph. Five to eight sentences. Their names allowed, each glossed on first use in parentheses. What goes in, what comes out, what decision it changes, why it's hard to copy.
- L3 — the mechanism. Components, data flow, constraints, load-bearing versus incidental.

If they answer at L3 when asked for L1, say so.

Tone: cartographic, exact, slightly stern. No pep. No "great idea". No padding diagrams. Quote them when you catch a tell.

You MUST reply with a single JSON object. No markdown, no fences, no preamble.`;

function passInstructions(pass: PassId): string {
  switch (pass) {
    case 0:
      return `Pass 0 — Dump. Output NOTHING but ledger work. Do not organize the idea.

Return JSON:
{
  "title": "short working title from the dump, 6 words max, no hype",
  "ledger": [{ "term": "string", "gloss": "empty string if unknown", "source": "dump" }],
  "payload": {
    "questions": ["What is X, in twelve words?"],
    "cleanedBeforeDump": false,
    "multipleIdeas": false,
    "ideas": [{ "label": "short name", "excerpt": "one or two sentences quoted or closely paraphrased from the dump" }],
    "notes": "one or two sentences to the operator about the ledger, not the idea"
  }
}

Extract every proper noun, codename, acronym, and invented term. If the dump looks pre-cleaned or outlined, set cleanedBeforeDump true. If two or more distinct ideas were batched, set multipleIdeas true and list each in ideas. Questions only for terms with empty gloss. Do not invent glosses.`;
    case 1:
      return `Pass 1 — Extract. In this exact order: invariant; instance; assumptions; weakest joint; then L1 and L2.

If FOCUS is set, extract ONLY that idea. Ignore sibling ideas in the dump.

Return JSON:
{
  "title": "optional better title",
  "payload": {
    "invariant": "one sentence, no operator proper nouns",
    "instance": "this particular manifestation",
    "assumptions": ["claims that were stated as facts"],
    "weakestJoint": "the single joint most likely to be wrong",
    "l1": "one sentence, plain English, ZERO operator proper nouns",
    "l2": "five to eight sentences; gloss each of their names on first use"
  }
}`;
    case 2:
      return `Pass 2 — Cold read. Load-bearing. Read the L2 as if you have zero prior context and do not work in this domain. Do not soften this.

Return JSON:
{
  "payload": {
    "lostAt": "the EXACT sentence copied from L2 where the thread was lost",
    "firstQuestion": "the first question that reader asks",
    "assumedItIs": "the thing they assume it is",
    "actuallyIsNot": "what it isn't",
    "notes": "where it stopped being legible, first paragraph not last"
  }
}`;
    case 3:
      return `Pass 3 — Map. Tiered visual, NOT a mind map. Title plus FIVE WORDS MAXIMUM per caption.

Return JSON:
{
  "payload": {
    "tier1": [{ "title": "stage", "caption": "five words max" }],
    "tier2": [{ "title": "instance", "caption": "five words max" }],
    "tier3": [{ "title": "standalone piece", "caption": "five words max" }],
    "prose": "everything else — the reading of the map"
  }
}
Tier 1: invariant as sequential stages.
Tier 2: instances, one box each.
Tier 3: pieces that could stand alone.`;
    case 4:
      return `Pass 4 — Blueprint. One page. L1, then L2, then L3 as structure. Open UNKNOWNs listed, unresolved and visible. This page is the payload of a deployable system prompt — keep it exact.

Return JSON:
{
  "payload": {
    "l1": "sentence, no operator proper nouns",
    "l2": "paragraph, names glossed on first use",
    "l3": {
      "components": "string",
      "dataFlow": "string",
      "constraints": "string",
      "loadBearing": ["string"],
      "incidental": ["string"]
    },
    "unknowns": ["UNKNOWN items — do not invent answers"]
  }
}`;
    case 5:
      return `Pass 5 — Sixty-second test. Compress to something sayable out loud in sixty seconds. A test, not a deliverable. If it will not compress, name the unresolved upstream pass.

Return JSON:
{
  "payload": {
    "script": "spoken prose, no bullet list, no stage directions",
    "estimatedSeconds": 60,
    "willCompress": true,
    "sendBackTo": null
  }
}
If it will not compress: willCompress false, sendBackTo like "Pass 2 — the L2 still loses a stranger", script may be empty.`;
    case 6:
      return `Pass 6 — Operator log. A finding about THEM, not a verdict on the idea. One row.

Return JSON:
{
  "payload": {
    "move": "what they did to themselves this run — skipped an altitude, named two things as one, defended an assumption as a fact, buried the point under mechanism, batched two ideas, led with modules, etc.",
    "tell": "the specific sentence from THEIR dump or replies — quote them",
    "repeatCount": 1,
    "priorNote": "whether this failure appeared in prior runs, and how many",
    "tryNext": "ONE thing to try differently next run. One, not a list."
  }
}`;
  }
}

function userPayload(req: CartographerRequest): string {
  const ledger =
    req.ledger.length === 0
      ? "(empty)"
      : req.ledger
          .map((g) => `- ${g.term}: ${g.gloss.trim() ? g.gloss : "UNGLOSSED"}`)
          .join("\n");

  const priorMoves =
    req.priorOperatorMoves && req.priorOperatorMoves.length > 0
      ? req.priorOperatorMoves.map((m, i) => `${i + 1}. ${m}`).join("\n")
      : "(none)";

  return [
    `CURRENT PASS: ${req.pass}`,
    "",
    "DUMP:",
    req.dump,
    "",
    "FOCUS (if the dump was batched, cartograph only this):",
    req.focus?.trim() || "(whole dump)",
    "",
    "LEDGER:",
    ledger,
    "",
    "PRIOR PASS OUTPUTS (JSON):",
    JSON.stringify(req.passes),
    "",
    "OPERATOR REPLY FOR THIS PASS:",
    req.reply?.trim() || "(none)",
    "",
    "PRIOR OPERATOR-LOG MOVES (for repeat count):",
    priorMoves,
    "",
    passInstructions(req.pass),
  ].join("\n");
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced?.[1]) return JSON.parse(fenced[1]);
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("unreadable");
  }
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asBool(v: unknown): boolean {
  return Boolean(v);
}

function asNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asStringArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

function asBoxes(v: unknown): { title: string; caption: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((b) => {
      const o = b as { title?: unknown; caption?: unknown };
      return { title: asString(o.title), caption: asString(o.caption) };
    })
    .filter((b) => b.title);
}

function asIdeas(v: unknown): IdeaSlice[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((i) => {
      const o = i as { label?: unknown; excerpt?: unknown };
      return { label: asString(o.label).trim(), excerpt: asString(o.excerpt).trim() };
    })
    .filter((i) => i.label);
}

function asLedger(v: unknown): Gloss[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const items: Gloss[] = v
    .map((g) => {
      const o = g as { term?: unknown; gloss?: unknown; source?: unknown };
      return {
        term: asString(o.term).trim(),
        gloss: asString(o.gloss).trim(),
        source: o.source === "operator" ? "operator" : "dump",
      } as Gloss;
    })
    .filter((g) => g.term);
  return items;
}

function normalize(
  pass: PassId,
  raw: Record<string, unknown>,
): CartographerResult {
  const payloadRaw = (raw.payload as Record<string, unknown> | undefined) ?? raw;
  const title = asString(raw.title) || undefined;
  const ledger = asLedger(raw.ledger);

  switch (pass) {
    case 0: {
      const payload: Pass0 = {
        questions: asStringArr(payloadRaw.questions),
        cleanedBeforeDump: asBool(payloadRaw.cleanedBeforeDump),
        multipleIdeas: asBool(payloadRaw.multipleIdeas),
        notes: asString(payloadRaw.notes),
        ideas: asIdeas(payloadRaw.ideas),
      };
      return { ok: true, pass, title, ledger, payload };
    }
    case 1: {
      const payload: Pass1 = {
        invariant: asString(payloadRaw.invariant),
        instance: asString(payloadRaw.instance),
        assumptions: asStringArr(payloadRaw.assumptions),
        weakestJoint: asString(payloadRaw.weakestJoint),
        l1: asString(payloadRaw.l1),
        l2: asString(payloadRaw.l2),
      };
      return { ok: true, pass, title, payload };
    }
    case 2: {
      const payload: Pass2 = {
        lostAt: asString(payloadRaw.lostAt),
        firstQuestion: asString(payloadRaw.firstQuestion),
        assumedItIs: asString(payloadRaw.assumedItIs),
        actuallyIsNot: asString(payloadRaw.actuallyIsNot),
        notes: asString(payloadRaw.notes),
      };
      return { ok: true, pass, payload };
    }
    case 3: {
      const payload: Pass3 = {
        tier1: asBoxes(payloadRaw.tier1),
        tier2: asBoxes(payloadRaw.tier2),
        tier3: asBoxes(payloadRaw.tier3),
        prose: asString(payloadRaw.prose),
      };
      return { ok: true, pass, payload };
    }
    case 4: {
      const l3raw = (payloadRaw.l3 as Record<string, unknown> | undefined) ?? {};
      const payload: Pass4 = {
        l1: asString(payloadRaw.l1),
        l2: asString(payloadRaw.l2),
        l3: {
          components: asString(l3raw.components),
          dataFlow: asString(l3raw.dataFlow),
          constraints: asString(l3raw.constraints),
          loadBearing: asStringArr(l3raw.loadBearing),
          incidental: asStringArr(l3raw.incidental),
        },
        unknowns: asStringArr(payloadRaw.unknowns),
      };
      return { ok: true, pass, payload };
    }
    case 5: {
      const payload: Pass5 = {
        script: asString(payloadRaw.script),
        estimatedSeconds: asNum(payloadRaw.estimatedSeconds, 60),
        willCompress: payloadRaw.willCompress === false ? false : true,
        sendBackTo: payloadRaw.sendBackTo
          ? asString(payloadRaw.sendBackTo)
          : null,
      };
      return { ok: true, pass, payload };
    }
    case 6: {
      const payload: Pass6 = {
        move: asString(payloadRaw.move),
        tell: asString(payloadRaw.tell),
        repeatCount: Math.max(1, Math.round(asNum(payloadRaw.repeatCount, 1))),
        priorNote: asString(payloadRaw.priorNote),
        tryNext: asString(payloadRaw.tryNext),
      };
      return { ok: true, pass, payload };
    }
  }
}

/**
 * The model: any OpenAI-compatible chat endpoint, by default your local
 * llama.cpp server (the same default SPEC-1 uses). Nothing leaves your machine
 * unless you point CARTOGRAPHER_LLM_URL somewhere else.
 *
 *   CARTOGRAPHER_LLM_URL      base URL ending in /v1   (default http://localhost:5272/v1)
 *   CARTOGRAPHER_LLM_MODEL    model name to request    (default "local"; llama.cpp ignores it,
 *                                                       Ollama needs the real name)
 *   CARTOGRAPHER_LLM_KEY      bearer token, if your server wants one
 *   CARTOGRAPHER_LLM_TIMEOUT  seconds per call         (default 180)
 */
function modelConfig() {
  const e = (k: string) => process.env[k]?.trim() || undefined;
  const timeout = Number(e("CARTOGRAPHER_LLM_TIMEOUT") ?? 180);
  return {
    url: (e("CARTOGRAPHER_LLM_URL") ?? "http://localhost:5272/v1").replace(/\/+$/, ""),
    model: e("CARTOGRAPHER_LLM_MODEL") ?? "local",
    key: e("CARTOGRAPHER_LLM_KEY"),
    timeoutMs: (Number.isFinite(timeout) && timeout > 0 ? timeout : 180) * 1000,
  };
}

/** Local reasoning models often wrap their answer in a <think> block; drop it. */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^[\s\S]*<\/think>/i, "").trim();
}

/** Size caps for everything a client can send to the model. */
const MAX = {
  dump: 60_000,
  reply: 10_000,
  focus: 600,
  ledgerItems: 300,
  term: 120,
  gloss: 300,
  passesJson: 80_000,
  priorMoves: 100,
  move: 600,
};

function str(v: unknown, max: number, label: string): string {
  const text = typeof v === "string" ? v : v == null ? "" : String(v);
  if (text.length > max) {
    throw new Error(`${label} is too long (${text.length} characters, limit ${max}).`);
  }
  return text;
}

/** Rebuild the request from known fields only, rejecting anything oversized. */
function validateRequest(input: unknown): CartographerRequest {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const pass = Number(o.pass);
  if (!Number.isInteger(pass) || pass < 0 || pass > 6) throw new Error("Unknown pass.");
  const dump = str(o.dump, MAX.dump, "The dump");
  if (!dump.trim()) throw new Error("The dump is empty.");

  const ledgerRaw = Array.isArray(o.ledger) ? o.ledger : [];
  if (ledgerRaw.length > MAX.ledgerItems) throw new Error("The ledger has too many terms.");
  const ledger: Gloss[] = ledgerRaw.map((g) => {
    const x = (g ?? {}) as Record<string, unknown>;
    return {
      term: str(x.term, MAX.term, "A ledger term"),
      gloss: str(x.gloss, MAX.gloss, "A gloss"),
      source: x.source === "operator" ? "operator" : "dump",
    };
  });

  const passes = (
    o.passes && typeof o.passes === "object" ? o.passes : {}
  ) as CartographerRequest["passes"];
  if (JSON.stringify(passes).length > MAX.passesJson) {
    throw new Error("Earlier pass output is too large.");
  }

  const movesRaw = Array.isArray(o.priorOperatorMoves) ? o.priorOperatorMoves : [];
  const priorOperatorMoves = movesRaw
    .slice(0, MAX.priorMoves)
    .map((m) => str(m, MAX.move, "An operator-log move"));

  return {
    pass: pass as PassId,
    dump,
    ledger,
    passes,
    reply: o.reply == null ? undefined : str(o.reply, MAX.reply, "Your reply"),
    focus: o.focus == null ? undefined : str(o.focus, MAX.focus, "The focus"),
    priorOperatorMoves,
  };
}

type Message = { role: string; content: string };
type ModelReply = { ok: true; text: string } | { ok: false; error: string };

async function callModel(messages: Message[]): Promise<ModelReply> {
  const cfg = modelConfig();
  const send = (jsonMode: boolean) =>
    fetch(`${cfg.url}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(cfg.timeoutMs),
      headers: {
        "Content-Type": "application/json",
        ...(cfg.key ? { Authorization: `Bearer ${cfg.key}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.35,
        max_tokens: 4096,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
    });

  let res: Response;
  try {
    res = await send(true);
    // Some local servers reject response_format; the prompt already demands JSON.
    if (res.status === 400) res = await send(false);
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return {
      ok: false,
      error: timedOut
        ? `The local model took longer than ${cfg.timeoutMs / 1000}s. Try the pass again, or raise CARTOGRAPHER_LLM_TIMEOUT.`
        : `Can't reach the local model at ${cfg.url}. Is it running?`,
    };
  }

  if (!res.ok) {
    return { ok: false, error: `The local model answered ${res.status}. Try the pass again.` };
  }

  let body: { choices?: { message?: { content?: string } }[] };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    return { ok: false, error: "The local model sent something that isn't JSON." };
  }
  const text = stripThinking(body.choices?.[0]?.message?.content ?? "");
  if (!text) return { ok: false, error: "The cartographer returned an empty page." };
  return { ok: true, text };
}

/** Whether the local model answers at all (quick check for the New run page). */
export const getCartographerStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ available: boolean }> => {
    const cfg = modelConfig();
    try {
      const res = await fetch(`${cfg.url}/models`, {
        signal: AbortSignal.timeout(2500),
        headers: cfg.key ? { Authorization: `Bearer ${cfg.key}` } : {},
      });
      return { available: res.ok };
    } catch {
      return { available: false };
    }
  },
);

export const runCartographerPass = createServerFn({ method: "POST" })
  .validator(validateRequest)
  .middleware([ownerMiddleware])
  .handler(async ({ data }): Promise<CartographerResult> => {
    const messages: Message[] = [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPayload(data) },
    ];

    let call = await callModel(messages);
    if (!call.ok) return call;

    try {
      const raw = extractJson(call.text) as Record<string, unknown>;
      return normalize(data.pass, raw);
    } catch {
      call = await callModel([
        ...messages,
        { role: "assistant", content: call.text },
        {
          role: "user",
          content: "Your last reply was not valid JSON. Reply again with ONLY the JSON object specified.",
        },
      ]);
      if (!call.ok) return call;
      try {
        const raw = extractJson(call.text) as Record<string, unknown>;
        return normalize(data.pass, raw);
      } catch {
        return {
          ok: false,
          error: "The cartographer returned an unreadable page. Run the pass again.",
        };
      }
    }
  });

/* ------------------------------------------------------------------------- */
/* Survey — drift check of a sealed blueprint against the code that was built */
/* ------------------------------------------------------------------------- */

const SURVEY_SYSTEM = `You are the Idea Cartographer, running a Survey. A survey checks the map against the ground.

The operator sealed a blueprint (Pass 4) and then built some of it. You get the blueprint and a digest of the repo: commit, file list, dependencies, schema, exported names. Your job is to say, for each load-bearing line of the blueprint, whether the code shows it.

Hard rules:
1. The code is the ground truth. You never suggest editing the code to match the map, or the map to match the code. You report drift; the operator decides.
2. Evidence is a file path from the digest's file list, copied exactly. Nothing else counts. Do not cite a file that is not listed.
3. Never invent detail. If the digest does not show it, the status is "unverified", not "built". A file name that sounds right is not proof; the exports or schema must back it.
4. "contradicted" means the code clearly took a different path than the line says. Say what it did instead.
5. An UNKNOWN is resolved only when the digest shows what the code decided. Otherwise resolvedAs is null.
6. "unmapped" lists things the code has that the blueprint never mentions. kind is "scope creep" (new and not asked for), "incidental hardened" (an incidental detail the code turned into structure), or "missing from map" (something the map should have had).
7. End with one finding about the operator, not a verdict on the code. One or two sentences. Example: "Built three incidental pieces before any load-bearing one."

Tone: cartographic, exact, slightly stern. No pep.

You MUST reply with a single JSON object. No markdown, no fences, no preamble.`;

const SURVEY_SHAPE = `Return JSON:
{
  "loadBearing": [
    {
      "claim": "the load-bearing line, copied verbatim",
      "status": "built | partial | missing | contradicted | unverified",
      "evidence": ["path/from/the/file/list"],
      "note": "one sentence: what the digest shows, or what is missing"
    }
  ],
  "unknowns": [
    { "unknown": "the UNKNOWN, copied verbatim", "resolvedAs": "what the code decided, or null", "evidence": ["path"] }
  ],
  "unmapped": [
    { "thing": "short name", "kind": "scope creep | incidental hardened | missing from map", "evidence": ["path"] }
  ],
  "finding": "one or two sentences about the operator"
}

Include every load-bearing line and every UNKNOWN exactly once, in order.`;

export type SurveyRequest = {
  title: string;
  blueprint: Pass4;
  ledger: Gloss[];
  /** A digest from scripts/digest.mjs, pasted in. */
  digest?: string;
  /** Or a folder the server can read; the server builds the digest itself. */
  repoPath?: string;
  /** The last survey's commit, so the model can say what moved. */
  priorCommit?: string;
};

export type SurveyResult =
  { ok: true; survey: Survey; digestChars: number } | { ok: false; error: string };

const SURVEY_MAX = {
  digest: 40_000,
  repoPath: 1_000,
  title: 300,
  blueprintJson: 40_000,
};

function validateSurveyRequest(input: unknown): SurveyRequest {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const b = (o.blueprint && typeof o.blueprint === "object" ? o.blueprint : null) as Pass4 | null;
  if (!b || !b.l3 || !Array.isArray(b.l3.loadBearing) || !Array.isArray(b.unknowns)) {
    throw new Error("This run has no Pass 4 blueprint to survey.");
  }
  if (JSON.stringify(b).length > SURVEY_MAX.blueprintJson) {
    throw new Error("The blueprint is too large to survey.");
  }
  const blueprint: Pass4 = {
    l1: str(b.l1, 2_000, "L1"),
    l2: str(b.l2, 8_000, "L2"),
    l3: {
      components: str(b.l3.components, 8_000, "Components"),
      dataFlow: str(b.l3.dataFlow, 8_000, "Data flow"),
      constraints: str(b.l3.constraints, 8_000, "Constraints"),
      loadBearing: b.l3.loadBearing.slice(0, 40).map((x) => str(x, 1_000, "A load-bearing line")),
      incidental: (Array.isArray(b.l3.incidental) ? b.l3.incidental : [])
        .slice(0, 40)
        .map((x) => str(x, 1_000, "An incidental line")),
    },
    unknowns: b.unknowns.slice(0, 40).map((x) => str(x, 1_000, "An UNKNOWN")),
  };
  const ledgerRaw = Array.isArray(o.ledger) ? o.ledger.slice(0, MAX.ledgerItems) : [];
  const ledger: Gloss[] = ledgerRaw.map((g) => {
    const x = (g ?? {}) as Record<string, unknown>;
    return {
      term: str(x.term, MAX.term, "A ledger term"),
      gloss: str(x.gloss, MAX.gloss, "A gloss"),
      source: x.source === "operator" ? "operator" : "dump",
    };
  });
  const digest = o.digest == null ? undefined : str(o.digest, SURVEY_MAX.digest, "The digest");
  const repoPath =
    o.repoPath == null ? undefined : str(o.repoPath, SURVEY_MAX.repoPath, "The repo path").trim();
  if (!digest?.trim() && !repoPath) {
    throw new Error("Paste a repo digest, or give a repo folder the server can read.");
  }
  return {
    title: str(o.title, SURVEY_MAX.title, "The title"),
    blueprint,
    ledger,
    digest: digest?.trim() || undefined,
    repoPath: repoPath || undefined,
    priorCommit: typeof o.priorCommit === "string" ? o.priorCommit.slice(0, 64) : undefined,
  };
}

function surveyPayload(req: SurveyRequest, digest: string): string {
  const p4 = req.blueprint;
  const ledger = req.ledger.length
    ? req.ledger.map((g) => `- ${g.term}: ${g.gloss.trim() || "UNGLOSSED"}`).join("\n")
    : "(empty)";
  return [
    `RUN: ${req.title || "(untitled)"}`,
    "",
    `L1: ${p4.l1}`,
    "",
    `L2: ${p4.l2}`,
    "",
    `Components: ${p4.l3.components}`,
    `Data flow: ${p4.l3.dataFlow}`,
    `Constraints: ${p4.l3.constraints}`,
    "",
    "LOAD-BEARING (survey each, copy verbatim):",
    ...(p4.l3.loadBearing.length ? p4.l3.loadBearing.map((x) => `- ${x}`) : ["(none)"]),
    "",
    "INCIDENTAL (not requirements; flag if the code hardened them):",
    ...(p4.l3.incidental.length ? p4.l3.incidental.map((x) => `- ${x}`) : ["(none)"]),
    "",
    "UNKNOWNs (copy verbatim):",
    ...(p4.unknowns.length ? p4.unknowns.map((x) => `- ${x}`) : ["(none)"]),
    "",
    "LEDGER:",
    ledger,
    "",
    req.priorCommit ? `LAST SURVEY WAS AT COMMIT: ${req.priorCommit}` : "FIRST SURVEY OF THIS RUN.",
    "",
    "REPO DIGEST:",
    digest,
    "",
    SURVEY_SHAPE,
  ].join("\n");
}

/** Build a digest of a folder on the server's own machine. */
async function digestFromPath(repoPath: string): Promise<string> {
  const { statSync } = await import("node:fs");
  try {
    if (!statSync(repoPath).isDirectory()) throw new Error();
  } catch {
    throw new Error(`The server can't see a folder at ${repoPath}.`);
  }
  const { buildDigest } = await import("../../scripts/digest.mjs");
  return buildDigest(repoPath);
}

export const runSurvey = createServerFn({ method: "POST" })
  .validator(validateSurveyRequest)
  .middleware([ownerMiddleware])
  .handler(async ({ data }): Promise<SurveyResult> => {
    let digest: string;
    try {
      digest = data.digest ?? (await digestFromPath(data.repoPath ?? ""));
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Could not read the repo." };
    }
    if (!/^## Files\b/m.test(digest)) {
      return {
        ok: false,
        error:
          'That doesn\'t look like a repo digest (no "## Files" section). Make one with npm run digest.',
      };
    }

    const messages: Message[] = [
      { role: "system", content: SURVEY_SYSTEM },
      { role: "user", content: surveyPayload(data, digest) },
    ];
    const finish = (text: string): SurveyResult => ({
      ok: true,
      survey: normalizeSurvey(extractJson(text), {
        blueprint: data.blueprint,
        digest,
        id: `sv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        at: new Date().toISOString(),
      }),
      digestChars: digest.length,
    });

    let call = await callModel(messages);
    if (!call.ok) return call;
    try {
      return finish(call.text);
    } catch {
      call = await callModel([
        ...messages,
        { role: "assistant", content: call.text },
        {
          role: "user",
          content:
            "Your last reply was not valid JSON. Reply again with ONLY the JSON object specified.",
        },
      ]);
      if (!call.ok) return call;
      try {
        return finish(call.text);
      } catch {
        return { ok: false, error: "The survey came back unreadable. Run it again." };
      }
    }
  });
