// Kept apart from pdf.ts so the UI can check errors without loading pdf.js
export type PdfErrorCode = 'PASSWORD' | 'CORRUPTED' | 'NO_TEXT'

export class PdfError extends Error {
  readonly code: PdfErrorCode

  constructor(code: PdfErrorCode) {
    super(code)
    this.code = code
  }
}
