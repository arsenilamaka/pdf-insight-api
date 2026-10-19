import { describe, expect, it } from 'vitest'
import { joinPageText } from './pdfText.ts'

describe('joinPageText', () => {
  it('keeps words split at Polish diacritics together', () => {
    const items = [
      { str: 'wy', hasEOL: false },
      { str: 'łą', hasEOL: false },
      { str: 'cznie', hasEOL: false },
      { str: ' ', hasEOL: false },
      { str: 'do', hasEOL: true },
      { str: 'Stron', hasEOL: false },
    ]
    expect(joinPageText(items)).toBe('wyłącznie do\nStron')
  })
})
