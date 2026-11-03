# data/schemes — scheme data (source of truth)

Every scholarship, loan, fee waiver or grant is one JSON file here. Full format: `docs/scheme-data.md`. Skill: `add-scheme`.

## Layout

```
data/schemes/
├── central/        ← Government of India schemes (NSP, AICTE, UGC, ministries)
├── karnataka/      ← Karnataka state schemes (SSP, etc.). Other states get their own folder.
├── private/        ← foundations, companies, trusts, banks
└── _example.json   ← format reference; files starting with "_" are skipped
```

File name = the scheme's `id` (lowercase, hyphens): `central/post-matric-sc.json`.

## Rules

- **Every fact comes from the official source.** Put the page you used in `sourceUrl` and today's date in `verifiedOn`. Never guess an amount, a deadline or an income limit. If the source doesn't say, leave the field out and add a `notes` entry.
- `portal.url` is the official page where the student applies. Never a third-party site.
- Rules use only fields listed in `PROFILE_FIELDS` (`src/shared/schemas/profile.ts`) and only the supported operators.
- Mark rules `"hard": true` when missing them can never be fixed (category, gender, state, course, nationality, disability). Income, marks, attendance and age are soft and get a `nearMargin`.
- Run `npm run validate-schemes` and `npm run check-scheme -- <file>` before committing. Paste the check-scheme output into the PR.
- A second teammate reviews every scheme PR against the official source.
- To remove a scheme, delete the file. The seed marks it `retired`; it is never hard-deleted from the database.
