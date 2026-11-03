# scripts

Run with `npm run <name>`. Built in Phase 3–4 (see `docs/build-plan.md`); behaviour is specified in `docs/scheme-data.md`.

| Script | File | Does |
| --- | --- | --- |
| `validate-schemes` | `validate-schemes.ts` | Checks every `data/schemes/**/*.json` (skips `_*`) against `SchemeFileSchema`; errors fail, staleness warns |
| `check-scheme -- <file>` | `check-scheme.ts` | Runs `evaluate()` for one scheme against fixture profiles and prints the results |
| `seed [--dry-run]` | `seed.ts` | Upserts schemes by `id`, retires removed ones, bumps `dataVersion`; needs `MONGODB_URI` |
| `import-sheet -- <csv>` | `import-sheet.ts` | Turns a Google Sheet CSV export into scheme JSON files, then validates them |

One-off data migrations go in `scripts/migrations/YYYY-MM-DD-<name>.ts`, must be safe to run twice, and support `--dry-run`.
