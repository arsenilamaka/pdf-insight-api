import type { HistoryEntry } from '../lib/history.ts'

interface HistoryListProps {
  entries: HistoryEntry[]
  onOpen: (entry: HistoryEntry) => void
  onClear: () => void
}

const formatTime = (iso: string): string =>
  new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))

export function HistoryList({ entries, onOpen, onClear }: HistoryListProps) {
  if (entries.length === 0) return null
  return (
    <section className="history" aria-labelledby="history-title">
      <div className="history__header">
        <h2 id="history-title">Ostatnie analizy</h2>
        <button type="button" className="button button--link" onClick={onClear}>
          Wyczyść historię
        </button>
      </div>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <button type="button" className="history__item" onClick={() => onOpen(entry)}>
              <span>{entry.analysis.document.title ?? entry.analysis.document.fileName}</span>
              <span className="muted">{formatTime(entry.analyzedAt)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="muted small">Historia jest zapisana tylko w tej przeglądarce.</p>
    </section>
  )
}
