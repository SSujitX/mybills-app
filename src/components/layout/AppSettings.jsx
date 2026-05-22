import { useEffect, useState } from 'react';
import { BellRing, Settings, X } from 'lucide-react';
import {
  canUseAndroidNotifications,
  initializeNotificationChannel,
  requestNotificationAccess,
  scheduleProbeNotification,
} from '../../shared/notifications/localNotifications.js';
import {
  APP_ID,
  APP_NAME,
  APP_UPDATE_NOTE,
  APP_VERSION,
  getAppPlatformLabel,
} from '../../shared/app/appInfo.js';
import { refreshBillNotifications } from '../../features/bills/billNotifications.js';
import {
  loadShellPreferences,
  saveShellPreferences,
} from '../../shared/storage/shellPreferences.js';

const formatReminderHourLabel = (hour) => new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(2026, 0, 1, hour, 0, 0));

const formatProbeTime = (date) => new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}).format(date);

export default function AppSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState(() => loadShellPreferences());
  const [statusMessage, setStatusMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    initializeNotificationChannel();
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const updatePreferences = (patch) => {
    const nextPreferences = saveShellPreferences({ ...preferences, ...patch });
    setPreferences(nextPreferences);
    refreshBillNotifications();
  };

  const closeSettings = () => setIsOpen(false);

  const runTestNotification = async () => {
    setIsTesting(true);
    setStatusMessage('Preparing test notification…');

    try {
      if (!canUseAndroidNotifications()) {
        setStatusMessage('Local notifications are available in the Android app build.');
        return;
      }

      await initializeNotificationChannel();
      const granted = await requestNotificationAccess();
      if (!granted) {
        setStatusMessage('Notification permission was not granted.');
        return;
      }

      const result = await scheduleProbeNotification(8);
      if (!result) {
        setStatusMessage('Could not schedule the test notification.');
        return;
      }

      setStatusMessage(`Test notification scheduled for ${formatProbeTime(result.at)}.`);
    } catch {
      setStatusMessage('Test notification failed. Try again on your Android build.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <section className="app-settings" aria-label="App settings">
      <button
        className="settings-open-btn"
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
      >
        <Settings aria-hidden="true" />
        <span>Settings</span>
      </button>

      {isOpen && (
        <div
          className="composer-backdrop settings-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeSettings();
          }}
        >
          <section
            className="settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-settings-title"
          >
            <div className="settings-dialog-head">
              <h2 id="app-settings-title">Settings</h2>
              <button
                className="ghost-icon-btn"
                type="button"
                onClick={closeSettings}
                aria-label="Close settings"
                title="Close"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="settings-panel">
              <p className="settings-note">
                Android only. Turn on reminders, allow permission, then save or edit a bill to schedule alerts.
              </p>
              <ul className="settings-schedule-list">
                <li>1 day before expiry</li>
                <li>On expiry day</li>
                <li>1 day after expiry</li>
                <li>Daily after that until you update the bill</li>
              </ul>

              <div className="settings-options">
                <label className="settings-toggle-row">
                  <span>Enable bill reminders</span>
                  <input
                    type="checkbox"
                    checked={preferences.notificationsEnabled}
                    onChange={(event) => updatePreferences({ notificationsEnabled: event.target.checked })}
                  />
                </label>

                <label className="settings-hour-row">
                  <span>Daily reminder time (24h)</span>
                  <input
                    type="number"
                    min="6"
                    max="22"
                    value={preferences.reminderHour}
                    onChange={(event) => updatePreferences({ reminderHour: event.target.value })}
                  />
                </label>
                <p className="settings-hour-hint">
                  Currently {formatReminderHourLabel(preferences.reminderHour)} (22 = 10:00 PM).
                </p>
              </div>

              <div className="settings-actions">
                <button
                  className="settings-test-btn"
                  type="button"
                  onClick={runTestNotification}
                  disabled={isTesting}
                >
                  <BellRing aria-hidden="true" />
                  {isTesting ? 'Scheduling…' : 'Test notification'}
                </button>
                {statusMessage && (
                  <p className="settings-status" role="status">{statusMessage}</p>
                )}
              </div>

              <div className="settings-about" aria-label="App information">
                <h3>About</h3>
                <dl className="settings-about-list">
                  <div>
                    <dt>App name</dt>
                    <dd>{APP_NAME}</dd>
                  </div>
                  <div>
                    <dt>Version</dt>
                    <dd>{APP_VERSION}</dd>
                  </div>
                  <div>
                    <dt>App ID</dt>
                    <dd>{APP_ID}</dd>
                  </div>
                  <div>
                    <dt>Platform</dt>
                    <dd>{getAppPlatformLabel()}</dd>
                  </div>
                  <div>
                    <dt>Update</dt>
                    <dd>{APP_UPDATE_NOTE}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
