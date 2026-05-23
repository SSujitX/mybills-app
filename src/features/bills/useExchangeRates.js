import { useEffect, useState } from 'react';
import {
  getCachedExchangeRates,
  loadExchangeRates,
} from '../../shared/currency/exchangeRates.js';

export const useExchangeRates = () => {
  const [ratesState, setRatesState] = useState(() => {
    const cached = getCachedExchangeRates();

    return {
      status: cached ? 'loading' : 'loading',
      rates: cached?.rates ?? null,
      fetchedAt: cached?.fetchedAt ?? null,
    };
  });

  useEffect(() => {
    let cancelled = false;

    const refreshRates = () => {
      const cached = getCachedExchangeRates();
      if (cached) {
        setRatesState({
          status: 'loading',
          rates: cached.rates,
          fetchedAt: cached.fetchedAt,
        });
      }

      loadExchangeRates().then((result) => {
        if (cancelled) return;

        setRatesState({
          status: result.status,
          rates: result.rates,
          fetchedAt: result.fetchedAt,
        });
      });
    };

    refreshRates();

    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') refreshRates();
    };

    document.addEventListener('visibilitychange', refreshOnVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, []);

  return ratesState;
};
