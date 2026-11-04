# Database

MongoDB Atlas, accessed through Mongoose in `src/server/models`. Seven collections. Students are the only users, so there are no role, organization or audit collections.

Databases: `fundora_dev` (local + MCP), `fundora_test` (CI uses mongodb-memory-server instead), `fundora_prod`.

## Collections

### users
| Field | Type | Notes |
| --- | --- | --- |
| `email` | string | lowercase, unique |
| `passwordHash` | string? | bcrypt; absent for Google-only accounts |
| `googleId` | string? | sparse unique |
| `verified` | boolean | |
| `consentAt` | Date | when they accepted the privacy notice |
| `verifyTokenHash`, `verifyTokenExpiresAt` | string?, Date? | SHA-256 of the emailed verification token (24 h); removed once used |
| `resetTokenHash`, `resetTokenExpiresAt` | string?, Date? | SHA-256 of the emailed reset token (1 h); removed once used |
| `createdAt`, `updatedAt` | Date | timestamps |

`passwordHash` and the token fields are `select: false`, so they never leave the server unless a query asks for them.

Indexes: `{ email: 1 }` unique, `{ googleId: 1 }` unique sparse, `{ verifyTokenHash: 1 }` sparse, `{ resetTokenHash: 1 }` sparse. **No `role` field.**

### profiles
One per user. Fields match `ProfileSchema` (`src/shared/schemas/profile.ts`).

| Group | Fields |
| --- | --- |
| Education | `educationLevel` ("UG"), `courseCategory` (one of 19), `courseName`, `yearOfStudy` (1–5), `institutionState`, `institutionType` (govt / aided / private) |
| Marks | `class10Percent`, `class12Percent`, `cgpa`, `attendancePercent` |
| Family | `familyIncome` 🔒 (₹/year), `parentOccupation`, `firstGenLearner`, `orphan`, `singleParent`, `defenceWard` |
| Background | `category` 🔒 (GEN/OBC/SC/ST/EWS), `minority` (boolean), `gender`, `disability` 🔒 (`{ has, percent? }`), `domicileState`, `rural`, `nationality`, `dateOfBirth` |
| Current aid | `hasOtherScholarship`, `otherScholarshipName` |
| Documents held (yes/no) | `docs.incomeCertificate`, `docs.casteCertificate`, `docs.disabilityCertificate`, `docs.domicileCertificate`, `docs.bankAadhaarSeeded`, `docs.class12Marksheet`, `docs.feeReceipt` |
| System | `userId` (unique), `profileVersion` (int, +1 on every save) |

🔒 = stored encrypted (`iv:tag:ciphertext` string) via `services/crypto.ts`. Encrypted fields can't be queried, which is fine because matching runs in Node. `disability` is one encrypted value, so `{ has, percent? }` isn't readable as separate paths in the database.

Value lists are in `src/shared/constants.ts`: `parentOccupation` and `nationality` are fixed lists so scheme rules can match them, `gender` is `female` / `male` / `other`, and states are two-letter codes. Value rules live in Zod, not in the Mongoose model. A field the student clears is removed from the document, not stored as `null`. A profile document is only created on the first save.

Never stored: Aadhaar number, bank account number, any ID number, portal usernames or passwords.

Index: `{ userId: 1 }` unique.

### schemes
Written **only** by `scripts/seed.ts` from `data/schemes/**/*.json`. Same fields as the JSON file (see `scheme-data.md`) plus:

| Field | Notes |
| --- | --- |
| `status` | `active` or `retired` (file deleted) |
| `dataVersion` | int, set by the seed run |
| `seededAt` | Date |

Indexes: `{ id: 1 }` unique, `{ status: 1, level: 1, courses: 1, states: 1 }`, `{ closesOn: 1 }`, text or Atlas Search on `name`, `provider`, `about`.

### applications (saved schemes / tracker)
| Field | Notes |
| --- | --- |
| `userId`, `schemeId` | |
| `stage` | `saved` \| `applied` \| `renewal_due` (no other values) |
| `savedOn`, `appliedOn?` | dates |
| `notes?` | max 500 chars |

Index: `{ userId: 1, schemeId: 1 }` unique. API path is `/saved`.

### matchResults (cache)
`userId`, `profileVersion`, `dataVersion`, `results: [{ schemeId, state, score, reasons[] }]`, `computedAt`. Index `{ userId: 1 }` unique; rebuilt when either version changes. TTL index on `computedAt` (30 days).

### notifications
`userId`, `schemeId`, `kind` (`deadline` \| `renewal`), `sendAt`, `sentAt?`. Index `{ sentAt: 1, sendAt: 1 }`, `{ userId: 1 }`.

### reports
`schemeId`, `userId`, `field`, `message`, `status` (`open` \| `fixed` \| `rejected`), `createdAt`. Index `{ status: 1 }`. The team reviews these in Atlas (or through the MCP server) and fixes the scheme file by PR.

## Deleting an account

`DELETE /account` removes, in one transaction: `users`, `profiles`, `applications`, `matchResults`, `notifications` for that user. `reports` are kept with `userId` set to null.

## MongoDB MCP server (for Claude Code)

`.mcp.json` registers the official MongoDB MCP server, so Claude Code can inspect collections, schemas and indexes and run queries while building.

Setup:
1. In Atlas, create a database user with **readWrite on `fundora_dev` only** (never prod).
2. Put its connection string in your shell environment as `MDB_MCP_CONNECTION_STRING`, not in any committed file. Or add the server privately instead of using `.mcp.json`:
   ```bash
   claude mcp add mongodb -e MDB_MCP_CONNECTION_STRING="mongodb+srv://…/fundora_dev" -- npx -y mongodb-mcp-server
   ```
3. On Windows, if the server doesn't start, wrap the command: `-- cmd /c npx -y mongodb-mcp-server`.
4. In Claude Code, run `/mcp` to check it is connected.

Rules for Claude when using it:
- Dev database only. Read the collection schema (`collection-schema`) and indexes before writing.
- Never `drop-collection`, `drop-database` or `delete-many` without the user asking in that message.
- Schema changes go in Mongoose models first; the MCP server is for inspecting, indexing and test data, not the source of truth.
- Never copy real student data out of any database into code, tests or chat.
