import { loadBills } from './billStorage.js';
import {
  cancelBillNotifications,
  initializeNotificationChannel,
  requestNotificationAccess,
  syncBillNotifications,
} from '../../shared/notifications/localNotifications.js';
import { loadShellPreferences } from '../../shared/storage/shellPreferences.js';

export const refreshBillNotifications = async () => {
  const preferences = loadShellPreferences();

  if (!preferences.notificationsEnabled) {
    await cancelBillNotifications();
    return [];
  }

  await initializeNotificationChannel();
  await requestNotificationAccess();

  return syncBillNotifications(loadBills(), preferences.reminderHour);
};
