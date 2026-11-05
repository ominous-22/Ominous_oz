import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { buildDigest, exportsOf, isListed, listFiles } from "./digest.mjs";

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
