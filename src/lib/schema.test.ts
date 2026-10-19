import { describe, expect, it } from 'vitest'
import { aiResultSchema, analysisSchema, buildAnalysis, type Analysis } from './schema.ts'

// Example from the brief, section 04
const briefExample: Analysis = {
  document: {
    fileName: 'umowa.pdf',
    pages: 4,
    language: 'pl',
    type: 'umowa',
    title: 'Umowa serwisowa',
    date: '2026-09-01',
  },
  summary: 'Umowa określa zasady świadczenia usług serwisowych.',
  keyPoints: ['Okres umowy 12 mies.', 'Wynagrodzenie 12 500 PLN', 'SLA 99,5%'],
  entities: { organizations: ['Przykład sp. z o.o.'], people: [] },
  amounts: [{ value: 12500.0, currency: 'PLN', context: 'wynagrodzenie' }],
  dates: [{ date: '2026-10-01', context: 'termin płatności' }],
  keywords: ['serwis', 'SLA'],
}

const withDocument = (patch: Partial<Analysis['document']>) => ({
  ...briefExample,
  document: { ...briefExample.document, ...patch },
})

describe('analysisSchema', () => {
  it('accepts the example from the brief', () => {
    expect(analysisSchema.safeParse(briefExample).success).toBe(true)
  })

  it('accepts null and empty lists for missing data', () => {
    const result = analysisSchema.safeParse({
      ...withDocument({ title: null, date: null, type: 'inne' }),
      entities: { organizations: [], people: [] },
      amounts: [],
      dates: [],
      keywords: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a missing required field', () => {
    const { summary: _omit, ...rest } = briefExample
    expect(analysisSchema.safeParse(rest).success).toBe(false)
  })

  it.each([['01.10.2026'], ['2026-02-30'], ['2026-10']])(
    'rejects a non ISO 8601 or impossible date %s',
    (date) => {
      expect(analysisSchema.safeParse(withDocument({ date })).success).toBe(false)
    },
  )

  it('rejects an unknown document type', () => {
    expect(analysisSchema.safeParse(withDocument({ type: 'list' as 'inne' })).success).toBe(false)
  })

  it('rejects a language that is not ISO 639-1', () => {
    expect(analysisSchema.safeParse(withDocument({ language: 'polish' })).success).toBe(false)
  })

  it('rejects a currency that is not ISO 4217', () => {
    const result = analysisSchema.safeParse({
      ...briefExample,
      amounts: [{ value: 10, currency: 'zł', context: 'kwota' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects amounts given as strings', () => {
    const result = analysisSchema.safeParse({
      ...briefExample,
      amounts: [{ value: '12 500,00', currency: 'PLN', context: 'kwota' }],
    })
    expect(result.success).toBe(false)
  })

  it.each([2, 8])('rejects %i key points (must be 3-7)', (count) => {
    const keyPoints = Array.from({ length: count }, (_, index) => `Punkt ${index + 1}`)
    expect(analysisSchema.safeParse({ ...briefExample, keyPoints }).success).toBe(false)
  })
})

describe('buildAnalysis', () => {
  it('takes fileName and pages from code, not from the model', () => {
    const { fileName: _f, pages: _p, ...aiDocument } = briefExample.document
    const ai = aiResultSchema.parse({ ...briefExample, document: aiDocument })
    const analysis = buildAnalysis(ai, { fileName: 'test.pdf', pages: 12 })
    expect(analysis.document.fileName).toBe('test.pdf')
    expect(analysis.document.pages).toBe(12)
    expect(Object.keys(analysis.document)).toEqual([
      'fileName',
      'pages',
      'language',
      'type',
      'title',
      'date',
    ])
    expect(analysisSchema.safeParse(analysis).success).toBe(true)
  })
})
