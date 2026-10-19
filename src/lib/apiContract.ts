import { z } from 'zod'

// Contract between the SPA and the worker.

export const MAX_TEXT_CHARS = 200_000

export const analyzeRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  pages: z.number().int().positive().max(2000),
  text: z.string().trim().min(1).max(MAX_TEXT_CHARS),
})

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>

export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'FORBIDDEN_ORIGIN',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'AI_QUOTA_EXCEEDED',
  'AI_UNAVAILABLE',
  'AI_INVALID_RESPONSE',
  'SERVER_MISCONFIGURED',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
  }),
})

export type ApiError = z.infer<typeof apiErrorSchema>
