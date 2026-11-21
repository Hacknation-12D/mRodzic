import { View } from 'react-native';

import type { DocumentLink } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { openExternalLink } from '@/shared/lib/links';
import { Button } from '@/shared/ui';

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
          label={l.label}
          variant="ghost"
          icon={l.kind === 'guide' ? 'book-outline' : 'information-circle-outline'}
          onPress={() => void openExternalLink(l.url)}
          accessibilityHint={pl.documents.linkKind[l.kind]}
        />
      ))}
    </View>
  );
}

