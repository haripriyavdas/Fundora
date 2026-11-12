import type { RequestHandler } from 'express'
import { HttpError } from '../lib/httpError.js'
import { User } from '../models/User.js'
import { userId } from './requireAuth.js'

/**
 * Use after requireAuth on routes that write student data. A cookie can outlive its account;
 * without this check an upsert would recreate a deleted student's data.
 */
export const requireAccount: RequestHandler = async (req, _res, next) => {
  if (!(await User.exists({ _id: userId(req) }))) throw new HttpError(401, 'UNAUTHENTICATED')
  next()
}
