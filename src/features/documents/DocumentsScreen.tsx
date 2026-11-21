import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

import { goToDocument } from '@/core/navigation/routes';
import { pl } from '@/shared/i18n/pl';
import { AppText, Button, ChildFilterBar, EmptyState } from '@/shared/ui';

import { DocumentCard } from './components/DocumentCard';
import { DocumentTabs } from './components/DocumentTabs';
import { DocumentTimeline } from './components/DocumentTimeline';
import { useDocumentList, type DocumentTab } from './hooks/useDocumentList';

const SafeAreaView = withUniwind(RNSafeAreaView);

export function DocumentsScreen() {
  const [tab, setTab] = useState<DocumentTab>('eligible');
  const [showHidden, setShowHidden] = useState(false);
  const { children, childById, filter, setFilter, byTab, hidden, sections, changeStatus } = useDocumentList();

  const counts = { eligible: byTab.eligible.length, ineligible: byTab.ineligible.length };
  const emptyText = showHidden ? pl.documents.emptyHidden : tab === 'eligible' ? pl.documents.emptyEligible : pl.documents.emptyIneligible;
  const empty = <EmptyState icon="document-text-outline" title={emptyText} />;

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-base-200">
      <ChildFilterBar items={children} value={filter} onChange={setFilter} />
      <View className="gap-2 px-4 pt-2">
        {showHidden ? null : <DocumentTabs value={tab} onChange={setTab} counts={counts} />}
        {showHidden ? null : <AppText variant="small" tone="muted">{pl.documents.eligibilityHint}</AppText>}
        {showHidden || hidden.length > 0 ? (
          <Button compact variant="ghost" label={showHidden ? pl.documents.backToList : pl.documents.tabHidden} onPress={() => setShowHidden(!showHidden)} />
        ) : null}
      </View>
      {!showHidden && tab === 'eligible' ? (
        <DocumentTimeline sections={sections} childById={childById} onChangeStatus={changeStatus} empty={empty} />
      ) : (
        <FlatList
          data={showHidden ? hidden : byTab.ineligible}
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
    </SafeAreaView>
  );
}

