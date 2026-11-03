import { existsSync } from 'node:fs'
import { z } from 'zod'

// Load .env for local runs (Node's built-in loader; real env vars win). Tests set their own.
if (process.env.NODE_ENV !== 'test' && existsSync('.env')) process.loadEnvFile('.env')

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    APP_URL: z.url(),
    MONGODB_URI: z.string().startsWith('mongodb'),
    JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
    FIELD_ENCRYPTION_KEY: z
      .string()
      .refine((v) => Buffer.from(v, 'base64').length === 32, 'must be 32 bytes, base64'),
    // `console` prints emails to the terminal; only for local development.
    EMAIL_PROVIDER: z.enum(['resend', 'brevo', 'console']),
    EMAIL_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().min(1),
    TEAM_INBOX: z.email(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_PROVIDER !== 'console' && !env.EMAIL_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_API_KEY'],
        message: 'required for resend/brevo',
      })
    }
    if (env.NODE_ENV === 'production' && env.EMAIL_PROVIDER === 'console') {
      ctx.addIssue({ code: 'custom', path: ['EMAIL_PROVIDER'], message: 'console is dev only' })
    }
  })

// Treat empty strings in .env as "not set"
const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''))
const parsed = EnvSchema.safeParse(raw)

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`)
  // eslint-disable-next-line no-console -- the logger depends on env, so it can't be used yet
  console.error(`Invalid environment variables (see .env.example):\n${lines.join('\n')}`)
  process.exit(1)
}

export const env = parsed.data
export const isProd = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'
