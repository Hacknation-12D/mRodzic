import { pl } from '@/shared/i18n/pl';
import { SegmentedControl } from '@/shared/ui';

export type AssistantMode = 'ai' | 'human';

export function ModeSwitch({ value, onChange }: { value: AssistantMode; onChange: (m: AssistantMode) => void }) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      segments={[
        { value: 'ai', label: pl.assistant.modeAi },
        { value: 'human', label: pl.assistant.modeHuman },
      ]}
    />
  );
}
