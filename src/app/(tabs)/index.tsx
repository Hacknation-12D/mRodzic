import { EmptyState, Screen } from '@/shared/ui';

export default function HomePlaceholder() {
  return (
    <Screen scroll={false} contentClassName="justify-center">
      <EmptyState title="Strona główna" body="Treści pojawią się tutaj." icon="home-outline" />
    </Screen>
  );
}
