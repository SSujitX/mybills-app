import { getDefaultCurrency } from '../currency/localeDefaults.js';
import { normalizeSupportedCurrency } from '../currency/supportedCurrencies.js';

const SHELL_PREFERENCES_KEY = 'mybills:shell-preferences';

export const DEFAULT_SHELL_PREFERENCES = {
  notificationsEnabled: false,
  reminderHour: 22,
  displayCurrency: getDefaultCurrency(),
};

const getStore = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const clampReminderHour = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return DEFAULT_SHELL_PREFERENCES.reminderHour;
  return Math.min(22, Math.max(6, parsed));
};

const normalizePreferences = (preferences) => ({
  notificationsEnabled: Boolean(preferences?.notificationsEnabled),
  reminderHour: clampReminderHour(preferences?.reminderHour),
  displayCurrency: normalizeSupportedCurrency(
    preferences?.displayCurrency,
    getDefaultCurrency(),
  ),
});

export const loadShellPreferences = () => {
  const raw = getStore()?.getItem(SHELL_PREFERENCES_KEY);
  if (!raw) return DEFAULT_SHELL_PREFERENCES;

  try {
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_SHELL_PREFERENCES;
  }
};

export const saveShellPreferences = (preferences) => {
  const normalized = normalizePreferences(preferences);
  getStore()?.setItem(SHELL_PREFERENCES_KEY, JSON.stringify(normalized));
  return normalized;
};
