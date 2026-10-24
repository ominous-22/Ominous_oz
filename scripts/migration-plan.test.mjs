import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { isMigrationFile, migrationName, pendingMigrations } from "./migration-plan.mjs";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

test("_migrations keys on basename, not path", () => {
  assert.equal(migrationName("/migrations/0002_todos.sql"), "0002_todos.sql");
  assert.equal(migrationName("0001_cartographer.sql"), "0001_cartographer.sql");
});

test("a file already applied does not re-apply", () => {
  assert.deepEqual(
    pendingMigrations(["/migrations/0001_cartographer.sql"], ["0001_cartographer.sql"]),
    [],
  );
});

test("pending migrations are returned in name order", () => {
  assert.deepEqual(
    pendingMigrations(
      ["/migrations/0003_c.sql", "/migrations/0001_a.sql", "/migrations/0002_b.sql"],
      ["0001_a.sql"],
    ),
    [
      { name: "0002_b.sql", path: "/migrations/0002_b.sql" },
      { name: "0003_c.sql", path: "/migrations/0003_c.sql" },
    ],
  );
});

test("non-.sql entries are dropped", () => {
  assert.equal(isMigrationFile("notes"), false);
  assert.deepEqual(pendingMigrations(["notes", "README.md"], []), []);
});

test("the shipped migrations are all pending on an empty database", () => {
  const files = readdirSync(migrationsDir);
  assert.ok(pendingMigrations(files, []).length >= 1);
});
