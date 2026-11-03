const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'The request was not valid.',
  401: 'Please log in to continue.',
  403: 'This action is not allowed.',
  404: 'Not found.',
  409: 'This already exists.',
  415: 'Requests must be sent as JSON.',
  429: 'Too many requests. Please wait a minute and try again.',
  500: 'Something went wrong on our side. Please try again.',
}

/** Throw from a route; errorHandler turns it into `{ error: { code, message, fields? } }`. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message ?? DEFAULT_MESSAGES[status] ?? 'Error')
  }
}
