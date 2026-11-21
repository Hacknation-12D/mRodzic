/** Klucz instancji dokumentu: `${docId}:${childId}` albo `${docId}:household`. */
export function instanceKey(docId: string, childId?: string): string {
  return `${docId}:${childId ?? 'household'}`;
}
