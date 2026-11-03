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
4. **Card reason (priority order):** first hard `notMet` → first `near` → first `unknown` → "You meet all N conditions".

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

Money uses Indian grouping (₹2,50,000). Templates use i18n keys later.

## Derived fields

Computed before evaluating, never stored: `age` (from `dateOfBirth` and `today`), `isFinalYear`. Add new derived fields in `evaluate.ts` and list them in `PROFILE_FIELDS`.

## Caching

The API caches results per user in `matchResults` with `profileVersion` + `dataVersion`. Changing either rebuilds the cache on the next request.

## Tests (must exist)

For each operator: pass, fail, exactly on the limit, one unit over, inside `nearMargin`, one unit past the margin, field missing. For state logic: hard fail beats everything, hard unknown → `unknown`, 2 near → `almost`, 3 near → `not`. Plus snapshot tests running `_example.json` against fixed sample profiles in `src/shared/eligibility/fixtures/`.
