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

const addToBucket = (bucket, currency, amount) => {
  if (!Number.isFinite(amount) || amount <= 0) return;
  bucket[currency] = (bucket[currency] || 0) + amount;
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

export const formatMoneyByCurrency = (totalsByCurrency) => {
  const entries = Object.entries(totalsByCurrency || {})
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
    .sort(([left], [right]) => left.localeCompare(right));

  if (entries.length === 0) return '—';
  if (entries.length === 1) {
    const [currency, amount] = entries[0];
    return formatMoney(amount, currency);
  }

  return entries.map(([currency, amount]) => formatMoney(amount, currency)).join(' · ');
};

export const summarizeBillMoneyByCurrency = (bills) => {
  const summary = {
    count: bills.length,
    dueSoonCount: 0,
    expiredCount: 0,
    totalAll: {},
    totalDueSoon: {},
    totalExpired: {},
  };

  bills.forEach((bill) => {
    const price = Number(bill.price);
    if (!Number.isFinite(price)) return;

    const daysUntil = getDaysUntil(bill.expiryDate);
    addToBucket(summary.totalAll, bill.currency, price);

    if (daysUntil < 0) {
      summary.expiredCount += 1;
      addToBucket(summary.totalExpired, bill.currency, price);
      return;
    }

    if (daysUntil <= 14) {
      summary.dueSoonCount += 1;
      addToBucket(summary.totalDueSoon, bill.currency, price);
    }
  });

  return summary;
};

export const summarizeBillMoneyInCurrency = (bills, targetCurrency, exchangeRates) => {
  const summary = {
    totalAll: 0,
    totalDueSoon: 0,
    totalExpired: 0,
    hasConversionGap: false,
  };

  if (!exchangeRates || !targetCurrency) {
    return {
      totalAll: null,
      totalDueSoon: null,
      totalExpired: null,
      hasConversionGap: true,
    };
  }

  bills.forEach((bill) => {
    const price = Number(bill.price);
    if (!Number.isFinite(price)) return;

    const converted = convertToCurrency(price, bill.currency, targetCurrency, exchangeRates);
    if (converted === null) {
      summary.hasConversionGap = true;
      return;
    }

    const daysUntil = getDaysUntil(bill.expiryDate);
    summary.totalAll += converted;

    if (daysUntil < 0) {
      summary.totalExpired += converted;
      return;
    }

    if (daysUntil <= 14) {
      summary.totalDueSoon += converted;
    }
  });

  return summary;
};

export const formatConvertedTotal = (
  amount,
  currency,
  ratesStatus,
  hasConversionGap = false,
) => {
  if (ratesStatus === 'loading') return '…';
  if (amount === null || ratesStatus === 'unavailable' || hasConversionGap) return '—';
  return formatMoney(amount, currency);
};

/** @deprecated Use summarizeBillMoneyInCurrency */
export const summarizeBillMoneyInUsd = (bills, usdRates) => summarizeBillMoneyInCurrency(bills, 'USD', usdRates);

/** @deprecated Use formatConvertedTotal */
export const formatUsdTotal = (amount, ratesStatus, hasConversionGap) => (
  formatConvertedTotal(amount, 'USD', ratesStatus, hasConversionGap)
);

export const summarizeSpentByCurrency = (entries, monthKey) => {
  const totals = {};

  entries.forEach((entry) => {
    if (!entry.spentDate.startsWith(monthKey)) return;
    addToBucket(totals, entry.currency, Number(entry.amount));
  });

  return totals;
};

export const summarizeSpentMonth = (entries, monthKey, monthlyBudget) => {
  const monthEntries = entries.filter((entry) => entry.spentDate.startsWith(monthKey));
  const spentByCurrency = summarizeSpentByCurrency(entries, monthKey);
  const categoryCounts = new Map();

  monthEntries.forEach((entry) => {
    (entry.categories || [entry.category]).forEach((category) => {
      if (!category) return;
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });
  });

  const categories = [...categoryCounts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));

  const budgetAmount = monthlyBudget.amount === '' ? null : Number(monthlyBudget.amount);
  const budgetCurrency = monthlyBudget.currency;
  const spentInBudgetCurrency = budgetAmount === null
    ? null
    : (spentByCurrency[budgetCurrency] || 0);
  const remaining = budgetAmount === null || spentInBudgetCurrency === null
    ? null
    : budgetAmount - spentInBudgetCurrency;

  const otherSpent = Object.entries(spentByCurrency)
    .filter(([currency]) => currency !== budgetCurrency)
    .sort(([left], [right]) => left.localeCompare(right));

  return {
    budgetAmount,
    budgetCurrency,
    categories,
    count: monthEntries.length,
    otherSpent,
    overBudget: remaining === null ? null : Math.max(0, -remaining),
    remaining: remaining === null ? null : Math.max(0, remaining),
    spentByCurrency,
    spentInBudgetCurrency,
  };
};
