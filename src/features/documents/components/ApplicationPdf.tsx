import type { ApplicationDraft } from '@/core/applications/model';
import { AppText } from '@/shared/ui';
export type ApplicationPdfProps = { draft: ApplicationDraft; onReady: (revision: string) => void };
export function ApplicationPdf(_props: ApplicationPdfProps) {
  return <AppText>Podgląd i pobieranie PDF są obecnie dostępne w wersji webowej. Szkic zapisano na urządzeniu.</AppText>;
}
