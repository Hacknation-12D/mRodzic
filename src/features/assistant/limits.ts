/** Limity asystenta AI – zmieniaj tutaj. */

/** Maks. długość wiadomości użytkownika (znaki). */
export const MAX_INPUT_CHARS = 600;
/** Od ilu znaków pokazujemy licznik pozostałych znaków. */
export const INPUT_COUNTER_FROM = 400;
/** Twardy limit tokenów odpowiedzi modelu (zapas ponad zalecaną długość z promptu). */
export const MAX_OUTPUT_TOKENS = 1200;
/** Zalecana długość odpowiedzi podawana modelowi w prompcie: ok. 1000 tokenów ≈ 2000 znaków po polsku. */
export const PROMPT_ANSWER_CHARS = 2000;
/** Maks. długość pojedynczej wiadomości z historii wysyłanej do modelu (musi mieścić pełną odpowiedź AI). */
export const MAX_HISTORY_MESSAGE_CHARS = 3000;
