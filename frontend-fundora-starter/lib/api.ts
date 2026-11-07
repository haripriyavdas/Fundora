import { ApiErrorBody } from '@shared/schemas'

const BASE = '/api/v1'

/** A failed API call. `fields` holds per-field messages for VALIDATION_FAILED. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message)
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'network')
  }

  if (res.status === 204) return undefined as T
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const parsed = ApiErrorBody.safeParse(data)
    if (parsed.success) {
      const { code, message, fields } = parsed.data.error
      throw new ApiError(res.status, code, message, fields)
    }
    throw new ApiError(res.status, 'UNKNOWN', res.statusText)
  }
  return data as T
}

export const apiGet = <T>(path: string) => request<T>('GET', path)
export const apiPost = <T>(path: string, body?: unknown) => request<T>('POST', path, body)
export const apiPut = <T>(path: string, body?: unknown) => request<T>('PUT', path, body)
export const apiPatch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, body)
export const apiDelete = <T>(path: string) => request<T>('DELETE', path)
