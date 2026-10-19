import { z } from 'zod'
import { analysisSchema, type Analysis } from './schema.ts'

const STORAGE_KEY = 'pdf-insight:history'
const MAX_ENTRIES = 5

const historyEntrySchema = z.object({
  id: z.string(),
  analyzedAt: z.string(),
  analysis: analysisSchema,
})

export type HistoryEntry = z.infer<typeof historyEntrySchema>

// Storage may be unavailable (private mode) or hold stale data: never let it break the app.
export const loadHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = z.array(historyEntrySchema).safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

const save = (entries: HistoryEntry[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // quota exceeded or storage disabled: history is optional
  }
}

export const addToHistory = (entries: HistoryEntry[], analysis: Analysis): HistoryEntry[] => {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    analyzedAt: new Date().toISOString(),
    analysis,
  }
  const next = [entry, ...entries].slice(0, MAX_ENTRIES)
  save(next)
  return next
}

export const clearHistory = (): HistoryEntry[] => {
  save([])
  return []
}
