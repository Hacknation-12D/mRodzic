import { ScrollView } from 'react-native';

import type { ChildView } from '@/core/profile/useChildViews';
import { pl } from '@/shared/i18n/pl';
import { AppText, Chip, ChildChip } from '@/shared/ui';

type Props = { kids: ChildView[]; value: string | null; onChange: (childId: string | null) => void };

/** „Pytam o: Wszystkie dzieci / Zosia / Maluszek”. */
export function ChildContextPicker({ kids, value, onChange }: Props) {
  if (kids.length <= 1) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerClassName="items-center gap-2 py-1">
      <AppText variant="small" tone="muted">
        {pl.assistant.askingAbout}
      </AppText>
      <Chip label={pl.assistant.allChildren} selected={value === null} onPress={() => onChange(null)} />
      {kids.map((c) => (
        <ChildChip key={c.id} name={c.name} color={c.color} selected={value === c.id} onPress={() => onChange(c.id)} />
      ))}
    </ScrollView>
  );
}

