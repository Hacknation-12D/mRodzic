import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { listDemoProfiles, loginDemoProfile } from '@/core/demo/demoApi';
import { useProfileStore } from '@/core/profile/profile.store';
import { pl } from '@/shared/i18n/pl';
import { Alert, AppText, Button, Card, Screen, Select } from '@/shared/ui';

type Catalog = Awaited<ReturnType<typeof listDemoProfiles>>;
type LoginResult = Awaited<ReturnType<typeof loginDemoProfile>>;
type LoginState =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'confirm'; result: LoginResult };

const t = pl.demo;
const randomOption = 'random';

export function SQLiteDemoLogin() {
  const hasProfile = useProfileStore((state) => state.profile !== null);
  const [profiles, setProfiles] = useState<Catalog | null>(null);
  const [listFailed, setListFailed] = useState(false);
  const [selected, setSelected] = useState(randomOption);
  const [login, setLogin] = useState<LoginState>({ status: 'idle' });
  const pendingList = useRef<AbortController | null>(null);
  const pendingLogin = useRef<AbortController | null>(null);

  const loadProfiles = useCallback(async () => {
    pendingList.current?.abort();
    const controller = new AbortController();
    pendingList.current = controller;
    setProfiles(null);
    setListFailed(false);
    try {
      const list = await listDemoProfiles(controller.signal);
      if (!controller.signal.aborted) setProfiles(list);
    } catch {
      if (!controller.signal.aborted) setListFailed(true);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadProfiles();
    setSelected(randomOption);
    setLogin({ status: 'idle' });
    return () => {
      pendingList.current?.abort();
      pendingLogin.current?.abort();
    };
  }, [loadProfiles]));

  const signIn = async () => {
    pendingLogin.current?.abort();
    const controller = new AbortController();
    pendingLogin.current = controller;
    setLogin({ status: 'loading' });
    try {
      const result = await loginDemoProfile(selected === randomOption ? undefined : selected, controller.signal);
      if (!controller.signal.aborted) setLogin({ status: 'confirm', result });
    } catch {
      if (!controller.signal.aborted) setLogin({ status: 'error' });
    }
  };

  const cancel = () => {
    pendingLogin.current?.abort();
    setLogin({ status: 'idle' });
  };

  if (login.status === 'confirm') {
    const { profileId, appProfileV1, mobywatel } = login.result;
    return (
      <Screen contentClassName="pb-24">
        <Card className="w-full gap-4 self-center p-5 md:max-w-4xl md:p-6">
          <AppText variant="title" accessibilityRole="header">{t.confirmTitle}</AppText>
          <AppText variant="subheading">{mobywatel.firstName}</AppText>
          <AppText>{pl.onboarding.login.city}: {mobywatel.city}</AppText>
          {hasProfile ? <Alert tone="info">{t.replaceProfile}</Alert> : null}
          <Button label={t.openProfile} icon="checkmark" onPress={() => {
            useProfileStore.getState().setDemoProfile(profileId, appProfileV1);
            router.replace('/');
          }} />
          <Button label={pl.common.back} variant="ghost" onPress={cancel} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="pb-24">
      <Card className="w-full gap-4 self-center p-5 md:max-w-4xl md:p-6">
        <AppText variant="title" accessibilityRole="header">{t.loginTitle}</AppText>
        {listFailed || profiles?.length === 0 ? (
          <>
            <Alert tone="error">{t.listError}</Alert>
            <Button label={pl.common.retry} onPress={loadProfiles} />
          </>
        ) : profiles === null ? (
          <AppText accessibilityLiveRegion="polite">{pl.common.loading}</AppText>
        ) : (
          <>
            {login.status !== 'loading' && (
              <Select
                label={t.profile}
                value={selected}
                options={[
                  { value: randomOption, label: t.random },
                  ...profiles.map((item) => ({
                    value: item.profileId,
                    label: item.sensitive ? t.sensitiveLabel(item.label) : item.label,
                  })),
                ]}
                onChange={(value) => {
                  setSelected(value ?? randomOption);
                  setLogin({ status: 'idle' });
                }}
              />
            )}
            {login.status === 'error' && <Alert tone="error">{t.loginError}</Alert>}
            <Button label={t.signIn} icon="log-in-outline" onPress={signIn} loading={login.status === 'loading'} />
            {login.status === 'loading' && <Button label={pl.common.cancel} variant="ghost" onPress={cancel} />}
          </>
        )}
      </Card>
    </Screen>
  );
}
