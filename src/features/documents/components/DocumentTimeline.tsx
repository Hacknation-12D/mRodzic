import type { ReactElement } from 'react';
import { SectionList, View } from 'react-native';

import { goToDocument } from '@/core/navigation/routes';
import type { ChildView } from '@/core/profile/useChildViews';
import type { DocumentInstance, DocumentStatus } from '@/core/types';
import { AppText } from '@/shared/ui';

import type { TimelineSection } from '../hooks/useDocumentList';
import { DocumentCard } from './DocumentCard';

type Props = {
  sections: TimelineSection[];
  childById: Map<string, ChildView>;
  onChangeStatus: (instance: DocumentInstance, status: DocumentStatus) => void;
  header?: ReactElement;
  empty?: ReactElement;
};

/** Pionowa oś „Najbliższe”: Po terminie · Ten tydzień · Ten miesiąc · Później · Bez terminu. */
export function DocumentTimeline({ sections, childById, onChangeStatus, header, empty }: Props) {
  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.key}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      stickySectionHeadersEnabled={false}
      contentContainerClassName="gap-2 p-4 pb-8"
      renderSectionHeader={({ section }) => (
        <View className="mb-1 mt-3 flex-row items-center gap-2">
          <View className={section.key === 'overdue' ? 'size-3 rounded-full bg-error' : 'size-3 rounded-full bg-primary'} />
          <AppText variant="subheading" accessibilityRole="header">
            {section.title}
          </AppText>
        </View>
      )}
      renderItem={({ item }) => (
        <View className="ml-[5px] border-l-2 border-base-300 pb-2 pl-3">
          <DocumentCard
            instance={item}
            child={item.childId ? childById.get(item.childId) : undefined}
            onOpen={() => goToDocument(item.id, item.childId)}
            onChangeStatus={(status) => onChangeStatus(item, status)}
          />
        </View>
      )}
    />
  );
}

