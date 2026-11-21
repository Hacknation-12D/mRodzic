import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MOCK_IDENTITY, mockChildren, mockMObywatelService, mockNip, mockPue, SIGN_IN_DELAY_MS } from './mObywatelService';

describe('mockMObywatelService (symulacja)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('zwraca przykładową tożsamość po opóźnieniu', async () => {
    const promise = mockMObywatelService.signIn();
    await vi.advanceTimersByTimeAsync(SIGN_IN_DELAY_MS);
    const result = await promise;
    expect(result.identity).toEqual(MOCK_IDENTITY);
    expect(result.children.map((c) => c.firstName)).toEqual(['Kasia', 'Kamil']);
  });

  it('dzieci mają 2 i 44 dni', () => {
    const now = new Date(2026, 10, 21);
    expect(mockChildren(now).map((c) => c.birthDate)).toEqual(['2026-11-19', '2026-10-08']);
  });

  it('PUE: etat u małego pracodawcy, ZUS wypłaca zasiłek, urlopy w całości', () => {
    const now = new Date(2026, 10, 21);
    const { work } = mockPue(mockChildren(now), now);
    expect(work.benefitPayer).toBe('zus');
    expect(work.employerInsuredCount).toBeLessThanOrEqual(20);
    expect(work.monthlyGross).toBe(6800);
    expect(work.vacation).toEqual({ entitlementDays: 26, usedDays: 0 });
    expect(work.parentalLeave).toEqual({ weeksTotal: 41, weeksUsed: 0 });
    expect(work.zus?.payer.name).toBe('Pracownia Graficzna Nowak Sp. z o.o.');
    expect(work.zus?.payer.nip).toMatch(/^\d{10}$/);
    expect(work.zus?.payer.paysBenefits).toBe(false);
  });

  it('PUE: konto ZUS – chorobowe obowiązkowe, przerwy, brak zaległości, historia', () => {
    const now = new Date(2026, 10, 21);
    const zus = mockPue(mockChildren(now), now).work.zus!;
    expect(zus.sickness).toMatchObject({ insured: true, kind: 'mandatory', since: '2014-10-01' });
    expect(zus.sickness.until).toBeUndefined();
    expect(zus.gaps).toHaveLength(2);
    // okresy zatrudnienia nie nachodzą na przerwy; ostatni trwa
    expect(zus.periods.at(-1)?.to).toBeUndefined();
    expect(zus.arrears).toEqual({ amount: 0, checkedAt: '2026-11-21' });
    expect(zus.benefitHistory.map((b) => b.kind)).toEqual(['sickness', 'care']);
    expect(zus.leaveHistory.reduce((a, l) => a + l.days, 0)).toBe(24);
    expect(zus.leaveHistory.every((l) => !l.from.startsWith('2026'))).toBe(true);  });

  it('PUE: macierzyński 20 tyg. od urodzenia starszego dziecka, zarobki z 12 miesięcy przed', () => {
    const now = new Date(2026, 10, 21);
    const { work } = mockPue(mockChildren(now), now);
    expect(work.maternityLeave).toEqual({ startDate: '2026-10-08', endDate: '2027-02-24', weeks: 20 });
    expect(work.earnings).toHaveLength(12);
    expect(work.earnings[0]).toEqual({ month: '2025-10', gross: 6400 });
    expect(work.earnings[11]).toEqual({ month: '2026-09', gross: 6800 });
  });

  it('mockNip ma poprawną sumę kontrolną', () => {
    const nip = mockNip(527104318);
    const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    expect(w.reduce((a, x, i) => a + x * Number(nip[i]), 0) % 11).toBe(Number(nip[9]));
  });

  it('można przerwać logowanie', async () => {
    const ctrl = new AbortController();
    const promise = mockMObywatelService.signIn(ctrl.signal);
    const assertion = expect(promise).rejects.toThrow('aborted');
    ctrl.abort();
    await assertion;
  });
});
