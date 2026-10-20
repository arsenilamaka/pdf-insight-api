import { GlobalWorkerOptions, PasswordException, getDocument } from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
// Bundled as a hashed asset, so the path is correct under the GitHub Pages base URL
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PdfError } from './pdfError.ts'
import { hasEnoughText, joinPageText } from './pdfText.ts'

GlobalWorkerOptions.workerSrc = workerUrl

// A page with less text than this is treated as a scan without a text layer
const MIN_PAGE_CHARS = 20

export interface ExtractedPdf {
  pages: number
  text: string
  pagesWithoutText: number[]
}

const isTextItem = (item: unknown): item is TextItem =>
  typeof item === 'object' && item !== null && 'str' in item

export const extractPdfText = async (file: File): Promise<ExtractedPdf> => {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = getDocument({ data })
  let pdf
  try {
    pdf = await loadingTask.promise
  } catch (error) {
    throw new PdfError(error instanceof PasswordException ? 'PASSWORD' : 'CORRUPTED')
  }

  try {
    const pageTexts: string[] = []
    const rawTexts: string[] = []
    const pagesWithoutText: number[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const pageText = joinPageText(content.items.filter(isTextItem))
      if (pageText.length < MIN_PAGE_CHARS) pagesWithoutText.push(pageNumber)
      rawTexts.push(pageText)
      // Page markers help the model and keep the original order explicit
      pageTexts.push(`[Page ${pageNumber}]\n${pageText}`)
      page.cleanup()
    }

    if (pagesWithoutText.length === pdf.numPages) throw new PdfError('NO_TEXT')
    if (!hasEnoughText(rawTexts)) throw new PdfError('TOO_LITTLE_TEXT')

    return { pages: pdf.numPages, text: pageTexts.join('\n\n'), pagesWithoutText }
  } finally {
    await loadingTask.destroy()
  }
}
