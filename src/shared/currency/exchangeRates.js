import { BILL_CURRENCIES } from './supportedCurrencies.js';

const RATES_CACHE_KEY = 'mybills:exchange-rates';
const RATES_API_URL = 'https://open.er-api.com/v6/latest/USD';

const getStore = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const pickSupportedRates = (rates) => BILL_CURRENCIES.reduce((result, currency) => {
  const value = Number(rates?.[currency]);
  if (Number.isFinite(value) && value > 0) {
    result[currency] = value;
  }
  return result;
}, {});

const readCache = () => {
  const raw = getStore()?.getItem(RATES_CACHE_KEY);
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw);
    if (!cached?.rates || !cached?.fetchedAt) return null;

    return {
      rates: pickSupportedRates(cached.rates),
      fetchedAt: cached.fetchedAt,
      source: cached.source || 'cache',
    };
  } catch {
    return null;
  }
};

const writeCache = (rates, source) => {
  getStore()?.setItem(RATES_CACHE_KEY, JSON.stringify({
    rates,
    fetchedAt: Date.now(),
    source,
  }));
};

export const convertToCurrency = (amount, fromCurrency, toCurrency, usdRates) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  if (fromCurrency === toCurrency) return value;
  if (!usdRates) return null;

  const fromRate = usdRates[fromCurrency];
  const toRate = usdRates[toCurrency];
  if (!fromRate || !toRate) return null;

  const amountInUsd = fromCurrency === 'USD' ? value : value / fromRate;
  return toCurrency === 'USD' ? amountInUsd : amountInUsd * toRate;
};

export const getCachedExchangeRates = () => {
  const cached = readCache();
  if (!cached?.rates) return null;

  return {
    rates: cached.rates,
    fetchedAt: cached.fetchedAt,
  };
};

export const loadExchangeRates = async () => {
  const cached = readCache();

  try {
    const response = await fetch(RATES_API_URL);
    if (!response.ok) throw new Error(`Rates request failed (${response.status})`);

    const payload = await response.json();
    if (payload.result !== 'success' || !payload.rates) {
      throw new Error('Rates payload was invalid');
    }

    const rates = pickSupportedRates(payload.rates);
    if (!rates.USD) rates.USD = 1;

    writeCache(rates, 'open.er-api.com');

    return {
      rates,
      fetchedAt: Date.now(),
      status: 'live',
      fromCache: false,
    };
  } catch (error) {
    if (cached?.rates) {
      return {
        rates: cached.rates,
        fetchedAt: cached.fetchedAt,
        status: 'cached',
        fromCache: true,
        error,
      };
    }

    return {
      rates: null,
      fetchedAt: null,
      status: 'unavailable',
      fromCache: false,
      error,
    };
  }
};

export const formatRatesUpdatedAt = (fetchedAt) => {
  if (!fetchedAt) return '';

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fetchedAt));
};

const formatRateValue = (rate) => new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: rate >= 100 ? 2 : 4,
}).format(rate);

export const formatUsdComparisonRate = (currency, usdRates) => {
  if (!usdRates) return null;

  const rate = usdRates[currency];
  if (!Number.isFinite(rate) || rate <= 0) return null;

  if (currency === 'USD') {
    return '1 USD = 1.00 USD';
  }

  return `1 USD = ${formatRateValue(rate)} ${currency}`;
};
