import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MOCK_IDENTITY, mockMObywatelService, SIGN_IN_DELAY_MS } from './mObywatelService';

describe('mockMObywatelService (symulacja)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('zwraca przykładową tożsamość po opóźnieniu', async () => {
    const promise = mockMObywatelService.signIn();
    await vi.advanceTimersByTimeAsync(SIGN_IN_DELAY_MS);
    await expect(promise).resolves.toEqual(MOCK_IDENTITY);
  });

  it('można przerwać logowanie', async () => {
    const ctrl = new AbortController();
    const promise = mockMObywatelService.signIn(ctrl.signal);
    const assertion = expect(promise).rejects.toThrow('aborted');
    ctrl.abort();
    await assertion;
  });
});
