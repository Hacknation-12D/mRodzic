import { Platform, View } from 'react-native';

import type { DocumentLink } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { openExternalLink } from '@/shared/lib/links';
import { Button } from '@/shared/ui';

function openDocumentLink(link: DocumentLink) {
  if (Platform.OS === 'web' && link.pdfFile) {
    return openExternalLink(new URL(`/pdfs/${link.pdfFile}`, window.location.origin).href);
  }
  return openExternalLink(link.url);
}

/** Linki „apply” jako główne przyciski, „info”/„guide” jako drugorzędne. */
export function LinksList({ links }: { links: DocumentLink[] }) {
  const apply = links.filter((l) => l.kind === 'apply');
  const other = links.filter((l) => l.kind !== 'apply');
  return (
    <View className="gap-2">
      {apply.map((l) => (
        <Button
          key={l.url + l.label}
          label={l.label}
          icon="open-outline"
          onPress={() => void openExternalLink(l.url)}
          accessibilityHint={pl.documents.linkKind.apply}
        />
      ))}
      {other.map((l) => (
        <Button
          key={l.url + l.label}
          label={l.pdfFile === 'ZAM.pdf' ? 'Otwórz pusty wzór ZAM (PDF)' : l.label}
          variant="ghost"
          icon={l.pdfFile ? 'document-outline' : l.kind === 'guide' ? 'book-outline' : 'information-circle-outline'}
          onPress={() => void openDocumentLink(l)}
          accessibilityHint={l.pdfFile ? 'Otwiera plik PDF ZUS' : pl.documents.linkKind[l.kind]}
        />
      ))}
    </View>
  );
}

