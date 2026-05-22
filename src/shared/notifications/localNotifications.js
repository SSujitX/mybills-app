import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const CHANNEL_ID = 'mybills-reminders';
const SMALL_ICON = 'ic_stat_mybills_mono';
const BILL_NAMESPACE_MIN = 610000000;
const BILL_NAMESPACE_MAX = 619999999;
const PROBE_NAMESPACE_MIN = 620000000;

export const canUseAndroidNotifications = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const requestNotificationAccess = async () => {
  if (!canUseAndroidNotifications()) return false;

  const permission = await LocalNotifications.checkPermissions();
  if (permission.display === 'granted') return true;

  const requested = await LocalNotifications.requestPermissions();
  return requested.display === 'granted';
};

export const initializeNotificationChannel = async () => {
  if (!canUseAndroidNotifications()) return;

  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'MyBills reminders',
    description: 'Local reminders for MyBills workflows',
    importance: 4,
    visibility: 1,
    lights: true,
    vibration: true,
  });
};

const isPast = (date) => date.getTime() <= Date.now();

const dateKeyAtHour = (dateKey, hour) => new Date(`${dateKey}T${String(hour).padStart(2, '0')}:00:00`);

const shiftDateKey = (dateKey, days) => {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const simpleHash = (text) => {
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const getBillReminderId = (billId, reminderKind) => BILL_NAMESPACE_MIN + (simpleHash(`${billId}:${reminderKind}`) % 9000000);

const formatExpiryLabel = (dateKey) => new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}).format(new Date(`${dateKey}T12:00:00`));

const buildBillReminders = (bill, reminderHour) => {
  const notifications = [];
  const amount = Number(bill.price).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  const dayBeforeAt = dateKeyAtHour(shiftDateKey(bill.expiryDate, -1), reminderHour);
  const onExpiryAt = dateKeyAtHour(bill.expiryDate, reminderHour);
  const dayAfterAt = dateKeyAtHour(shiftDateKey(bill.expiryDate, 1), reminderHour);
  const overdueDailyStartAt = dateKeyAtHour(shiftDateKey(bill.expiryDate, 2), reminderHour);

  if (!isPast(dayBeforeAt)) {
    notifications.push({
      id: getBillReminderId(bill.id, 'day-before'),
      title: `${bill.title} expires tomorrow`,
      body: `${bill.currency} ${amount} is coming up.`,
      schedule: { at: dayBeforeAt, allowWhileIdle: true },
      channelId: CHANNEL_ID,
      smallIcon: SMALL_ICON,
    });
  }

  if (!isPast(onExpiryAt)) {
    notifications.push({
      id: getBillReminderId(bill.id, 'on-day'),
      title: `${bill.title} expires today`,
      body: `${bill.currency} ${amount} is due today.`,
      schedule: { at: onExpiryAt, allowWhileIdle: true },
      channelId: CHANNEL_ID,
      smallIcon: SMALL_ICON,
    });
  }

  if (!isPast(dayAfterAt)) {
    notifications.push({
      id: getBillReminderId(bill.id, 'day-after'),
      title: `${bill.title} needs a renewal check`,
      body: `Expiry was ${formatExpiryLabel(bill.expiryDate)}.`,
      schedule: { at: dayAfterAt, allowWhileIdle: true },
      channelId: CHANNEL_ID,
      smallIcon: SMALL_ICON,
    });
  }

  if (!isPast(overdueDailyStartAt)) {
    notifications.push({
      id: getBillReminderId(bill.id, 'overdue-daily'),
      title: `${bill.title} is still overdue`,
      body: `Renewal was due on ${formatExpiryLabel(bill.expiryDate)}.`,
      schedule: {
        at: overdueDailyStartAt,
        every: 'day',
        allowWhileIdle: true,
      },
      channelId: CHANNEL_ID,
      smallIcon: SMALL_ICON,
    });
  }

  return notifications;
};

export const cancelBillNotifications = async () => {
  if (!canUseAndroidNotifications()) return;

  const pending = await getBillPendingNotifications();
  if (pending.length === 0) return;

  await LocalNotifications.cancel({
    notifications: pending.map((notification) => ({ id: notification.id })),
  });
};

export const getBillPendingNotifications = async () => {
  if (!canUseAndroidNotifications()) return [];

  const pending = await LocalNotifications.getPending();
  return pending.notifications.filter(
    (notification) => notification.id >= BILL_NAMESPACE_MIN && notification.id <= BILL_NAMESPACE_MAX,
  );
};

export const syncBillNotifications = async (bills, reminderHour = 9) => {
  if (!canUseAndroidNotifications()) return [];

  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') return [];

  const pending = await getBillPendingNotifications();
  if (pending.length > 0) {
    await LocalNotifications.cancel({
      notifications: pending.map((notification) => ({ id: notification.id })),
    });
  }

  const notifications = bills.flatMap((bill) => buildBillReminders(bill, reminderHour));
  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }

  return notifications;
};

export const scheduleProbeNotification = async (secondsFromNow = 10) => {
  if (!canUseAndroidNotifications()) return null;

  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') return null;

  const now = Date.now();
  const at = new Date(now + Math.max(5, Number(secondsFromNow)) * 1000);
  const id = PROBE_NAMESPACE_MIN + (now % 100000);

  await LocalNotifications.schedule({
    notifications: [{
      id,
      title: 'MyBills notification check',
      body: 'Local reminders are ready.',
      schedule: { at, allowWhileIdle: true },
      channelId: CHANNEL_ID,
      smallIcon: SMALL_ICON,
    }],
  });

  return { id, at };
};
