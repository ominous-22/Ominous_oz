import { PASS_META } from "./protocol";
import type { Run } from "./types";

export function runToMarkdown(run: Run): string {
  const p1 = run.passes[1];
  const p2 = run.passes[2];
  const p3 = run.passes[3];
  const p4 = run.passes[4];
  const p5 = run.passes[5];
  const p6 = run.passes[6];

  const boxes = (label: string, list: { title: string; caption: string }[]) =>
    [`### ${label}`, ...list.map((b) => `- **${b.title}** — ${b.caption}`)].join(
      "\n",
    );

  return [
    `# ${run.title}`,
    "",
    `Run ${run.id}`,
    run.focus ? `\nFocus: ${run.focus}\n` : "",
    "## Dump",
    "",
    run.dump,
    "",
    "## Ledger",
    "",
    ...run.ledger.map((g) => `- **${g.term}**: ${g.gloss || "UNGLOSSED"}`),
    "",
    `## ${PASS_META[1].name}`,
    "",
    p1
      ? [
          `**Invariant.** ${p1.invariant}`,
          "",
          `**Instance.** ${p1.instance}`,
          "",
          "**Assumptions.**",
          ...p1.assumptions.map((a) => `- ${a}`),
          "",
          `**Weakest joint.** ${p1.weakestJoint}`,
          "",
          `**L1.** ${p1.l1}`,
          "",
          `**L2.** ${p1.l2}`,
        ].join("\n")
      : "_Not run._",
    "",
    `## ${PASS_META[2].name}`,
    "",
    p2
      ? [
          `Lost at: ${p2.lostAt}`,
          "",
          `First question: ${p2.firstQuestion}`,
          "",
          `Assumed it is: ${p2.assumedItIs}`,
          "",
          `It isn’t: ${p2.actuallyIsNot}`,
        ].join("\n")
      : "_Not run._",
    "",
    p3
      ? [
          `## ${PASS_META[3].name}`,
          "",
          boxes("Tier 1", p3.tier1),
          "",
          boxes("Tier 2", p3.tier2),
          "",
          boxes("Tier 3", p3.tier3),
          "",
          p3.prose,
        ].join("\n")
      : "",
    "",
    p4
      ? [
          `## ${PASS_META[4].name}`,
          "",
          `**L1.** ${p4.l1}`,
          "",
          `**L2.** ${p4.l2}`,
          "",
          `**Components.** ${p4.l3.components}`,
          "",
          `**Data flow.** ${p4.l3.dataFlow}`,
          "",
          `**Constraints.** ${p4.l3.constraints}`,
          "",
          "**Load-bearing.**",
          ...p4.l3.loadBearing.map((x) => `- ${x}`),
          "",
          "**Incidental.**",
          ...p4.l3.incidental.map((x) => `- ${x}`),
          "",
          `**UNKNOWNs.**`,
          ...p4.unknowns.map((u) => `- UNKNOWN — ${u}`),
        ].join("\n")
      : "",
    "",
    p5 ? `## Sixty seconds\n\n${p5.script}` : "",
    "",
    p6
      ? [
          `## Operator log`,
          "",
          `**The move.** ${p6.move}`,
          "",
          `**The tell.** ${p6.tell}`,
          "",
          `**Repeat count.** ${p6.repeatCount}`,
          "",
          `**Try next.** ${p6.tryNext}`,
        ].join("\n")
      : "",
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function runToPrompt(run: Run): string | null {
  const p4 = run.passes[4];
  const p1 = run.passes[1];
  const p5 = run.passes[5];
  const l1 = p4?.l1 || p1?.l1;
  const l2 = p4?.l2 || p1?.l2;
  if (!l1 || !l2) return null;

  const ledger = run.ledger
    .filter((g) => g.gloss.trim())
    .map((g) => `- ${g.term}: ${g.gloss}`)
    .join("\n");

  const l3 = p4?.l3;
  const unknowns = p4?.unknowns ?? [];

  return [
    "You are implementing the system below. Do not add scope. Do not invent answers for UNKNOWNs. Do not lead with incidental detail.",
    "",
    "## L1 — the sentence",
    l1,
    "",
    "## L2 — the paragraph",
    l2,
    "",
    l3
      ? [
          "## L3 — the mechanism",
          "",
          `Components: ${l3.components}`,
          "",
          `Data flow: ${l3.dataFlow}`,
          "",
          `Constraints: ${l3.constraints}`,
          "",
          "Load-bearing (must survive):",
          ...l3.loadBearing.map((x) => `- ${x}`),
          "",
          "Incidental (do not treat as requirements):",
          ...l3.incidental.map((x) => `- ${x}`),
        ].join("\n")
      : "",
    "",
    ledger ? `## Glossary\n${ledger}` : "",
    "",
    unknowns.length
      ? ["## Open UNKNOWNs", ...unknowns.map((u) => `- UNKNOWN — ${u}`)].join(
          "\n",
        )
      : "## Open UNKNOWNs\nNone marked. Be suspicious.",
    "",
    p5?.willCompress === false
      ? `## Compression\nRejected. Send back to ${p5.sendBackTo ?? "an upstream pass"}.`
      : p5?.script
        ? `## Sixty-second version\n${p5.script}`
        : "",
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
