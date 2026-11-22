import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { getSeedBundle } from '@/core/content/seedRepository';
import { goToAssistant } from '@/core/navigation/routes';
import { getChildColor } from '@/core/profile/childColors';
import { pl } from '@/shared/i18n/pl';
import { useIsDark } from '@/shared/theme';
import { AppText, Card, ChildChip, EmptyState, Markdown, Screen } from '@/shared/ui';

import { DeadlineBadge } from './components/DeadlineBadge';
import { DocumentActions } from './components/DocumentActions';
import { EligibilityBadge } from './components/EligibilityBadge';
import { LinksList } from './components/LinksList';
import { RequirementList } from './components/RequirementList';
import { ZamApplication } from './components/ZamApplication';
import { ZcnaApplication } from './components/ZcnaApplication';
import { useDocumentDetail } from './hooks/useDocumentDetail';

/** /document/[docId]?childId= */
export function DocumentDetailScreen() {
  const { docId, childId } = useLocalSearchParams<{ docId: string; childId?: string }>();
  const isDark = useIsDark();
  const { instance, child, profile, profileChild, changeStatus } = useDocumentDetail(docId, childId);

  if (!instance) {
    return (
      <Screen>
        <EmptyState icon="document-outline" title={pl.documents.notFound} />
      </Screen>
    );
  }

  const who = child?.name ?? pl.common.wholeFamily;
  const color = child?.color ?? getChildColor('family', isDark);
  const bundledPdfs = getSeedBundle().documents.find((document) => document.id === instance.id)?.links
    .filter((link) => link.pdfFile) ?? [];
  const links = [
    ...instance.links.filter((link) => !bundledPdfs.some((pdf) => pdf.pdfFile === link.pdfFile || pdf.url === link.url)),
    ...bundledPdfs,
  ];

  return (
    <Screen keyboard>
      <Stack.Screen options={{ title: instance.title }} />

      <View className="gap-2">
        <AppText variant="caption" tone="muted">
          {pl.documents.category[instance.category].toUpperCase()}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {instance.title}
        </AppText>
        <View className="flex-row flex-wrap items-center gap-2">
          <ChildChip compact name={who} color={color} />
          <DeadlineBadge daysLeft={instance.daysLeft} deadlineDate={instance.deadlineDate} urgency={instance.urgency} />
          <EligibilityBadge result={instance.eligibility} />
        </View>
        {instance.timing.deadlineNote ? (
          <AppText variant="small" tone="muted">
            {instance.timing.deadlineNote}
          </AppText>
        ) : null}
      </View>

      <Card>
        <AppText>{instance.summary}</AppText>
        {instance.amountLabel ? <AppText variant="heading">{instance.amountLabel}</AppText> : null}
      </Card>

      <DocumentActions status={instance.status} onChangeStatus={changeStatus} onAskAssistant={() => goToAssistant({ docId: instance.id, childId: instance.childId })} />

      {profile ? <ZamApplication key={instance.key} docId={instance.id} profile={profile} child={profileChild} /> : null}
      {profile ? <ZcnaApplication key={`zcna:${instance.key}`} docId={instance.id} profile={profile} child={profileChild} /> : null}

      <Card>
        <AppText variant="subheading" accessibilityRole="header">
          {pl.documents.requirements}
        </AppText>
        <AppText variant="small" tone="muted">{pl.documents.eligibilityHint}</AppText>
        <RequirementList results={instance.requirementResults} />
      </Card>

      {instance.checklist && instance.checklist.length > 0 ? (
        <Card>
          <AppText variant="subheading" accessibilityRole="header">
            {pl.documents.checklist}
          </AppText>
          {instance.checklist.map((item) => (
            <AppText key={item}>• {item}</AppText>
          ))}
        </Card>
      ) : null}

      <Markdown>{instance.bodyMd}</Markdown>

      {links.length > 0 ? (
        <View className="gap-2">
          <AppText variant="subheading" accessibilityRole="header">
            {pl.documents.links}
          </AppText>
          <LinksList links={links} />
        </View>
      ) : null}

      <View className="mt-3 gap-2">
        <AppText variant="small" tone="muted">
          {pl.documents.source(instance.source.name, instance.source.asOf)}
        </AppText>
      </View>
    </Screen>
  );
}

