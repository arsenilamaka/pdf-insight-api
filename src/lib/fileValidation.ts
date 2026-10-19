export const MAX_FILE_BYTES = 10 * 1024 * 1024

export type FileValidationError = 'EMPTY' | 'NOT_PDF' | 'TOO_LARGE'

const PDF_MAGIC = '%PDF-'

// Checks extension/MIME first (cheap), then the file signature to catch renamed files.
export const validatePdfFile = async (file: File): Promise<FileValidationError | null> => {
  if (file.size === 0) return 'EMPTY'
  const looksLikePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!looksLikePdf) return 'NOT_PDF'
  if (file.size > MAX_FILE_BYTES) return 'TOO_LARGE'
  const header = await file.slice(0, 1024).text()
  return header.includes(PDF_MAGIC) ? null : 'NOT_PDF'
}
