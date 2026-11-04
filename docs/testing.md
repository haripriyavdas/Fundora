# Testing

| Layer | Tool | Where | Runs |
| --- | --- | --- | --- |
| Engine + schemas | Vitest | `src/shared/**/*.test.ts` | every PR |
| API | Vitest + Supertest + mongodb-memory-server | `src/server/**/*.test.ts` | every PR |
| Components | Vitest + Testing Library (jsdom) | `src/client/**/*.test.tsx` | every PR |
| Scheme data | `npm run validate-schemes` | `data/schemes` | every PR |
| End to end | Playwright (mobile Chrome profile) | `tests/e2e` | PRs to `main` |
| Accessibility | @axe-core/playwright inside e2e | `tests/e2e` | PRs to `main` |

## Must-have tests

**Engine:** every operator × (pass, fail, at limit, one over, in margin, past margin, missing field); state rules (hard fail wins, hard unknown → unknown, ≤2 near → almost, 3 near → not); reasons format money with Indian grouping.

**API, per route:** happy path · 400 on a bad body · 401 logged out · 404 for another student's resource · rate limit on auth. Plus:
- `PUT /profile` stores encrypted values (read the raw document, check it isn't plaintext) and bumps `profileVersion`
- `GET /schemes` logged out → every `match.state` is `unknown`
- `PATCH /saved/:id` rejects stages other than `saved | applied | renewal_due`
- `DELETE /account` leaves nothing behind for that user
- no route exists under `/api/v1/admin` (a 404 test, so nobody adds one by accident)

**E2E main path:** sign up → verify (token read from the test mailbox stub) → complete profile → see matches with reasons → open a scheme → save it → mark Applied → Apply button opens the official URL in a new tab.

## Conventions

- Test files sit next to the code: `evaluate.ts` → `evaluate.test.ts`.
- Fixtures: sample profiles in `src/shared/eligibility/fixtures/profiles.ts`, sample schemes in `fixtures/schemes.ts`. Made-up data only; never real students.
- Email in tests uses a stub transport that stores messages in memory (`outbox` in `services/email.ts`); `tokenFromEmail()` in `src/server/test/setup.ts` reads links from it.
- API tests call `useTestDb()` and `testApp()` from `src/server/test/setup.ts`. The in-memory MongoDB keeps its files under `node_modules/.cache/mongo-test`, not the OS temp folder, because mongod won't start with under 500 MB free on that drive. The first run downloads the MongoDB binary.
- Component tests start with `// @vitest-environment jsdom` and mock `features/*/api`. `jsdom` stays on v26 while we run Node 20.
- API tests need to open local ports (Supertest and mongod). In a sandbox that blocks them they fail with `listen EPERM`, which isn't a bug in the code.
- `npm test` must pass with no network access.
