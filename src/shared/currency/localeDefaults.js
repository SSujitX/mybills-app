import { BILL_CURRENCIES, normalizeSupportedCurrency } from './supportedCurrencies.js';

const REGION_CURRENCY = {
  BD: 'BDT',
  US: 'USD',
  GB: 'GBP',
  UK: 'GBP',
};

const EURO_REGIONS = new Set([
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT',
  'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
]);

const getRegionCode = () => {
  if (typeof navigator === 'undefined') return '';

  const locale = navigator.language || '';
  const parts = locale.split('-');
  if (parts.length < 2) return parts[0]?.toUpperCase() || '';

  return parts[parts.length - 1].toUpperCase();
};

export const getLocaleTag = () => {
  if (typeof navigator === 'undefined') return 'en-US';
  return navigator.language || 'en-US';
};

export const getDefaultCurrency = () => {
  const region = getRegionCode();

  if (REGION_CURRENCY[region]) {
    return normalizeSupportedCurrency(REGION_CURRENCY[region]);
  }

  if (EURO_REGIONS.has(region)) {
    return 'EUR';
  }

  try {
    const formatter = new Intl.NumberFormat(getLocaleTag(), {
      style: 'currency',
      currency: 'USD',
    });
    const resolved = formatter.resolvedOptions().currency;
    if (resolved) return normalizeSupportedCurrency(resolved);
  } catch {
    // Ignore unsupported locale combinations.
  }

  return BILL_CURRENCIES[0];
};

export const getDateFormatOptions = () => ({
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export const getTimeFormatOptions = () => ({
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
