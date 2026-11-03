# Scheme data

Schemes are JSON files in `data/schemes/`, reviewed by pull request and loaded into MongoDB by `npm run seed`. There is no admin panel: this folder and its git history are the admin.

## Workflow

1. Find the scheme's **official** page (NSP at scholarships.gov.in, Karnataka SSP, AICTE, the ministry or foundation site).
2. Copy `data/schemes/_example.json` to `data/schemes/<folder>/<id>.json` (or ask Claude Code with the `add-scheme` skill and give it the official URL).
3. Fill every field from the source. Set `sourceUrl` and `verifiedOn` (today).
4. `npm run validate-schemes` must pass. `npm run check-scheme -- <file>` shows results for sample profiles.
5. Open a PR titled `scheme: <name>`, paste the check-scheme output, and link the source.
6. A second teammate checks amounts, limits, dates and the portal link against the source, then approves.
7. On merge to `main`, GitHub Actions runs `validate-schemes` then `seed` against production.

For teammates who don't code: fill the shared Google Sheet (one row per scheme, same columns), export as CSV, and run `npm run import-sheet -- schemes.csv` to generate the JSON files for review.

## File format

| Field | Required | Type / values |
| --- | --- | --- |
| `id` | ✓ | lowercase-hyphen slug, same as the file name |
| `name`, `provider` | ✓ | string |
| `providerType` | ✓ | `central` \| `state` \| `private` \| `bank` |
| `aidType` | ✓ | `scholarship` \| `loan` \| `feeWaiver` \| `device` \| `hostel` \| `books` \| `coaching` \| `travel` |
| `level` | ✓ | `UG` |
| `courses` | ✓ | course category slugs or `["ALL"]` |
| `states` | ✓ | domicile state codes (`KA`, `MH`…) or `["ALL"]` |
| `groups` | | `girls` \| `disability` \| `rural` (used to surface special schemes first) |
| `amount` | ✓ | display text, e.g. `"₹50,000 / year"` |
| `amountMax` | | number, whole rupees, for sorting and filtering |
| `opensOn`, `closesOn` | | `YYYY-MM-DD`; `closesOn: null` = open all year |
| `mode` | ✓ | `online` \| `onlineAndOffline` |
| `portal` | ✓ | `{ name, url }`, the official apply page |
| `sourceUrl` | ✓ | the page the facts came from |
| `verifiedOn` | ✓ | `YYYY-MM-DD` |
| `about`, `benefits[]`, `eligibilityText[]` | | display text |
| `rules` | ✓ | see `eligibility-engine.md`; at least one rule |
| `renewal` | | `{ minAttendancePercent?, minCgpa?, text }` |
| `documents` | ✓ | `[{ id, name, note }]` |
| `steps` | ✓ | `[{ title, text }]` |
| `offline` | | `{ summary, where, when, carry[], tip? }` or `null`; required when `mode` is `onlineAndOffline` |
| `officialDocuments` | | `[{ title, kind, format, url, publishedOn? }]` |
| `importantDates` | | `[{ label, date }]` |
| `helpline` | | `{ phone?, email?, hours? }` |
| `notes` | | internal notes, not shown to students |

Course category slugs: `arts`, `science`, `commerce`, `management`, `computer-it`, `engineering`, `medicine`, `dental`, `pharmacy`, `architecture`, `agriculture`, `nursing`, `paramedical`, `law`, `education`, `design-fine-arts`, `hotel-management`, `social-sciences`, `vocational`.

## What the scripts do

| Script | Does |
| --- | --- |
| `validate-schemes` | Parses every non-`_` file with `SchemeFileSchema`; checks `id` = file name, unique ids, rule fields exist in `PROFILE_FIELDS`, operators valid, URLs are https, `offline` present when needed. Warns (doesn't fail) when `verifiedOn` is over 90 days old or `closesOn` has passed. Exit code 1 on any error. |
| `check-scheme <file>` | Runs `evaluate()` against the fixture profiles and prints a table: profile, state, reason. |
| `seed` | Validates, then upserts each scheme by `id` with a new `dataVersion`, sets `status: retired` on ids no longer in the folder, prints added / updated / retired counts. Needs `MONGODB_URI`. Supports `--dry-run`. |
| `import-sheet <csv>` | Converts sheet rows to JSON files (uses papaparse), then runs validate on them. |

## Launch target

100 verified schemes before launch: central schemes first (NSP, AICTE Pragati/Saksham, ministry schemes), then Karnataka (SSP, Vidyasiri and others), then large private foundations, then other states. Each state folder has an owner who re-verifies its files every 90 days.
