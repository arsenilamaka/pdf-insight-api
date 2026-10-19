import { useRef, useState } from 'react'
import { AnalyzeApiError, analyzeText, truncateText } from './api/analyze.ts'
import { HistoryList } from './components/HistoryList.tsx'
import { ResultView } from './components/ResultView.tsx'
import { UploadZone } from './components/UploadZone.tsx'
import { validatePdfFile } from './lib/fileValidation.ts'
import { addToHistory, clearHistory, loadHistory, type HistoryEntry } from './lib/history.ts'
import { ERROR_MESSAGES, RETRYABLE, type AppErrorCode } from './lib/messages.ts'
import { PdfError } from './lib/pdfError.ts'
import type { Analysis } from './lib/schema.ts'

type State =
  | { status: 'idle' }
  | { status: 'processing'; step: 'reading' | 'analyzing'; fileName: string }
  | { status: 'error'; code: AppErrorCode; file: File }
  | { status: 'done'; analysis: Analysis; warnings: string[] }

const toErrorCode = (error: unknown): AppErrorCode => {
  if (error instanceof PdfError || error instanceof AnalyzeApiError) return error.code
  return 'UNKNOWN'
}

export default function App() {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  const abortRef = useRef<AbortController | null>(null)

  const processFile = async (file: File) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const invalid = await validatePdfFile(file)
    if (invalid) {
      setState({ status: 'error', code: invalid, file })
      return
    }

    try {
      setState({ status: 'processing', step: 'reading', fileName: file.name })
      // pdf.js is large: load it only when the first file arrives
      const { extractPdfText } = await import('./lib/pdf.ts')
      const extracted = await extractPdfText(file)
      if (controller.signal.aborted) return
      const { text, truncated } = truncateText(extracted.text)

      setState({ status: 'processing', step: 'analyzing', fileName: file.name })
      const analysis = await analyzeText(
        { fileName: file.name, pages: extracted.pages, text },
        controller.signal,
      )
      if (controller.signal.aborted) return

      const warnings: string[] = []
      if (extracted.pagesWithoutText.length > 0) {
        warnings.push(
          `Strony bez warstwy tekstowej (np. skany): ${extracted.pagesWithoutText.join(', ')}. Ich treść nie została uwzględniona w analizie.`,
        )
      }
      if (truncated) {
        warnings.push('Dokument jest bardzo długi: przeanalizowano tylko jego początkową część.')
      }

      setHistory((entries) => addToHistory(entries, analysis))
      setState({ status: 'done', analysis, warnings })
    } catch (error) {
      if (controller.signal.aborted) return
      setState({ status: 'error', code: toErrorCode(error), file })
    }
  }

  const reset = () => {
    abortRef.current?.abort()
    setState({ status: 'idle' })
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>PDF Insight</h1>
        <p className="muted">
          Wgraj PDF, a otrzymasz krótkie podsumowanie i uporządkowane dane w formacie JSON.
        </p>
      </header>

      <main>
        <p className="notice" role="note">
          Uwaga: tekst z wgranego pliku zostanie wysłany do zewnętrznego API AI (Google Gemini) w
          celu analizy. Nie wgrywaj dokumentów zawierających dane, których nie możesz udostępnić.
        </p>

        {state.status !== 'processing' && <UploadZone onFile={(file) => void processFile(file)} />}

        <div aria-live="polite" className="status-region">
          {state.status === 'idle' && history.length === 0 && (
            <p className="empty">Nie przeanalizowano jeszcze żadnego dokumentu.</p>
          )}

          {state.status === 'processing' && (
            <div className="processing" role="status">
              <span className="spinner" aria-hidden="true" />
              <div>
                <p>
                  <strong>{state.fileName}</strong>
                </p>
                <p className="muted">
                  {state.step === 'reading'
                    ? 'Odczytywanie tekstu z PDF…'
                    : 'Analiza AI (zwykle 5–20 sekund)…'}
                </p>
              </div>
              <button type="button" className="button" onClick={reset}>
                Anuluj
              </button>
            </div>
          )}

          {state.status === 'error' && (
            <div className="error" role="alert">
              <p>{ERROR_MESSAGES[state.code]}</p>
              <div className="error__actions">
                {RETRYABLE.has(state.code) && (
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => void processFile(state.file)}
                  >
                    Spróbuj ponownie
                  </button>
                )}
                <button type="button" className="button" onClick={reset}>
                  Zamknij
                </button>
              </div>
            </div>
          )}
        </div>

        {state.status === 'done' && (
          <ResultView analysis={state.analysis} warnings={state.warnings} />
        )}

        <HistoryList
          entries={history}
          onOpen={(entry) => setState({ status: 'done', analysis: entry.analysis, warnings: [] })}
          onClear={() => setHistory(clearHistory())}
        />
      </main>

      <footer className="app__footer muted small">
        PDF Insight · zadanie rekrutacyjne Vibe Coder
      </footer>
    </div>
  )
}
