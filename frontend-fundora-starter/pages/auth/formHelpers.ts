import { useCallback, useState } from 'react'
import type { TFunction } from 'i18next'
import type { z } from 'zod'
import { ApiError } from '@/lib/api'

export type FieldErrors = Record<string, string>

/** Runs a shared Zod schema in the browser so students see the same rules the API enforces. */
export function checkFields<S extends z.ZodType>(
  schema: S,
  values: unknown,
): { data: z.infer<S>; errors: null } | { data: null; errors: FieldErrors } {
  const result = schema.safeParse(values)
  if (result.success) return { data: result.data, errors: null }
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) errors[String(issue.path[0] ?? '_')] ??= issue.message
  return { data: null, errors }
}

/** A form-level message for a failed API call. */
export function apiErrorMessage(t: TFunction, err: unknown): string {
  if (!(err instanceof ApiError)) return t('common.serverError')
  if (err.code === 'NETWORK') return t('common.networkError')
  if (err.code === 'RATE_LIMITED') return t('common.rateLimited')
  if (err.status >= 500) return t('common.serverError')
  return t(`auth.errors.${err.code}`, { defaultValue: err.message })
}

/** `animate-shake` on a failed submit; re-triggers on every failure. */
export function useShake() {
  const [shaking, setShaking] = useState(false)
  const shake = useCallback(() => {
    setShaking(false)
    requestAnimationFrame(() => setShaking(true))
  }, [])
  return {
    shakeClass: shaking ? 'animate-shake' : '',
    shake,
    onAnimationEnd: () => setShaking(false),
  }
}
