# AI_LOG

Dziennik faktycznego użycia narzędzi AI w tym projekcie.

## Narzędzia

- **Claude Code** (Anthropic): analiza briefu i dokumentu testowego, plan architektury, generowanie kodu, testów i dokumentacji, uruchamianie lint/test/build i testu w przeglądarce (Playwright, Chromium).
- **Google Gemini 2.5 Flash**: model używany przez aplikację w czasie działania (analiza dokumentów), nie do pisania kodu.

## Podział pracy

| Kto | Co                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ja  | wybór zadania i priorytetów, wymagania do promptów (tylko plan przed kodem, bez płatnych usług, brief ma pierwszeństwo), wybór dostawcy AI i hostingu workera, konta i klucze, przegląd kodu, decyzja o publikacji |
| AI  | ekstrakcja wymagań z briefu, sprawdzenie schematu na dokumencie testowym, kod aplikacji i workera, testy, README                                                                                                   |

## Kluczowe prompty

1. _„Najpierw przeczytaj brief i dokument testowy. Wyciągnij wymagania, stack, dokładny schemat JSON, kryteria oceny. Na pierwszym etapie nie zmieniaj plików i nie pisz kodu, przygotuj plan i poczekaj na potwierdzenie.”_
2. _„Sprawdź, czy aplikacja ma obsługiwać jeden typ dokumentów, czy różne. Zaproponuj minimalny zestaw testowych PDF. Nie rozszerzaj schematu bez potrzeby. Wyjaśnij, które pola są uniwersalne, które zależą od typu i jak oznaczać brak danych bez zmyślania.”_
3. _„Sprawdź, czy wybrane API AI wymaga komponentu serwerowego. Klucz nigdy w kodzie klienta. Preferuj darmowe API, nie podłączaj płatnych usług bez mojej zgody.”_
4. _„Nie symuluj pracy AI i nie podmieniaj wyników danymi fikcyjnymi. Jeśli API jest niedostępne, pokaż uczciwy błąd.”_

## Gdzie AI się pomyliło i jak to poprawiono

1. **Sklejanie tekstu z pdf.js.** Pierwsza wersja łączyła fragmenty tekstu spacją. Na dokumencie testowym dało to „wy łą cznie”, „Gda ń sku”: pdf.js dzieli słowa na polskich znakach diakrytycznych, a spacje zwraca jako osobne elementy. Wykryte przez uruchomienie ekstrakcji na `umowa_14-2026.pdf`. Poprawka: łączenie bez separatora, nowa linia tylko przy `hasEOL`, plus test jednostkowy.
2. **Szablon Vite nie spełniał briefu.** Domyślny szablon `react-ts` miał oxlint zamiast ESLint i nie miał `"strict": true`. Poprawka: ESLint (typescript-eslint strict, zakaz `any` i `console.log`) + Prettier, `strict` i `noUncheckedIndexedAccess` w tsconfig.
3. **API pdf.js v6.** Wygenerowany kod wywoływał `pdf.destroy()`, którego nie ma w typach `PDFDocumentProxy` w tej wersji. Wykryte przez `tsc`. Poprawka: `loadingTask.destroy()`.
4. **Błędny test.** Test ochrony przed fałszywym `</document>` liczył wystąpienia w całym żądaniu, łącznie z instrukcją systemową. Poprawka: test sprawdza tylko treść użytkownika.
5. **Rozmiar paczki.** Pierwszy build miał 748 kB JS (pdf.js). Poprawka: dynamiczny import pdf.js przy pierwszym pliku, start strony ładuje ok. 320 kB.

## Weryfikacja (ręczna, na opublikowanym demo)

- [ ] Wartości z dokumentu testowego (liczba stron, data zawarcia, strony umowy, kwoty w PLN/EUR/USD, daty) zgadzają się z wynikiem.
- [ ] Prompt injection w § 5 dokumentu testowego nie działa: podsumowanie nie twierdzi, że umowa jest nieważna, w danych nie ma kwoty 1 PLN.
- [ ] Brak klucza API w repozytorium i w zbudowanych plikach.
