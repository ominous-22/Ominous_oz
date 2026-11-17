import assert from "node:assert/strict";
import { test } from "node:test";
import {
  digestCommit,
  digestFiles,
  latestSurvey,
  normalizePath,
  normalizeSurvey,
  parseDigestMode,
  stalenessNote,
  stalenessOf,
  surveyToPrompt,
} from "./survey.ts";
import type { Pass4 } from "./types.ts";

const digest = [
  "# Repo digest",
  "commit: 8ac046bdb71f5762faa7812257748babab8c0b8b",
  "generated: 2026-11-05T00:00:00.000Z",
  "repo: demo",
  "",
  "## Files (3)",
  "src/lib/store.ts",
  "src/lib/sync.ts",
  "migrations/0001.sql",
  "(+2 more not listed)",
  "",
  "## Dependencies",
  "package.json: react",
].join("\n");

const blueprint: Pass4 = {
  l1: "x",
  l2: "y",
  l3: {
    components: "",
    dataFlow: "",
    constraints: "",
    loadBearing: ["Runs sync across devices.", "Every pass is saved."],
    incidental: [],
  },
  unknowns: ["Where the desk is stored", "Who can sign in"],
};

const ctx = { blueprint, digest, id: "sv-1", at: "2026-11-05T00:00:00.000Z" };

test("reads the file list and commit from a digest", () => {
  assert.deepEqual(digestFiles(digest), [
    "src/lib/store.ts",
    "src/lib/sync.ts",
    "migrations/0001.sql",
  ]);
  assert.equal(digestCommit(digest), "8ac046bdb71f5762faa7812257748babab8c0b8b");
  assert.deepEqual(digestFiles("no files section"), []);
  assert.equal(digestCommit("no header"), "unknown");
});

test("normalizes cited paths", () => {
  assert.equal(normalizePath("./src/lib/sync.ts:42"), "src/lib/sync.ts");
  assert.equal(normalizePath("`src\\lib\\sync.ts`"), "src/lib/sync.ts");
  assert.equal(normalizePath("/src/lib/sync.ts#L10-L20"), "src/lib/sync.ts");
});

test("strips invented evidence and downgrades unsupported claims", () => {
  const s = normalizeSurvey(
    {
      payload: {
        loadBearing: [
          { claim: "runs sync across devices", status: "built", evidence: ["src/lib/sync.ts:12"] },
          {
            claim: "Every pass is saved.",
            status: "built",
            evidence: ["src/lib/invented.ts"],
            note: "looks done",
          },
        ],
      },
    },
    ctx,
  );
  assert.equal(s.commit, "8ac046bdb71f5762faa7812257748babab8c0b8b");
  assert.deepEqual(s.loadBearing[0], {
    claim: "Runs sync across devices.",
    status: "built",
    evidence: ["src/lib/sync.ts"],
    note: "",
  });
  assert.equal(s.loadBearing[1].status, "unverified");
  assert.deepEqual(s.loadBearing[1].evidence, []);
  assert.equal(s.loadBearing[1].note, "No evidence in the digest. looks done");
});

test("keeps skipped claims, drops claims the blueprint never made", () => {
  const s = normalizeSurvey(
    {
      loadBearing: [{ claim: "Has a dark mode", status: "built", evidence: ["src/lib/store.ts"] }],
    },
    ctx,
  );
  assert.deepEqual(
    s.loadBearing.map((i) => [i.claim, i.status, i.note]),
    [
      ["Runs sync across devices.", "unverified", "Not surveyed."],
      ["Every pass is saved.", "unverified", "Not surveyed."],
    ],
  );
});

test("missing needs no evidence; bad status becomes unverified", () => {
  const s = normalizeSurvey(
    {
      loadBearing: [
        { claim: "Runs sync across devices.", status: "missing" },
        { claim: "Every pass is saved.", status: "done!", evidence: ["src/lib/store.ts"] },
      ],
    },
    ctx,
  );
  assert.equal(s.loadBearing[0].status, "missing");
  assert.equal(s.loadBearing[1].status, "unverified");
});

test("an UNKNOWN only resolves with evidence", () => {
  const s = normalizeSurvey(
    {
      unknowns: [
        {
          unknown: "Where the desk is stored",
          resolvedAs: "Postgres table",
          evidence: ["migrations/0001.sql"],
        },
        { unknown: "Who can sign in", resolvedAs: "Only the owner", evidence: ["src/lib/auth.ts"] },
      ],
    },
    ctx,
  );
  assert.deepEqual(s.unknowns[0], {
    unknown: "Where the desk is stored",
    resolvedAs: "Postgres table",
    evidence: ["migrations/0001.sql"],
  });
  assert.deepEqual(s.unknowns[1], { unknown: "Who can sign in", resolvedAs: null, evidence: [] });
});

test("unmapped things need evidence and a known kind", () => {
  const s = normalizeSurvey(
    {
      unmapped: [
        { thing: "Quiz page", kind: "scope creep", evidence: ["src/lib/store.ts"] },
        { thing: "quiz page", kind: "scope creep", evidence: ["src/lib/store.ts"] },
        { thing: "Ghost feature", kind: "scope creep", evidence: ["src/ghost.ts"] },
        { thing: "Sync banner", kind: "whatever", evidence: ["src/lib/sync.ts"] },
      ],
    },
    ctx,
  );
  assert.deepEqual(
    s.unmapped.map((u) => [u.thing, u.kind]),
    [
      ["Quiz page", "scope creep"],
      ["Sync banner", "missing from map"],
    ],
  );
});

test("garbage in gives an all-unverified survey, not a crash", () => {
  for (const raw of [null, "nope", 42, { loadBearing: "x", unknowns: {}, unmapped: null }]) {
    const s = normalizeSurvey(raw, ctx);
    assert.equal(s.loadBearing.length, 2);
    assert.ok(s.loadBearing.every((i) => i.status === "unverified"));
    assert.ok(s.unknowns.every((u) => u.resolvedAs === null));
    assert.deepEqual(s.unmapped, []);
  }
});

test("the prompt section carries only the gap, contradictions first", () => {
  const s = normalizeSurvey(
    {
      loadBearing: [
        {
          claim: "Runs sync across devices.",
          status: "contradicted",
          evidence: ["src/lib/sync.ts"],
          note: "polls, no push",
        },
        { claim: "Every pass is saved.", status: "built", evidence: ["src/lib/store.ts"] },
      ],
      unknowns: [
        {
          unknown: "Where the desk is stored",
          resolvedAs: "Postgres table",
          evidence: ["migrations/0001.sql"],
        },
      ],
    },
    ctx,
  );
  const text = surveyToPrompt(s);
  assert.match(text, /^## Survey — code at 8ac046b, 2026-11-05/);
  assert.ok(text.indexOf("Contradicted") < text.indexOf("Already built"));
  assert.match(text, /- Runs sync across devices\. — polls, no push \(src\/lib\/sync\.ts\)/);
  assert.match(
    text,
    /### Already built — do not redo\n- Every pass is saved\. \(src\/lib\/store\.ts\)/,
  );
  assert.match(text, /Where the desk is stored → Postgres table/);
  assert.doesNotMatch(text, /Build next/);
});

test("latestSurvey picks the newest", () => {
  const a = normalizeSurvey({}, { ...ctx, id: "a" });
  const b = normalizeSurvey({}, { ...ctx, id: "b" });
  assert.equal(latestSurvey({ surveys: [a, b] })?.id, "b");
  assert.equal(latestSurvey({}), undefined);
});

const depthDigest = digest
  .replace("generated:", "mode: depth\ngenerated:")
  .replace("src/lib/sync.ts\n", "");

test("a depth digest strips evidence outside its shorter file list, and says why", () => {
  const raw = {
    loadBearing: [
      { claim: "Runs sync across devices.", status: "built", evidence: ["src/lib/sync.ts"] },
      { claim: "Every pass is saved.", status: "built", evidence: ["src/lib/store.ts"] },
    ],
  };
  const s = normalizeSurvey(raw, { ...ctx, digest: depthDigest });
  assert.equal(s.mode, "depth");
  assert.equal(s.loadBearing[0].status, "unverified");
  assert.deepEqual(s.loadBearing[0].evidence, []);
  assert.match(s.loadBearing[0].note, /^Not measured at this depth/);
  assert.equal(s.loadBearing[1].status, "built");
  assert.equal(normalizeSurvey(raw, ctx).mode, "breadth");
});

test("older surveys with no mode still load and export", () => {
  const old = normalizeSurvey({}, ctx);
  delete old.mode;
  assert.equal(latestSurvey({ surveys: [old] })?.id, "sv-1");
  assert.match(surveyToPrompt(old), /## Survey/);
});

test("the request validator rejects an unknown mode", () => {
  assert.equal(parseDigestMode(undefined), undefined);
  assert.equal(parseDigestMode(null), undefined);
  assert.equal(parseDigestMode("depth"), "depth");
  assert.throws(() => parseDigestMode("sideways"), /Unknown digest mode/);
  assert.throws(() => parseDigestMode(1), /Unknown digest mode/);
});

test("staleness is counted in commits, with unknown as its own state", () => {
  assert.equal(stalenessOf(0), "fresh");
  assert.equal(stalenessOf(1), "aging");
  assert.equal(stalenessOf(10), "aging");
  assert.equal(stalenessOf(11), "stale");
  assert.equal(stalenessOf("unknown"), "unknown");
  assert.equal(stalenessOf(-1), "unknown");
  assert.equal(stalenessOf(Number.NaN), "unknown");
});

test("the agent prompt says when a survey is stale, and never guesses", () => {
  const s = normalizeSurvey({}, ctx);
  assert.doesNotMatch(surveyToPrompt(s, { commitsSince: 0 }), /Note:/);
  const stale = surveyToPrompt(s, { commitsSince: 14 });
  assert.match(stale, /14 commits have landed since this survey \(taken at 8ac046b\)/);
  assert.match(stale, /re-survey first/);
  assert.match(surveyToPrompt(s, { commitsSince: 1 }), /1 commit has landed/);
  assert.match(stalenessNote(s), /git rev-list --count 8ac046b/);
  assert.match(stalenessNote({ ...s, commit: "unknown" }), /no commit on record/);
});
