export const BILL_CURRENCIES = ['USD', 'EUR', 'BDT', 'GBP'];

export const isSupportedCurrency = (currency) => BILL_CURRENCIES.includes(currency);

export const normalizeSupportedCurrency = (currency, fallback) => (
  isSupportedCurrency(currency) ? currency : (fallback || BILL_CURRENCIES[0])
);
