# src/shared — schemas, types, eligibility engine

Code used by the client, the server and the scripts. Must stay **pure**: no Express, no Mongoose, no `fetch`, no `process.env`, no Node-only APIs (it runs in the browser too).

Engine guide: `docs/eligibility-engine.md`. Skill: `eligibility-engine`.

## Layout

```
src/shared/
├── schemas/
│   ├── profile.ts         ← ProfileSchema + PROFILE_FIELDS (the fields rules may test)
│   ├── scheme.ts          ← SchemeFileSchema (data/schemes JSON) + SchemeSchema (API shape)
│   ├── rule.ts            ← RuleSchema, operators
│   ├── saved.ts           ← SavedSchemeSchema, stages: saved | applied | renewal_due
│   ├── auth.ts            ← register, login, reset bodies
│   └── index.ts           ← re-exports + inferred types (z.infer)
├── eligibility/
│   ├── evaluate.ts        ← evaluate(profile, scheme) → { state, score, reasons }
│   ├── operators.ts       ← eq, in, notIn, lte, gte, between, exists, isTrue
│   ├── reasons.ts         ← plain-language reason templates per operator
│   └── evaluate.test.ts   ← boundary tests
├── profileCompleteness.ts ← profile percentage for GET /me and the wizard
└── constants.ts           ← course categories, states, categories (GEN/OBC/SC/ST/EWS), other value lists
```

## Rules

- **Zod schemas are the single source of truth.** Export types with `z.infer`. Client and server import from here and never redefine shapes.
- **`evaluate()` is a pure function:** same input, same output, no I/O, no dates read inside (pass `today` in).
- Match states: `eligible`, `almost`, `not`, `unknown` (`unknown` = the profile is missing a field a hard rule needs).
- Adding an operator means: the operator, its reason template, the `RuleSchema` enum, and tests, all in one change.
- Adding a profile field means: `ProfileSchema`, `PROFILE_FIELDS`, the profile wizard, and `docs/database.md`.
- Every operator and every state boundary has a test: exactly at the limit, one unit over, inside `nearMargin`, just past it.
- Money is whole rupees (integers). Dates are ISO strings `YYYY-MM-DD`.
