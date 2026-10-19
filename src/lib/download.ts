import type { Analysis } from './schema.ts'

export const jsonFileName = (pdfName: string): string =>
  `${pdfName.replace(/\.pdf$/i, '') || 'dokument'}.insight.json`

export const downloadAnalysis = (analysis: Analysis): void => {
  const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = jsonFileName(analysis.document.fileName)
  link.click()
  URL.revokeObjectURL(url)
}
