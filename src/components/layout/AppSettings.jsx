import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
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
  APP_VERSION,
} from '../../shared/app/appInfo.js';
import { APP_REPO_URL } from '../../shared/app/appUpdateConfig.js';
import { useAppUpdates } from '../../shared/app/appUpdates.js';
import { refreshBillNotifications } from '../../features/bills/billNotifications.js';
import {
  loadShellPreferences,
  saveShellPreferences,
} from '../../shared/storage/shellPreferences.js';
import AppUpdateModal from './AppUpdateModal.jsx';

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

  const isOpenRef = useRef(isOpen);
  const isUpdateModalOpenRef = useRef(false);
  const isUpdateDownloadingRef = useRef(false);

  const {
    currentAppVersion,
    updateInfo,
    isCheckingUpdate,
    updateCheckStatusText,
    isUpdateModalOpen,
    isUpdateDownloading,
    updateDownloadProgress,
    updateDownloadedApkUri,
    updateDownloadedFileName,
    updateDownloadBytesText,
    updateDownloadErrorText,
    checkForAppUpdate,
    checkOnLaunch,
    handleDownloadUpdate,
    handleCancelUpdateDownload,
    handleInstallUpdate,
    handleCloseUpdateModal,
  } = useAppUpdates();

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    isUpdateModalOpenRef.current = isUpdateModalOpen;
  }, [isUpdateModalOpen]);

  useEffect(() => {
    isUpdateDownloadingRef.current = isUpdateDownloading;
  }, [isUpdateDownloading]);

  useEffect(() => {
    initializeNotificationChannel();
    checkOnLaunch();
  }, [checkOnLaunch]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return undefined;

    let listenerHandle = null;
    const registerBackHandler = async () => {
      listenerHandle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (isUpdateModalOpenRef.current) {
          if (!isUpdateDownloadingRef.current) {
            handleCloseUpdateModal();
          }
          return;
        }

        if (globalThis.__myBillsCloseWorkspaceOverlay?.()) {
          return;
        }

        if (isOpenRef.current) {
          setIsOpen(false);
          return;
        }

        if (canGoBack) {
          window.history.back();
          return;
        }

        CapacitorApp.exitApp();
      });
    };

    registerBackHandler();
    return () => {
      listenerHandle?.remove();
    };
  }, [handleCloseUpdateModal]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (isUpdateModalOpenRef.current) {
        if (!isUpdateDownloadingRef.current) handleCloseUpdateModal();
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleCloseUpdateModal]);

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
              <section className="settings-section" aria-labelledby="settings-reminders-title">
                <h3 className="settings-section-title" id="settings-reminders-title">
                  Bill reminders
                </h3>
                <p className="settings-note">
                  Android only. Turn on reminders, allow permission, then save or edit a bill to schedule alerts.
                </p>
                <ul className="settings-schedule-chips" aria-label="Reminder schedule">
                  <li>1 day before expiry</li>
                  <li>On expiry day</li>
                  <li>1 day after expiry</li>
                  <li>Daily overdue</li>
                </ul>

                <div className="settings-controls">
                  <label className="settings-switch">
                    <span className="settings-switch-copy">
                      <strong>Enable bill reminders</strong>
                      <small>Uses your daily reminder time below</small>
                    </span>
                    <input
                      className="settings-switch-input"
                      type="checkbox"
                      checked={preferences.notificationsEnabled}
                      onChange={(event) => updatePreferences({ notificationsEnabled: event.target.checked })}
                    />
                    <span className="settings-switch-track" aria-hidden="true" />
                  </label>

                  <div className="settings-hour-field">
                    <label htmlFor="settings-reminder-hour">Daily reminder time (24h)</label>
                    <input
                      id="settings-reminder-hour"
                      type="number"
                      min="6"
                      max="22"
                      value={preferences.reminderHour}
                      disabled={!preferences.notificationsEnabled}
                      onChange={(event) => updatePreferences({ reminderHour: event.target.value })}
                    />
                    <p className="settings-hour-hint">
                      Sends at {formatReminderHourLabel(preferences.reminderHour)} · use 22 for 10:00 PM
                    </p>
                  </div>
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
              </section>

              <div className="settings-about" aria-label="App information">
                <h3>About</h3>
                <dl className="settings-about-list">
                  <div>
                    <dt>App name</dt>
                    <dd>{APP_NAME}</dd>
                  </div>
                  <div>
                    <dt>Version</dt>
                    <dd>v{currentAppVersion || APP_VERSION}</dd>
                  </div>
                  <div>
                    <dt>App ID</dt>
                    <dd>{APP_ID}</dd>
                  </div>
                </dl>
                <div className="settings-about-updates">
                  <a href={APP_REPO_URL} target="_blank" rel="noreferrer" className="settings-repo-link">
                    GitHub releases
                  </a>
                  <button
                    className="settings-update-secondary-btn"
                    type="button"
                    onClick={() => checkForAppUpdate({ manual: true })}
                    disabled={isCheckingUpdate}
                  >
                    {isCheckingUpdate ? 'Checking…' : 'Check for updates'}
                  </button>
                  {updateCheckStatusText && (
                    <p className="settings-status" role="status">{updateCheckStatusText}</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {isUpdateModalOpen && updateInfo && (
        <AppUpdateModal
          updateInfo={updateInfo}
          isUpdateDownloading={isUpdateDownloading}
          updateDownloadProgress={updateDownloadProgress}
          updateDownloadBytesText={updateDownloadBytesText}
          updateDownloadedApkUri={updateDownloadedApkUri}
          updateDownloadedFileName={updateDownloadedFileName}
          updateDownloadErrorText={updateDownloadErrorText}
          onDownload={handleDownloadUpdate}
          onCancelDownload={handleCancelUpdateDownload}
          onInstall={handleInstallUpdate}
          onClose={handleCloseUpdateModal}
        />
      )}
    </section>
  );
}
