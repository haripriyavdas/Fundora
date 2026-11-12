import cookieParser from 'cookie-parser'
import express, { type Express } from 'express'
import helmet from 'helmet'
import { isProd } from './config/env.js'
import { logger } from './lib/logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import type { RateLimits } from './middleware/rateLimit.js'
import { createApiRouter } from './routes/index.js'

type AppOptions = {
  /** Mounts the React app after the API (vite.ts). Omitted in API tests. */
  mountClient?: (app: Express) => void
  rateLimits?: RateLimits
}

// CSP: only our own origin, Google sign-in and PostHog (docs/security.md)
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style'],
  frameSrc: ["'self'", 'https://accounts.google.com/gsi/'],
  connectSrc: ["'self'", 'https://accounts.google.com/gsi/', 'https://*.posthog.com'],
  imgSrc: ["'self'", 'data:', 'https://*.googleusercontent.com'],
  fontSrc: ["'self'", 'data:'],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
}

/** Builds the app without listening, so Supertest can import it. */
export function createApp({ mountClient, rateLimits }: AppOptions = {}): Express {
  const app = express()
  app.disable('x-powered-by')
  // Render sits behind one proxy; needed for per-IP rate limits
  if (isProd) app.set('trust proxy', 1)

  // Vite's dev server injects inline scripts for hot reload, so CSP is enforced in production only
  app.use(
    helmet({
      contentSecurityPolicy: isProd ? { directives: cspDirectives } : false,
      // Google's sign-in popup has to report back to this page, and Google checks the origin
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  )
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())
  app.use((req, res, next) => {
    const start = Date.now()
    // Method, path and status only: never bodies, query strings or cookies
    res.on('finish', () =>
      logger.debug({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start,
      }),
    )
    next()
  })

  app.use('/api/v1', createApiRouter(rateLimits))
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } })
  })

  mountClient?.(app)

  app.use(errorHandler)
  return app
}
