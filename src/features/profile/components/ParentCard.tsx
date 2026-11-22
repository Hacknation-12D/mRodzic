import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { maskPesel } from '@/core/profile/childDetails';
import type { Parent } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { isoToPolishDate } from '@/shared/lib/date';
import { AppText, Card } from '@/shared/ui';

type Props = {
  title: string;
  parent: Parent | undefined;
  emptyLabel?: string;
};

const t = pl.profile;

/** Adres w jednej linii: „Słoneczna 14/7, 02-495 Warszawa”. */
export function formatAddress(p: Pick<Parent, 'street' | 'houseNumber' | 'apartmentNumber' | 'postalCode' | 'city'>): string | undefined {
  if (!p.street && !p.city) return undefined;
  const line1 = [p.street, [p.houseNumber, p.apartmentNumber].filter(Boolean).join('/')].filter(Boolean).join(' ');
  const line2 = [p.postalCode, p.city].filter(Boolean).join(' ');
  return [line1, line2].filter(Boolean).join(', ');
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3 border-b border-base-300 py-2">
      <AppText variant="small" tone="muted">
        {label}
      </AppText>
      <View className="shrink items-end">{children}</View>
    </View>
  );
}

/**
 * Dane rodzica – tylko do odczytu. Pochodzą z mObywatela / bazy (SQLite), więc nie edytuje się ich w aplikacji.
 */
export function ParentCard({ title, parent, emptyLabel }: Props) {
  const [showPesel, setShowPesel] = useState(false);
  const address = parent ? formatAddress(parent) : undefined;
  return (
    <Card className="gap-1 p-5">
      <AppText variant="subheading" accessibilityRole="header" className="mb-1">
        {title}
      </AppText>
      {parent ? (
        <>
          <Row label={t.nameLabel}>
            <AppText variant="bodyStrong" className="text-right">
              {[parent.firstName, parent.lastName].filter(Boolean).join(' ')}
            </AppText>
          </Row>
          {parent.birthDate ? (
            <Row label={t.birthDateLabel}>
              <AppText variant="bodyStrong">{isoToPolishDate(parent.birthDate)}</AppText>
            </Row>
          ) : null}
          {parent.pesel ? (
            <Row label={t.peselLabel}>
              <View className="flex-row items-center gap-2">
                <AppText variant="bodyStrong">{showPesel ? parent.pesel : maskPesel(parent.pesel)}</AppText>
                <Pressable
                  onPress={() => setShowPesel((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showPesel ? t.parentPeselHideA11y : t.parentPeselShowA11y}
                  hitSlop={8}
                  className="min-h-8 justify-center active:opacity-70">
                  <AppText variant="small" tone="primary">
                    {showPesel ? t.peselHide : t.peselShow}
                  </AppText>
                </Pressable>
              </View>
            </Row>
          ) : null}
          {address ? (
            <Row label={t.addressLabel}>
              <AppText variant="bodyStrong" className="text-right">
                {address}
              </AppText>
            </Row>
          ) : null}
          <Row label={t.genderLabel}>
            <AppText variant="bodyStrong">{pl.gender[parent.gender]}</AppText>
          </Row>
          {parent.employment ? (
            <Row label={pl.parentForm.employment}>
              <AppText variant="bodyStrong" className="text-right">
                {pl.employment[parent.employment]}
              </AppText>
            </Row>
          ) : null}
          <AppText variant="caption" tone="muted" className="pt-2">
            {t.readOnlyNote}
          </AppText>
        </>
      ) : (
        <AppText tone="muted">{emptyLabel}</AppText>
      )}
    </Card>
  );
}
