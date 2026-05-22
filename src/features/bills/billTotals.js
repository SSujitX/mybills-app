import { convertToCurrency } from '../../shared/currency/exchangeRates.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getTodayKey = () => {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
};

const getDaysUntil = (dateKey) => {
  const today = new Date(`${getTodayKey()}T00:00:00`);
  const target = new Date(`${dateKey}T00:00:00`);
  return Math.ceil((target - today) / MS_PER_DAY);
};

export const formatMoney = (amount, currency) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 2,
  }).format(value);
};

export const summarizeBillMoney = (bills, displayCurrency, usdRates) => {
  const summary = {
    count: bills.length,
    dueSoonCount: 0,
    expiredCount: 0,
    totalAll: 0,
    totalDueSoon: 0,
    totalExpired: 0,
    hasConversionGap: false,
  };

  bills.forEach((bill) => {
    const converted = convertToCurrency(bill.price, bill.currency, displayCurrency, usdRates);
    const daysUntil = getDaysUntil(bill.expiryDate);

    if (converted === null) {
      summary.hasConversionGap = true;
      return;
    }

    summary.totalAll += converted;

    if (daysUntil < 0) {
      summary.expiredCount += 1;
      summary.totalExpired += converted;
      return;
    }

    if (daysUntil <= 14) {
      summary.dueSoonCount += 1;
      summary.totalDueSoon += converted;
    }
  });

  return summary;
};
