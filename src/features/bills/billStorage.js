import { getDefaultCurrency } from '../../shared/currency/localeDefaults.js';
import {
  BILL_CURRENCIES,
  normalizeSupportedCurrency,
} from '../../shared/currency/supportedCurrencies.js';

const BILLS_KEY = 'mybills:bills';

export { BILL_CURRENCIES };

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

const nextMonthKey = (dateKey) => {
  const source = new Date(`${dateKey}T12:00:00`);
  const nextMonthFirstDay = new Date(source.getFullYear(), source.getMonth() + 1, 1);
  const nextMonthLastDay = new Date(source.getFullYear(), source.getMonth() + 2, 0).getDate();
  nextMonthFirstDay.setDate(Math.min(source.getDate(), nextMonthLastDay));

  return [
    nextMonthFirstDay.getFullYear(),
    String(nextMonthFirstDay.getMonth() + 1).padStart(2, '0'),
    String(nextMonthFirstDay.getDate()).padStart(2, '0'),
  ].join('-');
};

const isDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '');

const makeBillId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeCurrency = (currency) => normalizeSupportedCurrency(currency, getDefaultCurrency());

const normalizePrice = (price) => {
  const parsed = Number(price);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
};

export const createEmptyBillDraft = () => {
  const boughtDate = todayKey();

  return {
    title: '',
    details: '',
    price: '',
    currency: getDefaultCurrency(),
    boughtDate,
    expiryDate: nextMonthKey(boughtDate),
  };
};

export const toBillDraft = (bill) => ({
  title: bill.title,
  details: bill.details,
  price: String(bill.price),
  currency: bill.currency,
  boughtDate: bill.boughtDate,
  expiryDate: bill.expiryDate,
});

const normalizeBill = (bill) => {
  const price = normalizePrice(bill?.price);
  const title = String(bill?.title || '').trim();
  const details = String(bill?.details ?? '');
  const boughtDate = isDateKey(bill?.boughtDate) ? bill.boughtDate : '';
  const expiryDate = isDateKey(bill?.expiryDate) ? bill.expiryDate : '';

  if (!bill?.id || !title || price === null || !boughtDate || !expiryDate) return null;

  return {
    id: String(bill.id),
    title,
    details,
    price,
    currency: normalizeCurrency(bill.currency),
    boughtDate,
    expiryDate,
    createdAt: bill.createdAt || new Date().toISOString(),
    updatedAt: bill.updatedAt || bill.createdAt || new Date().toISOString(),
  };
};

const byExpiryDate = (left, right) => left.expiryDate.localeCompare(right.expiryDate)
  || left.title.localeCompare(right.title);

export const createBillFromDraft = (draft) => normalizeBill({
  ...draft,
  id: makeBillId(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const updateBillFromDraft = (bill, draft) => normalizeBill({
  ...bill,
  ...draft,
  updatedAt: new Date().toISOString(),
});

export const loadBills = () => {
  const raw = getStore()?.getItem(BILLS_KEY);
  if (!raw) return [];

  try {
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return [];
    return stored.map(normalizeBill).filter(Boolean).sort(byExpiryDate);
  } catch {
    return [];
  }
};

export const saveBills = (bills) => {
  const normalized = Array.isArray(bills)
    ? bills.map(normalizeBill).filter(Boolean).sort(byExpiryDate)
    : [];

  getStore()?.setItem(BILLS_KEY, JSON.stringify(normalized));
  return normalized;
};
