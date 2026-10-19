import { analyzeRequestSchema, type ApiErrorCode } from '../../src/lib/apiContract.ts'
import { AnalyzeError, analyzeDocument } from './analyze.ts'

export interface Env {
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
  // Comma-separated exact origins, e.g. "https://user.github.io,http://localhost:5173"
  ALLOWED_ORIGINS?: string
  // Optional Cloudflare rate limiting binding
  RATE_LIMITER?: { limit: (options: { key: string }) => Promise<{ success: boolean }> }
}

const DEFAULT_MODEL = 'gemini-2.5-flash'
const MAX_BODY_BYTES = 1_000_000
const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 10

// Best-effort per-isolate limiter, used when no RATE_LIMITER binding is configured
const recentRequests = new Map<string, number[]>()

const isRateLimited = async (env: Env, ip: string): Promise<boolean> => {
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: ip })
    return !success
  }
  const now = Date.now()
  const timestamps = (recentRequests.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    recentRequests.set(ip, timestamps)
    return true
  }
  recentRequests.set(ip, [...timestamps, now])
  return false
}

const corsHeaders = (origin: string): Record<string, string> => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
})

const json = (body: unknown, status: number, headers: Record<string, string>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  })

const errorResponse = (
  code: ApiErrorCode,
  status: number,
  message: string,
  headers: Record<string, string>,
): Response => json({ error: { code, message } }, status, headers)

export const handleRequest = async (request: Request, env: Env): Promise<Response> => {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (!allowed.includes(origin)) {
    return errorResponse('FORBIDDEN_ORIGIN', 403, 'Origin not allowed', {})
  }
  const headers = corsHeaders(origin)

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  const url = new URL(request.url)
  if (request.method !== 'POST' || url.pathname !== '/analyze') {
    return errorResponse('BAD_REQUEST', 404, 'Use POST /analyze', headers)
  }

  if (!env.GEMINI_API_KEY) {
    return errorResponse('SERVER_MISCONFIGURED', 500, 'GEMINI_API_KEY is not set', headers)
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  if (await isRateLimited(env, ip)) {
    return errorResponse('RATE_LIMITED', 429, 'Too many requests', headers)
  }

  const declaredLength = Number(request.headers.get('Content-Length') ?? '0')
  if (declaredLength > MAX_BODY_BYTES) {
    return errorResponse('PAYLOAD_TOO_LARGE', 413, 'Request body too large', headers)
  }
  const rawBody = await request.text()
  if (rawBody.length > MAX_BODY_BYTES) {
    return errorResponse('PAYLOAD_TOO_LARGE', 413, 'Request body too large', headers)
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return errorResponse('BAD_REQUEST', 400, 'Invalid JSON', headers)
  }
  const parsed = analyzeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('BAD_REQUEST', 400, 'Invalid request body', headers)
  }

  try {
    const analysis = await analyzeDocument(parsed.data, {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL ?? DEFAULT_MODEL,
    })
    return json(analysis, 200, headers)
  } catch (error) {
    if (error instanceof AnalyzeError) {
      return errorResponse(error.code, error.status, error.message, headers)
    }
    return errorResponse('AI_UNAVAILABLE', 502, 'Unexpected error', headers)
  }
}

export default {
  fetch: handleRequest,
}
