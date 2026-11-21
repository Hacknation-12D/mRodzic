import { Link } from 'expo-router';

import { pl } from '../i18n/pl';
import { AppText } from './AppText';
import { EmptyState } from './EmptyState';
import { Screen } from './Screen';

export function NotFoundScreen() {
  return (
    <Screen>
      <EmptyState
        icon="help-circle-outline"
        title={pl.common.notFoundTitle}
        body={pl.common.notFoundBody}
        action={
          <Link href="/" accessibilityRole="link">
            <AppText tone="primary" variant="bodyStrong">
              {pl.common.goHome}
            </AppText>
          </Link>
        }
      />
    </Screen>
  );
}
