import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

import { goToDocument } from '@/core/navigation/routes';
import { pl } from '@/shared/i18n/pl';
import { ChildFilterBar, EmptyState } from '@/shared/ui';

import { DocumentCard } from './components/DocumentCard';
import { DocumentTabs } from './components/DocumentTabs';
import { DocumentTimeline } from './components/DocumentTimeline';
import { useDocumentList, type DocumentTab } from './hooks/useDocumentList';

const SafeAreaView = withUniwind(RNSafeAreaView);

export function DocumentsScreen() {
  const [tab, setTab] = useState<DocumentTab>('upcoming');
  const { children, childById, filter, setFilter, byTab, sections, changeStatus } = useDocumentList();

  const counts = { upcoming: byTab.upcoming.length, done: byTab.done.length, hidden: byTab.hidden.length };
  const emptyText = tab === 'upcoming' ? pl.documents.emptyUpcoming : tab === 'done' ? pl.documents.emptyDone : pl.documents.emptyHidden;
  const empty = <EmptyState icon={tab === 'hidden' ? 'eye-off-outline' : 'document-text-outline'} title={emptyText} />;

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-base-200">
      {/* Ta sama szerokość treści co na pozostałych ekranach (Screen → PAGE_WIDTH). */}
      <View className="w-full flex-1 self-center md:max-w-4xl">
        <ChildFilterBar items={children} value={filter} onChange={setFilter} />
        <View className="px-4 pt-2">
          <DocumentTabs value={tab} onChange={setTab} counts={counts} />
        </View>
        {tab === 'upcoming' ? (
          <DocumentTimeline sections={sections} childById={childById} onChangeStatus={changeStatus} empty={empty} />
        ) : (
          <FlatList
            data={byTab[tab]}
            keyExtractor={(item) => item.key}
            contentContainerClassName="gap-3 p-4 pb-8"
            ListEmptyComponent={empty}
            renderItem={({ item }) => (
              <DocumentCard
                instance={item}
                child={item.childId ? childById.get(item.childId) : undefined}
                onOpen={() => goToDocument(item.id, item.childId)}
                onChangeStatus={(status) => changeStatus(item, status)}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

