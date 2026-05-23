import { BILL_CURRENCIES, normalizeSupportedCurrency } from './supportedCurrencies.js';

const REGION_CURRENCY = {
  AS: 'USD',
  BD: 'BDT',
  BQ: 'USD',
  EC: 'USD',
  FM: 'USD',
  GB: 'GBP',
  GG: 'GBP',
  GU: 'USD',
  IM: 'GBP',
  IO: 'USD',
  JE: 'GBP',
  MH: 'USD',
  MP: 'USD',
  PA: 'USD',
  PR: 'USD',
  PW: 'USD',
  SV: 'USD',
  TC: 'USD',
  TL: 'USD',
  UK: 'GBP',
  UM: 'USD',
  US: 'USD',
  VG: 'USD',
  VI: 'USD',
};

const EURO_REGIONS = new Set([
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT',
  'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
]);

const getNavigatorLocales = () => {
  if (typeof navigator === 'undefined') return ['en-US'];

  const locales = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language];

  return locales.filter(Boolean);
};

const getRegionFromLocale = (locale) => {
  if (!locale) return '';

  try {
    const parsed = new Intl.Locale(locale);
    const region = parsed.region || parsed.maximize().region;
    if (region) return region.toUpperCase();
  } catch {
    // Fall back to a small BCP-47 parser below.
  }

  return locale
    .replace(/_/g, '-')
    .split('-')
    .find((part, index) => index > 0 && /^(?:[a-z]{2}|\d{3})$/i.test(part))
    ?.toUpperCase() || '';
};

const getCurrencyFromRegion = (region) => {
  if (!region) return '';

  if (REGION_CURRENCY[region]) {
    return REGION_CURRENCY[region];
  }

  if (EURO_REGIONS.has(region)) {
    return 'EUR';
  }

  return '';
};

export const getLocaleTag = () => getNavigatorLocales()[0] || 'en-US';

export const getDeviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const getDefaultCurrency = () => {
  const currencies = getNavigatorLocales()
    .map(getRegionFromLocale)
    .map(getCurrencyFromRegion)
    .filter(Boolean);

  const supportedCurrency = currencies.find((currency) => BILL_CURRENCIES.includes(currency));
  if (supportedCurrency) return normalizeSupportedCurrency(supportedCurrency);

  return BILL_CURRENCIES[0];
};

export const getDateFormatOptions = () => ({
  day: 'numeric',
  month: 'short',
  timeZone: getDeviceTimeZone(),
  year: 'numeric',
});

export const getTimeFormatOptions = () => ({
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: getDeviceTimeZone(),
});
