import { format, parseISO, startOfDay } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useClockStore } from './clock';

// Jedyne (poza clock.ts) miejsce czytające zegar systemowy.
const realDayKey = () => format(new Date(), 'yyyy-MM-dd');

/**
 * Reaktywne „dzisiaj”: zmienia się po nadpisaniu daty w DevPanelu
 * oraz po powrocie aplikacji na pierwszy plan w nowym dniu.
 */
export function useToday(): Date {
  const override = useClockStore((s) => s.overrideDate);
  const [dayKey, setDayKey] = useState(realDayKey);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDayKey(realDayKey());
    });
    return () => sub.remove();
  }, []);

  const key = override ?? dayKey;
  return useMemo(() => startOfDay(parseISO(key)), [key]);
}
