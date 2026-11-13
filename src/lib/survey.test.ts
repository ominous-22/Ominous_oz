import assert from "node:assert/strict";
import { test } from "node:test";
import { digestCommit, digestFiles, normalizePath, normalizeSurvey } from "./survey.ts";
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
