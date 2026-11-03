---
name: security-review
description: Review Fundora changes for security, privacy and scope problems before a commit or PR. Use when asked to review code, check a PR, run a security or privacy check, or before saying a feature is finished.
---

# Security and privacy review

Read `docs/security.md`. Review the current diff (`git diff main...HEAD`, plus uncommitted changes), or the whole codebase if asked.

## Checklist

Report each item as pass / issue (with file:line) / not applicable.

**Secrets**
- [ ] No keys, passwords or connection strings in code, tests, docs or `VITE_*` variables
- [ ] New env vars added to `config/env.ts`, `.env.example` and `docs/deployment.md`

**Privacy**
- [ ] No Aadhaar, bank account or ID numbers, or portal passwords collected or stored
- [ ] `familyIncome`, `category`, `disability` encrypted before save; never logged, never in analytics, never in error messages
- [ ] No real student data in fixtures, seeds or screenshots
- [ ] Account deletion and export still cover any new collection or field

**Access**
- [ ] Every student route uses `requireAuth` and filters by `req.user.id`
- [ ] Another student's resource returns 404
- [ ] No role field, role check, admin route or admin page added
- [ ] No route writes to `schemes`

**Input and output**
- [ ] Zod validation on body, params and query of every new route
- [ ] No raw `req.body` or `req.query` spread into a Mongo filter
- [ ] Errors don't leak stack traces, Mongo messages or hashes

**Scope and trust**
- [ ] No feature fills or submits applications or stores portal credentials
- [ ] Apply links go only to `scheme.portal.url`, with `rel="noopener noreferrer"`
- [ ] New scheme files have `sourceUrl`, `verifiedOn` and an official `portal.url`

**Quality**
- [ ] Tests cover the new behaviour, including 401/404 cases
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm audit --audit-level=high` pass

## Output

A short list of issues ordered by severity (Critical / High / Medium / Low), each with file:line, what's wrong, and the fix. Offer to apply the fixes. If everything passes, say so in one line.
