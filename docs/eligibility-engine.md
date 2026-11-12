# Eligibility engine

`evaluate(profile, scheme, today)` in `src/shared/eligibility/evaluate.ts`. Pure TypeScript, used by the API, `scripts/check-scheme.ts` and tests.

## Input and output

```ts
type Rule = {
  field: ProfileField        // one of PROFILE_FIELDS
  op: 'eq' | 'in' | 'notIn' | 'lte' | 'gte' | 'between' | 'exists' | 'isTrue'
  value?: unknown            // number, string, string[], [min, max]
  hard?: boolean             // default false
  nearMargin?: number        // soft numeric rules only
  label?: string             // optional human text, e.g. "Family income up to ₹2.5 lakh"
}

type Result = {
  state: 'eligible' | 'almost' | 'not' | 'unknown'
  score: number              // 0–100
  reasons: { rule: string; result: 'met' | 'notMet' | 'near' | 'unknown'; text: string }[]
  reason: string             // the one line shown on cards
}
```

## Steps

1. **Per rule:** read the profile field.
   - Missing → `unknown`.
   - Passes → `met`.
   - Fails but within `nearMargin` (numeric soft rules) → `near`, with the gap ("₹30,000 above the limit").
   - Otherwise → `notMet`.
2. **State:**
   - any hard rule `notMet` → `not`
   - any hard rule `unknown` → `unknown` ("Add your category to check this scheme")
   - all rules `met` → `eligible`
   - no `notMet`, and 1–2 `near` or soft `unknown` → `almost`
   - otherwise → `not`
3. **Score:** `100 × met / total`, +10 if the scheme's `groups` match the student (girls, disability, rural), so special schemes surface first; +5 if closing within 30 days; capped at 100.
4. **Card reason (priority order):** first hard `notMet` → first soft `notMet` → first `near` → first `unknown` → "You meet all N conditions". When the state is `unknown`, the card names the missing hard field instead: "Add your gender to check this scheme."

A missing value is always `unknown`, so `exists` can only be `met` or `unknown`. A value of the wrong type never passes.

## Operators

| Op | Passes when | Near (soft) |
| --- | --- | --- |
| `eq` | `field === value` | — |
| `in` | `value.includes(field)` | — |
| `notIn` | `!value.includes(field)` | — |
| `lte` | `field <= value` | `field <= value + nearMargin` |
| `gte` | `field >= value` | `field >= value - nearMargin` |
| `between` | `min <= field <= max` | within `nearMargin` of either edge |
| `exists` | field is set | — |
| `isTrue` | `field === true` | — |

## Reason templates (`reasons.ts`)

- `lte` money fail: "You are ₹{gap} above the income limit of ₹{value}."
- `gte` percent near: "You need {value}%; you have {field}%, which is {gap}% short."
- `in` fail: "This scheme is only for {valueList}."
- `unknown`: "Add your {fieldLabel} to your profile to check this."
- met: "{label}: you meet this."

Money uses Indian grouping (₹2,50,000). Words for fields and values are in `labels.ts`. Templates move to i18n keys later.

When every value of an `eq`/`in` rule describes a group of students, the rule reads "For girls and women" and a fail reads "This scheme is only for girls and women."; otherwise "Gender: female" / "This scheme needs your gender to be female."

## Derived fields

Computed before evaluating, never stored: `age` (completed years, from `dateOfBirth` and `today`), `isFinalYear` (`yearOfStudy` ≥ the usual course length for `courseCategory`: 5 for medicine, dental, architecture and law; 4 for engineering, pharmacy, agriculture, nursing, education, design and hotel management; 3 for the rest. NEP 4-year honours degrees can differ, so a scheme that depends on final year should say so in its `eligibilityText` too). Add new derived fields in `evaluate.ts` and list them in `PROFILE_FIELDS`.

## Caching

The API caches results per user in `matchResults` (`services/matching.ts`), keyed on `profileVersion` + `dataVersion` + the India date (age and the closing-soon bonus change daily). Changing any of them rebuilds the cache on the next request. The cached results are encrypted, because a state or reason can reveal income, category or disability. The detail route runs `evaluate()` directly.

## Checking a scheme file

`npm run check-scheme -- <file> [--today YYYY-MM-DD]` validates the file, lists its rules in words and prints the state, score and reason for each made-up student in `src/shared/eligibility/fixtures/profiles.ts`.

## Tests (must exist)

For each operator: pass, fail, exactly on the limit, one unit over, inside `nearMargin`, one unit past the margin, field missing. For state logic: hard fail beats everything, hard unknown → `unknown`, 2 near → `almost`, 3 near → `not`. Plus snapshot tests running `_example.json` against fixed sample profiles in `src/shared/eligibility/fixtures/`.
