---
name: mongodb
description: Work with Fundora's MongoDB - Mongoose models, indexes, migrations, test data, and the MongoDB MCP server on the dev database. Use when creating or changing a model or index, inspecting data, debugging slow or wrong queries, or seeding test data.
---

# Work with the database

Read `docs/database.md` first. It lists every collection, field and index.

## Source of truth

- **Shapes:** Zod schemas in `src/shared/schemas` → Mongoose models in `src/server/models` → `docs/database.md`. Change all three together.
- **Scheme documents:** `data/schemes/*.json` via `npm run seed`. Never insert or edit schemes any other way.

## Using the MongoDB MCP server

- Only against `fundora_dev`. If the connection string points anywhere else, stop and tell the user.
- Before writing: run `list-collections`, then `collection-schema` and `collection-indexes` for the collection you'll touch.
- Allowed without asking: find, count, aggregate, explain, collection-schema, collection-indexes, create-index on dev, inserting clearly fake test data.
- Ask first, in that message: update-many, delete-many, rename-collection.
- Never: drop-collection, drop-database, anything on a prod database, copying real student data into code, tests or chat.
- Encrypted fields (`familyIncome`, `category`, `disability`) are ciphertext. Don't try to query or decrypt them through MCP.

## Changing a model

1. Update the Zod schema, then the Mongoose model (`timestamps: true`, `strict: true`).
2. Add indexes in the model (`schema.index(...)`) so they're created at startup, then check with `explain` that the main queries use them.
3. For a breaking field change, write a one-off script in `scripts/migrations/YYYY-MM-DD-<name>.ts` that is safe to run twice, with `--dry-run`.
4. Update `docs/database.md` and the model's tests.

## Rules

- No `role` field and no admin, organization or audit collections (see `docs/decisions.md`).
- Tracker `stage` enum is exactly `saved | applied | renewal_due`.
- Every per-student query filters by `userId`.
- Deleting a student removes users, profiles, applications, matchResults and notifications in one transaction.
