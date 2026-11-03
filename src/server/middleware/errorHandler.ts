import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import type { ApiErrorBody } from '../../shared/schemas/index.js'
import { HttpError } from '../lib/httpError.js'
import { logger } from '../lib/logger.js'

/** Maps errors to `{ error: { code, message, fields? } }`. Never sends stacks or Mongo errors. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let httpError: HttpError

  if (err instanceof HttpError) {
    httpError = err
  } else if (err instanceof ZodError) {
    const fields: Record<string, string> = {}
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_'
      fields[key] ??= issue.message
    }
    httpError = new HttpError(
      400,
      'VALIDATION_FAILED',
      'Please check the highlighted fields.',
      fields,
    )
  } else if (err?.type === 'entity.parse.failed') {
    httpError = new HttpError(400, 'INVALID_JSON', 'The request body is not valid JSON.')
  } else if (err?.type === 'entity.too.large') {
    httpError = new HttpError(413, 'PAYLOAD_TOO_LARGE', 'The request is too large.')
  } else {
    // Unexpected: log only safe parts (no body, which can contain passwords or profile data)
    logger.error({ err, method: req.method, path: req.path }, 'unhandled error')
    httpError = new HttpError(500, 'INTERNAL')
  }

  const body: ApiErrorBody = {
    error: {
      code: httpError.code,
      message: httpError.message,
      ...(httpError.fields ? { fields: httpError.fields } : {}),
    },
  }
  res.status(httpError.status).json(body)
}
