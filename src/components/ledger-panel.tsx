import { useEffect, useState } from "react";
import type { Gloss } from "@/lib/types";
import { wordCount } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export function LedgerPanel({
  ledger,
  editable,
  onChange,
  onAdd,
}: {
  ledger: Gloss[];
  editable?: boolean;
  onChange?: (term: string, gloss: string) => void;
  onAdd?: (term: string, gloss: string) => void;
}) {
  const unglossed = ledger.filter((g) => !g.gloss.trim()).length;

  return (
    <aside className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-widest text-subtle uppercase">
            Jargon ledger
          </p>
          <h2 className="font-display text-xl tracking-tight">Twelve words</h2>
        </div>
        {unglossed > 0 ? (
          <Badge tone="warn">{unglossed} unglossed</Badge>
        ) : ledger.length > 0 ? (
          <Badge tone="ok">Closed</Badge>
        ) : (
          <Badge>Empty</Badge>
        )}
      </div>
      <p className="text-sm leading-relaxed text-muted">
        If a term has no gloss, the cartographer stops. Never used back at you
        unglossed.
      </p>
      {ledger.length === 0 ? (
        <p className="rounded-lg bg-raised px-3 py-4 text-sm text-muted shadow-[var(--shadow-border)]">
          No invented names yet. Pass 0 writes this list from the dump.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ledger.map((g) => (
            <LedgerTile
              key={g.term}
              item={g}
              editable={editable}
              onChange={onChange}
            />
          ))}
        </ul>
      )}
      {editable && onAdd ? <AddTerm onAdd={onAdd} /> : null}
    </aside>
  );
}

function AddTerm({ onAdd }: { onAdd: (term: string, gloss: string) => void }) {
  const [term, setTerm] = useState("");
  const [gloss, setGloss] = useState("");
  const count = wordCount(gloss);
  const over = count > 12;

  return (
    <div className="rounded-lg bg-raised p-3 shadow-[var(--shadow-border)]">
      <p className="font-mono text-xs tracking-widest text-subtle uppercase">
        Add a term
      </p>
      <Input
        className="mt-2"
        value={term}
        placeholder="Codename"
        onChange={(e) => setTerm(e.target.value)}
      />
      <Input
        className="mt-2"
        value={gloss}
        placeholder="Twelve words or fewer"
        onChange={(e) => setGloss(e.target.value)}
      />
      <div className="mt-2 flex items-center justify-between">
        <span
          className={
            over ? "font-mono text-xs text-danger" : "font-mono text-xs text-subtle"
          }
        >
          {count} / 12
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={!term.trim() || !gloss.trim() || over}
          onClick={() => {
            onAdd(term.trim(), gloss.trim());
            setTerm("");
            setGloss("");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function LedgerTile({
  item,
  editable,
  onChange,
}: {
  item: Gloss;
  editable?: boolean;
  onChange?: (term: string, gloss: string) => void;
}) {
  const [draft, setDraft] = useState(item.gloss);
  const count = wordCount(draft);
  const over = count > 12;
  const dirty = draft !== item.gloss;

  useEffect(() => {
    setDraft(item.gloss);
  }, [item.gloss]);

  return (
    <li className="rounded-lg bg-raised p-3 shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-sm text-accent">{item.term}</p>
        {!item.gloss.trim() ? (
          <Badge tone="warn">Ask</Badge>
        ) : (
          <Badge tone="muted">{wordCount(item.gloss)}w</Badge>
        )}
      </div>
      {editable ? (
        <div className="mt-2 flex flex-col gap-2">
          <Input
            value={draft}
            maxLength={140}
            placeholder="Twelve words or fewer"
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span
              className={
                over ? "font-mono text-xs text-danger" : "font-mono text-xs text-subtle"
              }
            >
              {count} / 12
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={!dirty || over || !draft.trim()}
              onClick={() => onChange?.(item.term, draft.trim())}
            >
              Lock gloss
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-sm leading-snug text-fg">
          {item.gloss || "UNGLOSSED"}
        </p>
      )}
    </li>
  );
}
