import {
  MAX_TEXT_CHARS,
  apiErrorSchema,
  type AnalyzeRequest,
  type ApiErrorCode,
} from '../lib/apiContract.ts'
import { analysisSchema, type Analysis } from '../lib/schema.ts'

const REQUEST_TIMEOUT_MS = 60_000

export type ClientErrorCode = ApiErrorCode | 'NETWORK' | 'TIMEOUT' | 'NO_API_URL' | 'INVALID_RESULT'

export class AnalyzeApiError extends Error {
  readonly code: ClientErrorCode

  constructor(code: ClientErrorCode) {
    super(code)
    this.code = code
  }
}

export const truncateText = (text: string): { text: string; truncated: boolean } =>
  text.length > MAX_TEXT_CHARS
    ? { text: text.slice(0, MAX_TEXT_CHARS), truncated: true }
    : { text, truncated: false }

export const analyzeText = async (
  request: AnalyzeRequest,
  signal?: AbortSignal,
): Promise<Analysis> => {
  const apiUrl = import.meta.env.VITE_API_URL
  if (!apiUrl) throw new AnalyzeApiError('NO_API_URL')

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(`${apiUrl.replace(/\/$/, '')}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
  } catch {
    throw new AnalyzeApiError(timeout.aborted ? 'TIMEOUT' : 'NETWORK')
  }

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const apiError = apiErrorSchema.safeParse(body)
    throw new AnalyzeApiError(apiError.success ? apiError.data.error.code : 'NETWORK')
  }

  // F-04: validate again on the client before anything is displayed
  const result = analysisSchema.safeParse(body)
  if (!result.success) throw new AnalyzeApiError('INVALID_RESULT')
  return result.data
}
