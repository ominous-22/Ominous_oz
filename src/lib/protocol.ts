import type { Gloss, PassId, Run } from "./types";
import { containsTerm, wordCount } from "./utils";

export const PASS_META: Record<
  PassId,
  { name: string; short: string; instruction: string; waiting: string }
> = {
  0: {
    name: "Dump",
    short: "Ledger only",
    instruction:
      "Talk without structure. Do not clean it up. The cartographer extracts a jargon ledger and asks for glosses — twelve words or fewer. Nothing else is organized yet.",
    waiting: "Reading the dump. Ledger only — not organizing.",
  },
  1: {
    name: "Extract",
    short: "Invariant first",
    instruction:
      "Invariant in one sentence, then the instance, then every claim that is actually an assumption, then the single joint most likely to be wrong. L1 may not use your names.",
    waiting: "Separating the pattern from the example.",
  },
  2: {
    name: "Cold read",
    short: "Load-bearing",
    instruction:
      "Read the L2 with zero context. Report the exact sentence where the thread was lost, the first question that reader asks, and the thing they assume it is that it isn’t.",
    waiting: "Reading the paragraph as a stranger.",
  },
  3: {
    name: "Map",
    short: "Three tiers",
    instruction:
      "Tiered visual, not a mind map. Tier 1: the invariant as sequential stages. Tier 2: instances, one box each. Tier 3: pieces that could stand alone. Title plus five words maximum per box.",
    waiting: "Drawing tiers, not a mind map.",
  },
  4: {
    name: "Blueprint",
    short: "One page",
    instruction:
      "One page. L1, then L2, then L3 as structure. Open UNKNOWNs listed at the bottom, unresolved and visible. Do not invent detail to fill a gap.",
    waiting: "Setting the altitudes on one page.",
  },
  5: {
    name: "Sixty seconds",
    short: "Say it aloud",
    instruction:
      "Compress to something sayable out loud in sixty seconds. A test, not a deliverable. If it will not compress, name the unresolved upstream pass and go back.",
    waiting: "Cutting until it can be spoken.",
  },
  6: {
    name: "Operator log",
    short: "A finding about you",
    instruction:
      "One row: the move you made to yourself this run, the tell as a quote, whether this failure has appeared before, and one thing to try differently next run. Not a verdict on the idea.",
    waiting: "Looking at the operator, not the idea.",
  },
};

export const HARD_RULES = [
  {
    n: 1,
    title: "Jargon ledger",
    body: "Every proper noun, codename, or invented term gets a gloss of twelve words or fewer. No unglossed term is used back at you.",
  },
  {
    n: 2,
    title: "No proper nouns at L1",
    body: "If the one-sentence version needs one of your names, the idea is not yet articulable.",
  },
  {
    n: 3,
    title: "Invariant before instance",
    body: "State the pattern that survives if every domain detail is swapped out. Shared invariants must be named.",
  },
  {
    n: 4,
    title: "Never invent detail",
    body: "Mark a gap UNKNOWN and ask. Do not fill it to make the page look finished.",
  },
  {
    n: 5,
    title: "A finding about you",
    body: "Every run ends in a finding about the operator — not a verdict on the idea. No finding means the run did not count.",
  },
];

export const ALTITUDES = [
  {
    id: "L1",
    name: "The sentence",
    body: "One sentence, plain English, none of your proper nouns. What it is, who it’s for.",
  },
  {
    id: "L2",
    name: "The paragraph",
    body: "Five to eight sentences. Your names allowed, each glossed on first use. What goes in, what comes out, what decision it changes, why it’s hard to copy.",
  },
  {
    id: "L3",
    name: "The mechanism",
    body: "Components, data flow, constraints, load-bearing versus incidental. All the detail you want to lead with lives here.",
  },
];

export function unglossed(ledger: Gloss[]): Gloss[] {
  return ledger.filter((g) => !g.gloss.trim() || wordCount(g.gloss) > 12);
}

export function isPassComplete(run: Run, pass: PassId): boolean {
  if (pass === 0) {
    const extracted = Boolean(run.passes[0]);
    const dumped = run.dump.trim().length > 0;
    const ledgerOk = unglossed(run.ledger).length === 0;
    const ideasOk =
      !run.passes[0]?.multipleIdeas || Boolean(run.focus?.trim());
    return dumped && extracted && ledgerOk && ideasOk;
  }
  return Boolean(run.passes[pass]);
}

export function highestUnlocked(run: Run): PassId {
  for (let i = 0; i <= 6; i++) {
    const pass = i as PassId;
    if (!isPassComplete(run, pass)) return pass;
  }
  return 6;
}

export function l1ProperNounHits(l1: string, ledger: Gloss[]): Gloss[] {
  return ledger.filter((g) => containsTerm(l1, g.term));
}

export function captionOverFive(caption: string): boolean {
  return wordCount(caption) > 5;
}

export function passLabel(pass: PassId): string {
  return `Pass ${pass} — ${PASS_META[pass].name}`;
}

export function mergeLedger(
  existing: Gloss[],
  incoming: Gloss[] | undefined,
): Gloss[] {
  if (!incoming) return existing;
  const prev = new Map(existing.map((g) => [g.term.toLowerCase(), g]));
  const mapped = incoming.map((g) => {
    const old = prev.get(g.term.toLowerCase());
    if (!old?.gloss.trim()) return g;
    if (old.source === "operator") {
      return { ...g, gloss: old.gloss, source: "operator" as const };
    }
    if (!g.gloss.trim()) {
      return { ...g, gloss: old.gloss, source: old.source };
    }
    return g;
  });
  const seen = new Set(mapped.map((g) => g.term.toLowerCase()));
  const extras = existing.filter(
    (g) => g.source === "operator" && !seen.has(g.term.toLowerCase()),
  );
  return [...mapped, ...extras];
}

export function ideaQuestion(term: string, questions: string[]): string {
  const hit = questions.find((q) =>
    q.toLowerCase().includes(term.toLowerCase()),
  );
  return hit ?? `What is ${term}, in twelve words?`;
}

