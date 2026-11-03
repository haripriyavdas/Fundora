---
name: eligibility-engine
description: Build or change Fundora's eligibility matching (evaluate, operators, reason text, scoring, match states) in src/shared/eligibility. Use when matching results look wrong, when adding an operator or profile field, or when changing how Eligible / Almost / Not eligible is decided.
---

# Work on the eligibility engine

Read `src/shared/CLAUDE.md` and `docs/eligibility-engine.md` first. The doc is the spec. If the user wants different behaviour, update the doc in the same change.

## Rules

- `evaluate(profile, scheme, today)` stays pure: no I/O, no `Date.now()`, no `process.env`, no imports from client or server.
- States: `eligible`, `almost`, `not`, `unknown`. Every result includes per-rule reasons and one card `reason`.
- Hard-rule failure always wins. At most 2 near-misses can be `almost`.

## Debugging a wrong result

1. Get the scheme file and a description of the profile (made-up values, never a real student's data).
2. Add the case to `src/shared/eligibility/fixtures/` and write a failing test that shows the expected result.
3. Find whether the cause is the **data** (wrong rule in the scheme JSON → fix the file, hand over to `add-scheme`) or the **engine** (fix the code).
4. Make the test pass and run the whole suite.

## Adding an operator

All in one change: the function in `operators.ts`, the enum value in `RuleSchema` (`src/shared/schemas/rule.ts`), a template in `reasons.ts`, the table in `docs/eligibility-engine.md`, support in `validate-schemes`, and tests (pass, fail, at limit, one over, in margin, past margin, missing).

## Adding a profile field

`ProfileSchema` + `PROFILE_FIELDS` + a label for reason text + the profile wizard step + `docs/database.md`. If it's sensitive (health, caste, money), discuss encryption before adding.

## Finish

`npm test` passes; run `npm run check-scheme` on 2–3 real scheme files and show the before/after results if they changed.
