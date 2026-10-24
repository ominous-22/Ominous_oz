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
} from "./types";

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
