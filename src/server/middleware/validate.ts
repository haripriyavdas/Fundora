import type { RequestHandler } from 'express'
import type { z } from 'zod'

type Schemas = { body?: z.ZodType; params?: z.ZodType; query?: z.ZodType }

/**
 * Parses body, params and query with shared Zod schemas. On failure the ZodError reaches
 * errorHandler (400 with field errors). Handlers then only see parsed, typed values.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {})
    if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params
    if (schemas.query) {
      // Express 5 makes req.query a getter, so replace the property instead of assigning
      Object.defineProperty(req, 'query', {
        value: schemas.query.parse(req.query),
        writable: true,
        enumerable: true,
      })
    }
    next()
  }
}
