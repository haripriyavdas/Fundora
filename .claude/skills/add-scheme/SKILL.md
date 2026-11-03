---
name: add-scheme
description: Add or update a scholarship, loan, fee waiver or grant in Fundora's data/schemes folder from its official source. Use when asked to add a scheme, fix scheme details, update a deadline or amount, or re-verify a scheme.
---

# Add or update a scheme

Schemes are JSON files in `data/schemes/`. Read `data/schemes/CLAUDE.md` and `docs/scheme-data.md` first.

## Steps

1. **Get the official source.** Ask for the official URL if the user didn't give one. Use only government portals (scholarships.gov.in, ssp.karnataka.gov.in, aicte-india.org, ministry sites) or the provider's own site. Never aggregator or blog sites. If you can fetch the page, read it fully; if not, ask the user to paste the details or attach the guidelines PDF.
2. **Check for duplicates.** Search `data/schemes/` for the scheme name and provider. If it exists, update that file instead of creating a new one.
3. **Pick the folder and id:** `central/`, `<state>/` or `private/`; id = lowercase-hyphen slug, same as the file name.
4. **Copy the shape of `_example.json`** and fill every field you can confirm from the source:
   - `amount` as display text plus `amountMax` as a number
   - `closesOn` from the source (`null` only if it says open all year)
   - `portal.url` = the official apply page; `sourceUrl` = the page you read; `verifiedOn` = today
   - `documents` with issuing authority and format notes; `steps` in order; `offline` if hard copies are needed
5. **Write rules** using only fields in `PROFILE_FIELDS` (`src/shared/schemas/profile.ts`):
   - category, gender, state, course, nationality, disability → `"hard": true`
   - income, marks, attendance, age → soft, with `nearMargin` (income ₹50,000; percent 5; CGPA 0.5; age 1)
   - Add `label` text matching the source's wording.
6. **Never invent facts.** If the source doesn't state something, leave it out and add a line to `notes` (for example, "Income limit not stated in 2026–27 guidelines").
7. **Validate:** `npm run validate-schemes`, then `npm run check-scheme -- <file>`. Fix every error.
8. **Report back:** the file path, a short summary (amount, deadline, key rules), the check-scheme table, any facts you couldn't confirm, and a suggested PR title `scheme: <name>`.

## Don'ts

- Don't edit the database directly or through the MongoDB MCP server; the seed script does that.
- Don't change engine code to make a scheme fit. If a rule can't be expressed, stop and explain what operator or field is missing.
- Don't copy long passages of the source word for word; summarise.
