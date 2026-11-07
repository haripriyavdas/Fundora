---
name: api-route
description: Add or change an Express API route in Fundora's src/server, with Zod validation, requireAuth, Mongoose and Supertest tests. Use for any new endpoint, route change, middleware or backend feature.
---

# Add or change an API route

Read `src/server/CLAUDE.md`, `docs/api.md` and `docs/backend.md` first.

## Steps

1. **Check `docs/api.md`.** If the route is listed, follow its path, body and response exactly. If it's new, add it to the table in the same change.
2. **Schemas first:** add or extend the request and response Zod schemas in `src/shared/schemas/` and export the inferred types.
3. **Model:** if it needs a new collection or field, update `src/server/models/` and `docs/database.md`. No `role` fields, ever.
4. **Route** in `src/server/routes/<area>.ts`:
   ```ts
   router.patch('/saved/:schemeId',
     requireAuth,
     validate({ params: SchemeIdParams, body: UpdateSavedBody }),
     async (req, res) => {
       const doc = await Application.findOneAndUpdate(
         { userId: req.user.id, schemeId: req.params.schemeId },   // always scope by req.user.id
         { $set: { stage: req.body.stage } },
         { new: true },
       )
       if (!doc) throw new HttpError(404, 'NOT_FOUND')
       res.json(toSavedScheme(doc))
     })
   ```
   - Student data: `requireAuth`, and filter every query by `req.user.id`.
   - Use only parsed values from `validate()` in queries, never raw `req.body` spread into a filter.
   - Logic over ~20 lines goes in `src/server/services/`.
   - Matching always calls `evaluate()` from `src/shared/eligibility`.
5. **Tests** in `src/server/routes/<area>.test.ts` (Supertest + mongodb-memory-server):
   - success
   - 400 for an invalid body
   - 401 when logged out
   - 404 when touching another student's resource
   - the route's own edge cases
6. **Client:** if the frontend uses it, add or update the function in `frontend-fundora-starter/features/<area>/api.ts`, typed from `@shared`.
7. **Check:** `npm run lint`, `npm run typecheck`, `npm test`.

## Never

- Write routes for schemes (they're seeded from files).
- Admin, role or "manage other users" routes.
- Return stack traces, Mongo errors, password hashes or another student's data.
- Log `familyIncome`, `category`, `disability`, passwords or cookies.
