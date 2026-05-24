import { getDefaultCurrency } from '../../shared/currency/localeDefaults.js';
import { normalizeSupportedCurrency } from '../../shared/currency/supportedCurrencies.js';

const SPENT_KEY = 'mybills:spent-entries';
const BUDGET_KEY = 'mybills:monthly-budget';
const CUSTOM_CATEGORIES_KEY = 'mybills:spent-custom-categories';
const HIDDEN_CATEGORIES_KEY = 'mybills:spent-hidden-categories';

export const SPEND_CATEGORIES = [
  'Food',
  'Transport',
  'Housing',
  'Utilities',
  'Subscriptions',
  'Shopping',
  'Business',
  'Other',
];

const getStore = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const todayKey = () => {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
};

const isDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '');

const makeSpentId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeCurrency = (currency) => normalizeSupportedCurrency(currency, getDefaultCurrency());

const normalizeAmount = (amount) => {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
};

export const normalizeSpendCategory = (category) => {
  const value = String(category || '').trim();
  return value;
};

const dedupeCategories = (categories) => {
  const seen = new Set();
  return (Array.isArray(categories) ? categories : [categories])
    .map((category) => normalizeSpendCategory(category))
    .filter(Boolean)
    .filter((category) => {
      const key = category.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const normalizeSpentCategories = (entry) => {
  const categories = dedupeCategories(entry?.categories);
  if (categories.length > 0) return categories;

  const legacyCategory = normalizeSpendCategory(entry?.category);
  return legacyCategory ? [legacyCategory] : [];
};

export const createEmptySpentDraft = () => ({
  title: '',
  details: '',
  amount: '',
  currency: getDefaultCurrency(),
  categories: [],
  spentDate: todayKey(),
});

export const toSpentDraft = (entry) => ({
  title: entry.title,
  details: entry.details,
  amount: String(entry.amount),
  currency: entry.currency,
  categories: entry.categories?.length ? entry.categories : [entry.category].filter(Boolean),
  spentDate: entry.spentDate,
});

const normalizeSpentEntry = (entry) => {
  const amount = normalizeAmount(entry?.amount);
  const title = String(entry?.title || '').trim();
  const details = String(entry?.details ?? '');
  const spentDate = isDateKey(entry?.spentDate) ? entry.spentDate : '';
  const categories = normalizeSpentCategories(entry);

  if (!entry?.id || !title || amount === null || !spentDate || categories.length === 0) return null;

  return {
    id: String(entry.id),
    title,
    details,
    amount,
    currency: normalizeCurrency(entry.currency),
    category: categories[0],
    categories,
    spentDate,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
  };
};

const byNewestSpentDate = (left, right) => right.spentDate.localeCompare(left.spentDate)
  || left.title.localeCompare(right.title);

export const createSpentFromDraft = (draft) => normalizeSpentEntry({
  ...draft,
  id: makeSpentId(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const updateSpentFromDraft = (entry, draft) => normalizeSpentEntry({
  ...entry,
  ...draft,
  updatedAt: new Date().toISOString(),
});

export const loadSpentEntries = () => {
  const raw = getStore()?.getItem(SPENT_KEY);
  if (!raw) return [];

  try {
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return [];
    return stored.map(normalizeSpentEntry).filter(Boolean).sort(byNewestSpentDate);
  } catch {
    return [];
  }
};

export const saveSpentEntries = (entries) => {
  const normalized = Array.isArray(entries)
    ? entries.map(normalizeSpentEntry).filter(Boolean).sort(byNewestSpentDate)
    : [];

  getStore()?.setItem(SPENT_KEY, JSON.stringify(normalized));
  return normalized;
};

export const loadCustomSpendCategories = () => {
  const raw = getStore()?.getItem(CUSTOM_CATEGORIES_KEY);
  if (!raw) return [];

  try {
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return [];
    return dedupeCategories(stored).filter((category) => !SPEND_CATEGORIES.includes(category));
  } catch {
    return [];
  }
};

export const saveCustomSpendCategories = (categories) => {
  const normalized = dedupeCategories(categories).filter((category) => !SPEND_CATEGORIES.includes(category));
  getStore()?.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(normalized));
  return normalized;
};

export const loadHiddenSpendCategories = () => {
  const raw = getStore()?.getItem(HIDDEN_CATEGORIES_KEY);
  if (!raw) return [];

  try {
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return [];
    return dedupeCategories(stored);
  } catch {
    return [];
  }
};

export const saveHiddenSpendCategories = (categories) => {
  const normalized = dedupeCategories(categories);
  getStore()?.setItem(HIDDEN_CATEGORIES_KEY, JSON.stringify(normalized));
  return normalized;
};

const normalizeBudget = (budget) => {
  const amount = normalizeAmount(budget?.amount);

  return {
    amount: amount === null ? '' : amount,
    currency: normalizeCurrency(budget?.currency),
  };
};

export const createEmptyBudgetDraft = () => ({
  amount: '',
  currency: getDefaultCurrency(),
});

export const loadMonthlyBudget = () => {
  const raw = getStore()?.getItem(BUDGET_KEY);
  if (!raw) return createEmptyBudgetDraft();

  try {
    return normalizeBudget(JSON.parse(raw));
  } catch {
    return createEmptyBudgetDraft();
  }
};

export const saveMonthlyBudget = (budget) => {
  const normalized = normalizeBudget(budget);
  getStore()?.setItem(BUDGET_KEY, JSON.stringify(normalized));
  return normalized;
};
