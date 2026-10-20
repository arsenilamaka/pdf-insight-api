import { describe, expect, it } from 'vitest'
import { MIN_DOCUMENT_CHARS, hasEnoughText, joinPageText } from './pdfText.ts'

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

describe('hasEnoughText', () => {
  it('rejects a document with only a line of text', () => {
    expect(hasEnoughText(['Notatka z dnia', 'ok. 25 znaków tekstu tu.'])).toBe(false)
  })

  it('counts text across pages, ignoring whitespace', () => {
    const half = 'a'.repeat(MIN_DOCUMENT_CHARS / 2)
    expect(hasEnoughText([half, `  ${half}  `])).toBe(true)
    expect(hasEnoughText([' '.repeat(MIN_DOCUMENT_CHARS * 2)])).toBe(false)
  })
})
