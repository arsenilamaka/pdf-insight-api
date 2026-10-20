import type { AnalyzeRequest, ApiErrorCode } from '../../src/lib/apiContract.ts'
import {
  aiResultSchema,
  analysisSchema,
  buildAnalysis,
  type Analysis,
} from '../../src/lib/schema.ts'
import { RESPONSE_SCHEMA, SYSTEM_PROMPT, buildUserPrompt } from './prompt.ts'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const ATTEMPT_TIMEOUT_MS = 25_000

export class AnalyzeError extends Error {
  readonly code: ApiErrorCode
  readonly status: number

  constructor(code: ApiErrorCode, status: number, message: string) {
    super(message)
    this.code = code
    this.status = status
  }
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
}

export const buildGeminiBody = (model: string, text: string): Record<string, unknown> => ({
  systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
  contents: [{ role: 'user', parts: [{ text: buildUserPrompt(text) }] }],
  generationConfig: {
    temperature: 0.1,
    responseMimeType: 'application/json',
    responseSchema: RESPONSE_SCHEMA,
    // Flash models think by default; keeping it minimal keeps the answer well under 30 s
    thinkingConfig: model.startsWith('gemini-2.5')
      ? { thinkingBudget: 0 }
      : { thinkingLevel: 'low' },
  },
})

const callGemini = async (
  fetchFn: typeof fetch,
  apiKey: string,
  model: string,
  text: string,
): Promise<string> => {
  let response: Response
  try {
    response = await fetchFn(`${GEMINI_URL}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(buildGeminiBody(model, text)),
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    })
  } catch {
    throw new AnalyzeError('AI_UNAVAILABLE', 504, 'AI provider did not respond in time')
  }

  if (response.status === 404) {
    // Model ids get retired; GEMINI_MODEL must name a model that still exists
    throw new AnalyzeError('SERVER_MISCONFIGURED', 500, `AI model "${model}" not found`)
  }
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    // Invalid key, missing access or rejected config: retrying will not help
    throw new AnalyzeError('SERVER_MISCONFIGURED', 500, `AI provider rejected the request`)
  }
  if (response.status === 429) {
    throw new AnalyzeError('AI_QUOTA_EXCEEDED', 429, 'AI provider quota exceeded')
  }
  if (!response.ok) {
    throw new AnalyzeError('AI_UNAVAILABLE', 502, `AI provider returned ${response.status}`)
  }

  const data = (await response.json()) as GeminiResponse
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
}

// Parses and validates raw model output; returns null when it does not match the schema.
export const parseModelOutput = (
  raw: string,
  meta: { fileName: string; pages: number },
): Analysis | null => {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  const ai = aiResultSchema.safeParse(json)
  if (!ai.success) return null
  const full = analysisSchema.safeParse(buildAnalysis(ai.data, meta))
  return full.success ? full.data : null
}

// Brief: invalid AI answer -> one retry, then an error.
export const analyzeDocument = async (
  request: AnalyzeRequest,
  options: { apiKey: string; model: string; fetchFn?: typeof fetch },
): Promise<Analysis> => {
  const fetchFn = options.fetchFn ?? fetch
  const meta = { fileName: request.fileName, pages: request.pages }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await callGemini(fetchFn, options.apiKey, options.model, request.text)
    const result = parseModelOutput(raw, meta)
    if (result) return result
  }
  throw new AnalyzeError('AI_INVALID_RESPONSE', 502, 'AI response did not match the schema')
}
