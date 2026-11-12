import { Router } from 'express'
import { todayInIndia } from '../../shared/dates.js'
import { SchemeParams, SchemesQuery, type Scheme } from '../../shared/schemas/index.js'
import { HttpError } from '../lib/httpError.js'
import { readSession } from '../middleware/requireAuth.js'
import { validate } from '../middleware/validate.js'
import {
  loadActiveScheme,
  loadActiveSchemes,
  matchesFor,
  matchesQuery,
  matchFor,
  sortSchemes,
  toScheme,
} from '../services/matching.js'

// Read-only: schemes come from data/schemes via `npm run seed`. Never add write routes here.
export const schemesRouter = Router()

schemesRouter.get('/', readSession, validate({ query: SchemesQuery }), async (req, res) => {
  const query = req.query as unknown as SchemesQuery
  const today = todayInIndia()
  const stored = await loadActiveSchemes()
  const matches = req.user ? await matchesFor(req.user.id, stored, today) : undefined

  const schemes = stored
    .map((scheme) => toScheme(scheme, today, matches?.get(scheme.id)))
    .filter((scheme) => matchesQuery(scheme, query))
  res.json(sortSchemes(schemes, query.sort ?? (req.user ? 'match' : 'closing')) satisfies Scheme[])
})

schemesRouter.get('/:id', readSession, validate({ params: SchemeParams }), async (req, res) => {
  const scheme = await loadActiveScheme(req.params.id as string)
  if (!scheme) throw new HttpError(404, 'NOT_FOUND')
  const today = todayInIndia()
  const match = req.user ? await matchFor(req.user.id, scheme, today) : undefined
  res.json(toScheme(scheme, today, match, true) satisfies Scheme)
})
