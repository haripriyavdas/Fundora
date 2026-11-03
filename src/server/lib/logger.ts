import { pino } from 'pino'
import { env, isProd, isTest } from '../config/env.js'

// Sensitive profile fields, passwords and cookies never reach the logs.
export const logger = pino({
  level: isTest ? 'silent' : isProd ? 'info' : 'debug',
  redact: {
    paths: [
      'familyIncome',
      'category',
      'disability',
      'password',
      '*.familyIncome',
      '*.category',
      '*.disability',
      '*.password',
      '*.passwordHash',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
    ],
    censor: '[redacted]',
  },
  ...(env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
})
