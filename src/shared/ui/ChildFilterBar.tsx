import { ScrollView } from 'react-native';

import { pl } from '../i18n/pl';
import { ChildChip } from './ChildChip';
import { Chip } from './Chip';

export type FilterChild = { id: string; name: string; color: string };

type Props = {
  items: FilterChild[];
  value: string; // 'all' | childId
  onChange: (value: string) => void;
};

/** Pasek „Wszystkie | Zosia | Maluszek”. Ukryty przy jednym dziecku. */
export function ChildFilterBar({ items, value, onChange }: Props) {
  if (items.length <= 1) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Poziomy ScrollView w kolumnie nie może się rozciągać ani zapadać. Inline style zamiast klas:
      // na web style bazowe RN-web (flexGrow/flexShrink) mają pierwszeństwo przed warstwą utilities Tailwinda.
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerClassName="items-center gap-2 px-4 py-2"
      accessibilityLabel={pl.filter.label}
      accessibilityRole="tablist">
      <Chip label={pl.filter.all} selected={value === 'all'} onPress={() => onChange('all')} />
      {items.map((child) => (
        <ChildChip
          key={child.id}
          name={child.name}
          color={child.color}
          selected={value === child.id}
          onPress={() => onChange(child.id)}
        />
      ))}
    </ScrollView>
  );
}

