import type { ClientErrorCode } from '../api/analyze.ts'
import type { FileValidationError } from './fileValidation.ts'
import type { PdfErrorCode } from './pdfError.ts'

export type AppErrorCode = ClientErrorCode | FileValidationError | PdfErrorCode | 'UNKNOWN'

// All user-facing messages in Polish (brief: "Komunikaty po polsku")
export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  EMPTY: 'Plik jest pusty.',
  NOT_PDF: 'To nie jest plik PDF. Wybierz plik z rozszerzeniem .pdf.',
  TOO_LARGE: 'Plik jest za duży. Maksymalny rozmiar to 10 MB.',
  PASSWORD: 'Plik jest chroniony hasłem. Usuń hasło i spróbuj ponownie.',
  CORRUPTED: 'Nie udało się otworzyć pliku. PDF może być uszkodzony.',
  NO_TEXT:
    'Ten PDF nie zawiera warstwy tekstowej (prawdopodobnie jest skanem). Obsługiwane są tylko pliki z tekstem.',
  TOO_LITTLE_TEXT:
    'Dokument zawiera za mało tekstu, aby rzetelnie go podsumować. Wybierz dłuższy dokument.',
  NO_API_URL: 'Aplikacja nie ma skonfigurowanego adresu API (VITE_API_URL).',
  NETWORK: 'Brak połączenia z serwerem analizy. Sprawdź internet i spróbuj ponownie.',
  TIMEOUT: 'Analiza trwała zbyt długo. Spróbuj ponownie.',
  BAD_REQUEST: 'Serwer odrzucił żądanie. Spróbuj ponownie z innym plikiem.',
  FORBIDDEN_ORIGIN: 'Serwer analizy nie akceptuje żądań z tej strony.',
  PAYLOAD_TOO_LARGE: 'Dokument zawiera zbyt dużo tekstu do analizy.',
  RATE_LIMITED: 'Zbyt wiele analiz w krótkim czasie. Odczekaj kilka minut.',
  AI_QUOTA_EXCEEDED: 'Wyczerpano dzienny limit darmowego API AI. Spróbuj później.',
  AI_UNAVAILABLE: 'Usługa AI jest chwilowo niedostępna. Spróbuj ponownie.',
  AI_INVALID_RESPONSE:
    'AI zwróciło odpowiedź niezgodną ze schematem (również przy ponownej próbie). Spróbuj ponownie.',
  INVALID_RESULT: 'Otrzymany wynik nie przeszedł walidacji schematu.',
  SERVER_MISCONFIGURED:
    'Serwer analizy jest błędnie skonfigurowany (klucz API lub model AI). Ponowienie nie pomoże.',
  UNKNOWN: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
}

// Errors where trying the same file again makes sense
export const RETRYABLE: ReadonlySet<AppErrorCode> = new Set<AppErrorCode>([
  'NETWORK',
  'TIMEOUT',
  'RATE_LIMITED',
  'AI_QUOTA_EXCEEDED',
  'AI_UNAVAILABLE',
  'AI_INVALID_RESPONSE',
  'INVALID_RESULT',
  'UNKNOWN',
])

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  faktura: 'Faktura',
  umowa: 'Umowa',
  oferta: 'Oferta',
  raport: 'Raport',
  inne: 'Inny dokument',
}
