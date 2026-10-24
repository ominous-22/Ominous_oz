import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeDesks, parseDesk, type Desk } from "./desk.ts";
import type { OperatorRow, Run } from "./types.ts";

const run = (id: string, updatedAt: string, extra: Partial<Run> = {}): Run => ({
  id,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt,
  title: id,
  sealed: false,
  dump: "x",
  ledger: [],
  currentPass: 0,
  viewingPass: 0,
  passes: {},
  replies: {},
  ...extra,
});
const row = (runId: string, date: string): OperatorRow => ({
  runId,
  runTitle: runId,
  date,
  move: "m",
  tell: "t",
  repeatCount: 1,
  tryNext: "n",
});
const desk = (d: Partial<Desk>): Desk => ({ runs: [], operatorLog: [], deleted: [], ...d });

test("keeps runs that only one side has", () => {
  const m = mergeDesks(
    desk({ runs: [run("a", "2026-10-02")] }),
    desk({ runs: [run("b", "2026-10-02")] }),
  );
  assert.deepEqual(m.runs.map((r) => r.id).sort(), ["a", "b"]);
});

test("newer edit wins either way round", () => {
  const old = run("a", "2026-10-02T00:00:00Z", { title: "old" });
  const neu = run("a", "2026-10-03T00:00:00Z", { title: "new" });
  assert.equal(mergeDesks(desk({ runs: [neu] }), desk({ runs: [old] })).runs[0].title, "new");
  assert.equal(mergeDesks(desk({ runs: [old] }), desk({ runs: [neu] })).runs[0].title, "new");
});

test("a deleted run stays deleted even if a stale device still has it", () => {
  const m = mergeDesks(desk({ runs: [run("a", "2026-10-09")] }), desk({ deleted: ["a"] }));
  assert.equal(m.runs.length, 0);
  assert.deepEqual(m.deleted, ["a"]);
});

test("log row for a reopened (unsealed) run is dropped; sealed one kept", () => {
  const m = mergeDesks(
    desk({
      runs: [run("a", "2026-10-05", { sealed: false })],
      operatorLog: [row("a", "2026-10-04")],
    }),
    desk({
      runs: [run("b", "2026-10-05", { sealed: true })],
      operatorLog: [row("b", "2026-10-04")],
    }),
  );
  assert.deepEqual(
    m.operatorLog.map((r) => r.runId),
    ["b"],
  );
});

test("log rows for deleted runs are dropped", () => {
  const m = mergeDesks(desk({ operatorLog: [row("a", "2026-10-04")] }), desk({ deleted: ["a"] }));
  assert.equal(m.operatorLog.length, 0);
});

test("parseDesk survives junk", () => {
  assert.deepEqual(parseDesk("not json"), { runs: [], operatorLog: [], deleted: [] });
  assert.deepEqual(parseDesk({ runs: [null, { id: 3 }], deleted: [1, "x"] }), {
    runs: [],
    operatorLog: [],
    deleted: ["x"],
  });
});
