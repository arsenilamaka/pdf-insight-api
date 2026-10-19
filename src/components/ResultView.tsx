import { useState, type KeyboardEvent } from 'react'
import { downloadAnalysis } from '../lib/download.ts'
import { DOCUMENT_TYPE_LABELS } from '../lib/messages.ts'
import type { Analysis } from '../lib/schema.ts'

const TABS = [
  { id: 'summary', label: 'Podsumowanie' },
  { id: 'data', label: 'Dane' },
  { id: 'json', label: 'JSON' },
] as const

type TabId = (typeof TABS)[number]['id']

const formatAmount = (value: number, currency: string | null): string => {
  const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(value)
  return currency ? `${number} ${currency}` : number
}

const EMPTY = <span className="muted">brak danych</span>

function List({ items }: { items: string[] }) {
  if (items.length === 0) return EMPTY
  return (
    <ul className="tags">
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  )
}

function DataTab({ analysis }: { analysis: Analysis }) {
  const { document: doc, entities, amounts, dates, keywords } = analysis
  return (
    <div className="data">
      <dl className="meta">
        <dt>Plik</dt>
        <dd>{doc.fileName}</dd>
        <dt>Strony</dt>
        <dd>{doc.pages}</dd>
        <dt>Typ</dt>
        <dd>{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}</dd>
        <dt>Język</dt>
        <dd>{doc.language}</dd>
        <dt>Tytuł</dt>
        <dd>{doc.title ?? EMPTY}</dd>
        <dt>Data</dt>
        <dd>{doc.date ?? EMPTY}</dd>
      </dl>

      <h3>Organizacje</h3>
      <List items={entities.organizations} />
      <h3>Osoby</h3>
      <List items={entities.people} />

      <h3>Kwoty</h3>
      {amounts.length === 0 ? (
        EMPTY
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Kwota</th>
                <th scope="col">Kontekst</th>
              </tr>
            </thead>
            <tbody>
              {amounts.map((amount, index) => (
                <tr key={`${amount.value}-${index}`}>
                  <td className="nowrap">{formatAmount(amount.value, amount.currency)}</td>
                  <td>{amount.context}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>Daty</h3>
      {dates.length === 0 ? (
        EMPTY
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Kontekst</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((item, index) => (
                <tr key={`${item.date}-${index}`}>
                  <td className="nowrap">{item.date}</td>
                  <td>{item.context}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>Słowa kluczowe</h3>
      <List items={keywords} />
    </div>
  )
}

interface ResultViewProps {
  analysis: Analysis
  warnings: string[]
}

export function ResultView({ analysis, warnings }: ResultViewProps) {
  const [tab, setTab] = useState<TabId>('summary')

  // Arrow keys move between tabs (WAI-ARIA tabs pattern)
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const index = TABS.findIndex((item) => item.id === tab)
    const step = event.key === 'ArrowRight' ? 1 : -1
    const next = TABS[(index + step + TABS.length) % TABS.length]
    if (next) {
      setTab(next.id)
      document.getElementById(`tab-${next.id}`)?.focus()
    }
  }

  return (
    <section className="result" aria-labelledby="result-title">
      <header className="result__header">
        <div>
          <h2 id="result-title">{analysis.document.title ?? analysis.document.fileName}</h2>
          <p className="muted">
            {DOCUMENT_TYPE_LABELS[analysis.document.type]} · {analysis.document.pages} str. ·{' '}
            {analysis.document.language}
          </p>
        </div>
        <button
          type="button"
          className="button button--primary"
          onClick={() => downloadAnalysis(analysis)}
        >
          Pobierz JSON
        </button>
      </header>

      {warnings.length > 0 && (
        <ul className="warnings" role="note">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <div className="tabs" role="tablist" aria-label="Widok wyniku">
        {TABS.map((item) => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            className="tabs__tab"
            onClick={() => setTab(item.id)}
            onKeyDown={onTabKeyDown}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
        className="panel"
      >
        {tab === 'summary' && (
          <>
            <p className="summary">{analysis.summary}</p>
            <h3>Najważniejsze punkty</h3>
            <ul className="points">
              {analysis.keyPoints.map((point, index) => (
                <li key={`${index}-${point}`}>{point}</li>
              ))}
            </ul>
          </>
        )}
        {tab === 'data' && <DataTab analysis={analysis} />}
        {tab === 'json' && <pre className="json">{JSON.stringify(analysis, null, 2)}</pre>}
      </div>
    </section>
  )
}
