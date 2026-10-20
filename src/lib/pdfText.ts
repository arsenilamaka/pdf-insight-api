// pdf.js splits words at diacritics ("wy", "łą", "cznie") and emits spaces as separate
// items, so items are concatenated as-is; only end-of-line flags become newlines.
export const joinPageText = (items: { str: string; hasEOL: boolean }[]): string =>
  items
    .map((item) => item.str + (item.hasEOL ? '\n' : ''))
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

// Below this the schema (3-5 sentences, 3-7 key points) would force the model to invent content
export const MIN_DOCUMENT_CHARS = 200

export const hasEnoughText = (pageTexts: string[]): boolean =>
  pageTexts.reduce((total, text) => total + text.replace(/\s+/g, '').length, 0) >=
  MIN_DOCUMENT_CHARS
