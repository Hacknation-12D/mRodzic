import type { ApplicationDraft, CaseDocument } from '@/core/applications/model';
import { AppText, Card } from '@/shared/ui';
export type CaseWorkbenchProps = { draft: ApplicationDraft; onCase: (document: CaseDocument) => void };
export function CaseWorkbench(_props: CaseWorkbenchProps) {
  return <Card><AppText>Odczyt wielostronicowych PDF i OCR jest dostępny w wersji przeglądarkowej. Na tym urządzeniu możesz uzupełnić fakty ręcznie w następnym kroku.</AppText></Card>;
}
