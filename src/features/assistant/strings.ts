/** Teksty widoku asystenta (lokalnie w folderze funkcji). */
export const t = {
  greeting:
    'Cześć! 👋 \nJestem asystentem AI i chętnie pomogę Ci w sprawach urzędowych oraz dokumentach dla Twojego dziecka.\nOd becikowego i 800+, przez urlopy i zasiłki, po rejestracje i szczepienia.\n\n**Zadaj dowolne pytanie** , a podpowiem, o co rodzice pytają najczęściej.\nJeśli wolisz porozmawiać z naszym ludzkim zespołem, kliknij przycisk poniżej.',
  /** Komunikaty w trakcie oczekiwania na AI – zmieniają się co `intervalMs`, po ostatnim wracają od pierwszego. */
  thinking: {
    intervalMs: 8000,
    steps: ['Asystent myśli…', 'Jeszcze sekunda…', 'Asystent pisze…', 'Już kończymy…'],
  },
  suggestionsTitle: 'Proponowane pytania',
  askHuman: 'Porozmawiaj z człowiekiem',
  backToAi: 'Wróć do asystenta AI',
  humanPlaceholder: 'Napisz do naszego zespołu…',
  handoff: {
    title: 'Porozmawiaj z człowiekiem',
    intro: 'Przekażemy tę rozmowę naszemu zespołowi. Konsultant odpowie zwykle w ciągu kilkunastu minut.',
    emailLabel: 'Twój adres e-mail',
    emailError: 'Podaj poprawny adres e-mail.',
    emailInfo: 'Jeśli wyjdziesz z aplikacji, odpowiedź wyślemy na ten adres e-mail.',
    consent: 'Kontynuując, zgadzasz się na kontakt z naszym zespołem przez e-mail.',
    confirm: 'Przekaż rozmowę',
    cancel: 'Anuluj',
    sendError: 'Nie udało się przekazać rozmowy. Spróbuj ponownie.',
  },
  humanRequestedTitle: 'Przekazaliśmy Twoją rozmowę naszemu zespołowi',
  humanRequestedBody: (email: string) =>
    `Prosimy o cierpliwość – niedługo odpowie człowiek. Jeśli wyjdziesz z aplikacji, odpowiedź wyślemy na ${email}.`,
  waitingBar: (email: string) => `Wkrótce nasz zespół dołączy do tej rozmowy. Odpowiedź dostaniesz też na ${email}.`,
} as const;
