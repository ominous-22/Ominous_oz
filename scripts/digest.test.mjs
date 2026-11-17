import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { execFileSync } from "node:child_process";
import { buildDigest, commitOf, commitsSince, exportsOf, isListed, listFiles } from "./digest.mjs";

const root = mkdtempSync(join(tmpdir(), "digest-"));
after(() => rmSync(root, { recursive: true, force: true }));

/** @param {string} path @param {string} text */
const put = (path, text) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
};

put(
  "package.json",
  JSON.stringify({ dependencies: { react: "1" }, devDependencies: { vite: "1" } }),
);
put("package-lock.json", "{}");
put(".env", "SECRET=1");
put("node_modules/x/index.js", "export const leak = 1;");
put("src/lib/a.ts", "export function runPass() {}\nexport type Pass = 1;\nconst hidden = 1;\n");
put("src/lib/a.test.ts", "export const notListedInExports = 1;\n");
put("app/main.py", "def handler():\n    pass\nclass Model:\n    pass\ndef _private():\n    pass\n");
put("migrations/0001.sql", "-- comment\ncreate table t (id int);\n");

test("skips dependencies, lockfiles and env files", () => {
  assert.equal(isListed("node_modules/x/index.js"), false);
  assert.equal(isListed("package-lock.json"), false);
  assert.equal(isListed(".env.local"), false);
  assert.equal(isListed("src/lib/a.ts"), true);
  assert.deepEqual(listFiles(root), [
    "app/main.py",
    "migrations/0001.sql",
    "package.json",
    "src/lib/a.test.ts",
    "src/lib/a.ts",
  ]);
});

test("finds exported names in TS and public names in Python", () => {
  assert.deepEqual(
    exportsOf("a.ts", "export function runPass() {}\nexport type Pass = 1;\nconst x = 1;"),
    ["runPass", "Pass"],
  );
  assert.deepEqual(exportsOf("b.ts", "export { one, two as three };"), ["one", "three"]);
  assert.deepEqual(exportsOf("m.py", "def handler():\n  pass\nclass Model: pass\ndef _p(): pass"), [
    "handler",
    "Model",
  ]);
});

test("digest has every section and leaves out secrets and tests' exports", () => {
  const d = buildDigest(root, { now: new Date("2026-11-05T00:00:00Z") });
  assert.match(d, /^# Repo digest\ncommit: /);
  assert.match(d, /## Files \(5\)\napp\/main\.py\n/);
  assert.match(d, /package\.json: react/);
  assert.match(d, /create table t \(id int\);/);
  assert.doesNotMatch(d, /-- comment/);
  assert.match(d, /src\/lib\/a\.ts: runPass, Pass/);
  assert.match(d, /app\/main\.py: handler, Model/);
  assert.doesNotMatch(d, /notListedInExports|SECRET|leak/);
});

test("stays under the size cap", () => {
  for (let i = 0; i < 400; i++) put(`src/gen/file-${i}.ts`, `export const v${i} = ${i};\n`);
  const d = buildDigest(root, { maxChars: 3000 });
  assert.ok(d.length <= 3000, `digest was ${d.length} chars`);
  assert.match(d, /more not listed/);
});

/** Files listed under `## Files` in a digest. */
const listedIn = (/** @type {string} */ d) =>
  (d.split("## Files")[1] ?? "")
    .split("\n## ")[0]
    .split("\n")
    .slice(1)
    .filter((l) => /\.\w+$/.test(l));

test("depth lists fewer files than breadth but keeps exports and schema", () => {
  const breadth = buildDigest(root, { maxChars: 3000, mode: "breadth" });
  const depth = buildDigest(root, { maxChars: 3000, mode: "depth" });
  assert.match(breadth, /^mode: breadth$/m);
  assert.match(depth, /^mode: depth$/m);
  assert.ok(
    listedIn(depth).length < listedIn(breadth).length,
    `depth listed ${listedIn(depth).length}, breadth ${listedIn(breadth).length}`,
  );
  assert.match(depth, /## Exports/);
  assert.match(depth, /## Schema/);
  for (const d of [breadth, depth]) {
    assert.ok(d.length <= 3000, `digest was ${d.length} chars`);
    assert.doesNotMatch(d, /SECRET|leak|package-lock/);
  }
});

test("an unknown mode falls back to breadth", () => {
  // @ts-expect-error deliberately bad input
  assert.match(buildDigest(root, { mode: "sideways" }), /^mode: breadth$/m);
});

test("commitsSince counts commits, and says unknown instead of guessing", () => {
  const repo = mkdtempSync(join(tmpdir(), "digest-git-"));
  try {
    const git = (/** @type {string[]} */ ...a) =>
      execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], {
        cwd: repo,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      });
    git("init", "-q");
    writeFileSync(join(repo, "a.txt"), "1");
    git("add", ".");
    git("commit", "-qm", "one");
    const first = commitOf(repo);
    assert.equal(commitsSince(repo, first), 0);
    for (const n of ["2", "3"]) {
      writeFileSync(join(repo, "a.txt"), n);
      git("commit", "-qam", n);
    }
    assert.equal(commitsSince(repo, first), 2);
    assert.equal(commitsSince(repo, first.slice(0, 7)), 2);
    assert.equal(commitsSince(repo, "deadbeefdeadbeef"), "unknown");
    assert.equal(commitsSince(repo, "unknown"), "unknown");
    assert.equal(commitsSince(repo, "HEAD; rm -rf /"), "unknown");
    assert.equal(commitsSince(tmpdir(), first), "unknown");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
