# Fundora

Every scholarship an undergraduate qualifies for, in one place. One profile → every scholarship, loan, fee waiver and grant sorted into Eligible, Almost eligible or Not eligible, with a reason → apply on the official site.

BMS College of Engineering, Bengaluru.

## Get started

```bash
npm install
cp .env.example .env      # fill in MONGODB_URI, JWT_SECRET, FIELD_ENCRYPTION_KEY…
npm run dev               # http://localhost:3000 (site + API)
```

Requires Node 20+.

## Working with Claude Code

Open a terminal in this folder and run `claude`. It reads `CLAUDE.md` automatically, plus the `CLAUDE.md` in whichever folder it's working in.

- **What to build next:** `docs/build-plan.md` has a ready-to-paste prompt for every phase. Start with Phase 0.
- **Skills** in `.claude/skills/` load automatically when a task matches, or ask for one by name:
  - `add-scheme`: "Add the Post-Matric Scholarship for SC students from <official URL>"
  - `api-route`: new or changed endpoints
  - `eligibility-engine`: matching logic and wrong-result debugging
  - `frontend-page`: pages and components
  - `mongodb`: models, indexes, querying the dev database
  - `security-review`: "Review my changes before I open a PR"
- **MongoDB MCP server:** set `MDB_MCP_CONNECTION_STRING` in your shell to a `fundora_dev`-only user, then run `/mcp` inside Claude Code to check it's connected. Details and the Windows fix are in `docs/database.md`.
- `.claude/settings.json` pre-approves safe commands (lint, test, typecheck) and blocks reading `.env` and dropping databases.

## Folder map

```
src/client     React app             src/server    Express API
src/shared     schemas + engine      data/schemes  scheme JSON (source of truth)
content        guides, stories       scripts       validate, seed, check, import
tests/e2e      Playwright            docs          everything else
```

## Docs

`docs/architecture.md` · `frontend.md` · `backend.md` · `api.md` · `database.md` · `eligibility-engine.md` · `scheme-data.md` · `security.md` · `testing.md` · `deployment.md` · `build-plan.md` · `decisions.md`

## Rules in one line each

Guide and list, never apply · students are the only users · schemes change only through `data/schemes` · tracker = Saved, Applied, Renewal due · no ID or bank numbers, sensitive fields encrypted · one folder, one `package.json`.
