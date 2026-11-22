import { Platform } from 'react-native';

import { downloadPdf } from './pdfDownload';
import { textPdf } from './workflowPdf';

/** Generuje PDF z sekcji tekstu (czcionka z polskimi znakami) i pobiera go. Na urządzeniach mobilnych – komunikat. */
export async function downloadTextPdf(title: string, sections: string[][], fileName: string): Promise<void> {
  if (Platform.OS !== 'web') throw new Error('Pobieranie PDF jest dostępne w wersji webowej.');
  const response = await fetch('/pdfs/fonts/NotoSans-Regular.ttf');
  if (!response.ok) throw new Error('Brakuje czcionki do PDF (/pdfs/fonts/NotoSans-Regular.ttf).');
  const bytes = await textPdf(await response.arrayBuffer(), title, sections);
  downloadPdf(bytes, fileName);
}
