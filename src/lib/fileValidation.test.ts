import { describe, expect, it } from 'vitest'
import { MAX_FILE_BYTES, validatePdfFile } from './fileValidation.ts'

const pdfFile = (content: BlobPart, name = 'doc.pdf', type = 'application/pdf') =>
  new File([content], name, { type })

describe('validatePdfFile', () => {
  it('accepts a PDF', async () => {
    expect(await validatePdfFile(pdfFile('%PDF-1.4 ...'))).toBeNull()
  })

  it('rejects an empty file', async () => {
    expect(await validatePdfFile(pdfFile(''))).toBe('EMPTY')
  })

  it('rejects other file types', async () => {
    expect(await validatePdfFile(pdfFile('hello', 'notes.txt', 'text/plain'))).toBe('NOT_PDF')
  })

  it('rejects a renamed non-PDF file', async () => {
    expect(await validatePdfFile(pdfFile('just text', 'fake.pdf'))).toBe('NOT_PDF')
  })

  it('rejects files over 10 MB', async () => {
    const big = new Uint8Array(MAX_FILE_BYTES + 1)
    expect(await validatePdfFile(pdfFile(big))).toBe('TOO_LARGE')
  })
})
