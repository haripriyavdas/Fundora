# CLAUDE.md — Fundora

Read this first. More detail lives in `docs/`, and each code area has its own `CLAUDE.md` (`frontend-fundora-starter`, `src/server`, `src/shared`, `data/schemes`).

## What Fundora is

A website where an undergraduate student signs up, fills one profile, and sees every scholarship, aid and grant they qualify for, sorted into **Eligible / Almost eligible / Not eligible**, each with a plain-language reason. It covers 19 UG course categories in India: Arts, Science, Commerce, Management, Computer/IT, Engineering, Medicine, Dental, Pharmacy, Architecture, Agriculture, Nursing, Paramedical, Law, Education, Design/Fine Arts, Hotel Management, Social Sciences, and vocational and professional degrees.

## Hard rules (never break these)

1. **Guide and list, never apply.** Fundora never fills or submits forms, holds portal logins, processes payments or charges fees. Every "Apply" button opens the scheme's official portal.
2. **Students are the only users.** No admin, counsellor or NGO accounts, no `role` field, no role checks, no admin routes or pages.
3. **Scheme data lives in `data/schemes/*.json`.** The app only reads schemes. Only `npm run seed` writes them to MongoDB. Changing a scheme means editing a file, never code.
4. **The tracker has exactly three stages:** `saved`, `applied`, `renewal_due`.
5. **Privacy:** never store Aadhaar, bank account or ID numbers, or portal passwords. Encrypt `familyIncome`, `category` and `disability`. Never log them or send them to analytics.
6. **One folder, one `package.json`.** There are no separate frontend and backend projects. Do not create nested `package.json` files or a monorepo.

## Folder map

```
fundora/
├── CLAUDE.md                 ← you are here
├── package.json              ← the only package.json
├── frontend-fundora-starter/ ← React app (index.html, public/, pages, components, i18n) → frontend-fundora-starter/CLAUDE.md
├── src/
│   ├── server/               ← Express API, Mongoose models, jobs     → src/server/CLAUDE.md
│   └── shared/               ← Zod schemas, types, eligibility engine → src/shared/CLAUDE.md
├── data/schemes/             ← scheme JSON files (source of truth)    → data/schemes/CLAUDE.md
├── content/                  ← guides + success stories (Markdown)
├── scripts/                  ← validate-schemes, seed, check-scheme, import-sheet
├── tests/e2e/                ← Playwright tests
├── docs/                     ← architecture, API, database, security, build plan…
├── .claude/skills/           ← Claude Code skills for common Fundora tasks
├── .mcp.json                 ← MongoDB MCP server (dev database only)
└── .github/workflows/ci.yml
```

One Express server serves both the API (`/api/v1/*`) and the React app. In development it runs Vite as middleware, so `npm run dev` starts everything on one port.

## Stack

React 18 + Vite + Tailwind CSS v4 + React Router v7 + react-i18next · Node 20 + Express + Mongoose · MongoDB Atlas · Zod (shared validation) · bcrypt + JWT in httpOnly cookies · Resend/Brevo email · node-cron jobs · Vitest, Supertest, Playwright · one Render web service.

## Commands

```bash
npm install
npm run dev                 # Express + Vite on http://localhost:3000
npm run build               # vite build → dist/client, tsc → dist/server
npm start                   # production server
npm test                    # Vitest (unit + API)
npm run test:e2e            # Playwright
npm run lint && npm run typecheck
npm run validate-schemes    # check every file in data/schemes (or: -- <file> …)
npm run check-scheme -- data/schemes/central/<id>.json   # Phase 4
npm run seed                # upsert data/schemes into MongoDB (-- --dry-run to preview)
npm run import-sheet -- <file.csv> [--force]
```

Update this section when scripts change.

## Where to look

| Task | Read | Skill |
| --- | --- | --- |
| Add or fix a scheme | `data/schemes/CLAUDE.md`, `docs/scheme-data.md` | `add-scheme` |
| New API route | `src/server/CLAUDE.md`, `docs/api.md` | `api-route` |
| Change eligibility logic | `src/shared/CLAUDE.md`, `docs/eligibility-engine.md` | `eligibility-engine` |
| New page or component | `frontend-fundora-starter/CLAUDE.md`, `docs/frontend.md` | `frontend-page` |
| Models, indexes, querying the DB | `docs/database.md` | `mongodb` |
| Before opening a PR | `docs/security.md`, `docs/testing.md` | `security-review` |
| What to build next | `docs/build-plan.md` | — |
| Why something is the way it is | `docs/decisions.md` | — |

## Working rules for Claude

- Before a change, read the `CLAUDE.md` of the folder you're editing.
- Keep changes small and in one area. Run `npm run lint`, `npm run typecheck` and `npm test` before saying a task is done.
- Types come from Zod schemas in `src/shared`. Never hand-write a duplicate type in client or server.
- Use the MongoDB MCP server only on the **dev** database. Read a collection's schema before writing to it, and never drop collections or databases.
- If a request would break a hard rule above, say so and stop rather than working around it.
- When you add a dependency, a script, an env var or a collection, update the matching doc in `docs/` in the same change.

## Team

Samrat, Haripriya V, Harshit Kumar, Eshaan Brahimi · BMS College of Engineering, Bengaluru.
