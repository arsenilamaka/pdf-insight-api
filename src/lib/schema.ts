import { z } from 'zod'

// Schema from the brief, section 04. Shared by the frontend and the worker.

export const DOCUMENT_TYPES = ['faktura', 'umowa', 'oferta', 'raport', 'inne'] as const

const isValidCalendarDate = (value: string): boolean => {
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
}

// ISO 8601 calendar date (YYYY-MM-DD) that actually exists, e.g. no 2026-02-30
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi mieć format RRRR-MM-DD')
  .refine(isValidCalendarDate, 'Nieistniejąca data')

const nonEmptyText = z.string().trim().min(1)

export const analysisSchema = z.object({
  document: z.object({
    fileName: nonEmptyText,
    pages: z.number().int().positive(),
    language: z.string().regex(/^[a-z]{2}$/, 'Kod języka ISO 639-1'),
    type: z.enum(DOCUMENT_TYPES),
    title: nonEmptyText.nullable(),
    date: isoDateSchema.nullable(),
  }),
  summary: nonEmptyText,
  keyPoints: z.array(nonEmptyText).min(3).max(7),
  entities: z.object({
    organizations: z.array(nonEmptyText),
    people: z.array(nonEmptyText),
  }),
  amounts: z.array(
    z.object({
      value: z.number().finite(),
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/, 'Kod waluty ISO 4217')
        .nullable(),
      context: nonEmptyText,
    }),
  ),
  dates: z.array(
    z.object({
      date: isoDateSchema,
      context: nonEmptyText,
    }),
  ),
  keywords: z.array(nonEmptyText),
})

export type Analysis = z.infer<typeof analysisSchema>

// What the model produces; fileName and pages are set by code, not guessed by the model.
export const aiResultSchema = analysisSchema.extend({
  document: analysisSchema.shape.document.omit({ fileName: true, pages: true }),
})

export type AiResult = z.infer<typeof aiResultSchema>

export const buildAnalysis = (
  ai: AiResult,
  meta: { fileName: string; pages: number },
): Analysis => ({
  ...ai,
  document: { fileName: meta.fileName, pages: meta.pages, ...ai.document },
})
