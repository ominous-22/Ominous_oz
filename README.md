# Idea Cartographer

A desk for walking one idea through seven passes (Dump → Extract → Cold read →
Map → Blueprint → Sixty seconds → Operator log). Each pass runs on your own
local model. Runs and the operator log save to a database on your machine.

## Run it on Kali (next to the model)

```sh
npm install
npm run build
CARTOGRAPHER_PASSWORD='pick-one' HOST=0.0.0.0 PORT=3000 npm start
```

Open `http://<kali-ip>:3000`, sign in with the password. `HOST=0.0.0.0` makes it
reachable from your phone on the same network. Leave it off to keep it on
`127.0.0.1`.

For development: `npm run dev` (with no password set, the desk is open on
localhost only).

## Settings (environment variables)

| Variable | Default | What it does |
|---|---|---|
| `CARTOGRAPHER_PASSWORD` | — (required for `npm start`) | The one password that unlocks the desk. Changing it signs every device out. |
| `CARTOGRAPHER_LLM_URL` | `http://localhost:5272/v1` | Any OpenAI-compatible endpoint (llama.cpp `llama-server`, Ollama `/v1`, …). |
| `CARTOGRAPHER_LLM_MODEL` | `local` | Model name sent with each call. llama.cpp ignores it; Ollama needs the real name. |
| `CARTOGRAPHER_LLM_KEY` | — | Bearer token, if your model server wants one. |
| `CARTOGRAPHER_LLM_TIMEOUT` | `180` | Seconds allowed per model call. |
| `CARTOGRAPHER_DATA_DIR` | `.data/pglite` | Where the embedded database keeps its files. **Back this folder up.** |
| `DATABASE_URL` | — | Use an external Postgres instead of the embedded one (`npm run db:migrate` applies the schema). |
| `CARTOGRAPHER_SECRET` | derived from the password | Signs the sign-in cookie, if you want it independent of the password. |
| `HOST` / `PORT` | `127.0.0.1` / `3000` | Where the server listens. |

## How the pieces fit

- `src/lib/cartographer.ts`: the system prompt, the per-pass instructions, the
  model call (strips `<think>` blocks, retries once on bad JSON), and the size
  limits on what a client can send.
- `src/lib/protocol.ts`: the hard rules checked in code (12-word glosses, no
  ledger terms in L1, 5-word map captions, no skipping passes).
- `src/lib/owner.ts` / `owner.server.ts`: single-password sign-in; a signed
  HttpOnly cookie that lasts 60 days.
- `src/lib/desk.ts` / `sync.ts` / `components/desk-sync.tsx`: the browser keeps a
  working copy; every change merges into the saved desk (newest edit wins, and
  deletions stick), so two devices don't overwrite each other.
- `src/lib/db.ts`: embedded PGLite on disk, or Postgres via `DATABASE_URL`.
  Schema in `migrations/`.

`notes/` holds the source write-ups the seed runs came from.

## Checks

```sh
npm run typecheck && npm test && npm run lint
```
