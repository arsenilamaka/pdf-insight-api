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
