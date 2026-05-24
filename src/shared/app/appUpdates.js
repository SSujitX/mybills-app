import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { FileTransfer } from '@capacitor/file-transfer';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  CURRENT_APP_VERSION_KEY,
  RELEASE_LATEST_API_URL,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_DOWNLOAD_FOLDER,
  UPDATE_LAST_CHECK_KEY,
} from './appUpdateConfig.js';
import { APP_VERSION } from './appInfo.js';

export const normalizeVersion = (value) => String(value || '').trim().replace(/^v/i, '');

export const stripDefaultReleaseNote = (value) => String(value || '')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && line !== 'Automated Android release build.')
  .join('\n')
  .trim();

export const compareVersions = (left, right) => {
  const leftParts = normalizeVersion(left).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = normalizeVersion(right).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const maxLen = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLen; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
};

export const formatBytes = (bytesValue) => {
  const bytes = Number(bytesValue || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

export const fetchLatestRelease = async () => {
  const response = await fetch(RELEASE_LATEST_API_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  });

  if (!response.ok) {
    throw new Error(`release-api-${response.status}`);
  }

  const payload = await response.json();
  const tagName = String(payload?.tag_name || '');
  const normalizedLatestVersion = normalizeVersion(tagName);
  const assets = Array.isArray(payload?.assets) ? payload.assets : [];
  const apkAsset = assets.find((asset) => String(asset?.name || '').toLowerCase().endsWith('.apk'));

  return {
    latestTag: tagName || `v${normalizedLatestVersion}`,
    latestVersion: normalizedLatestVersion,
    releaseUrl: payload?.html_url || '',
    releaseNotes: stripDefaultReleaseNote(payload?.body || ''),
    apkUrl: apkAsset?.browser_download_url || '',
    apkName: apkAsset?.name || '',
  };
};

export const getCurrentAppVersion = async (fallbackVersion = APP_VERSION) => {
  try {
    const info = await CapacitorApp.getInfo();
    return normalizeVersion(info?.version || fallbackVersion);
  } catch {
    return normalizeVersion(fallbackVersion);
  }
};

const GITHUB_DOWNLOAD_HEADERS = {
  Accept: 'application/octet-stream',
  'User-Agent': 'MyBills-App',
};

export const useAppUpdates = () => {
  const [currentAppVersion, setCurrentAppVersion] = useState(
    () => localStorage.getItem(CURRENT_APP_VERSION_KEY) || APP_VERSION,
  );
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateCheckStatusText, setUpdateCheckStatusText] = useState('');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isUpdateDownloading, setIsUpdateDownloading] = useState(false);
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState(0);
  const [updateDownloadedApkUri, setUpdateDownloadedApkUri] = useState('');
  const [updateDownloadedFileName, setUpdateDownloadedFileName] = useState('');
  const [updateDownloadBytesText, setUpdateDownloadBytesText] = useState('');
  const [updateDownloadErrorText, setUpdateDownloadErrorText] = useState('');

  const isCheckingUpdateRef = useRef(false);

  const refreshCurrentAppVersion = useCallback(async () => {
    const version = await getCurrentAppVersion(currentAppVersion);
    setCurrentAppVersion(version);
    localStorage.setItem(CURRENT_APP_VERSION_KEY, version);
    return version;
  }, [currentAppVersion]);

  useEffect(() => {
    refreshCurrentAppVersion();
  }, [refreshCurrentAppVersion]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let listenerHandle = null;
    const registerResumeHandler = async () => {
      listenerHandle = await CapacitorApp.addListener('resume', () => {
        refreshCurrentAppVersion();
      });
    };

    registerResumeHandler();
    return () => {
      listenerHandle?.remove();
    };
  }, [refreshCurrentAppVersion]);

  const checkForAppUpdate = useCallback(async ({ manual = false } = {}) => {
    if (isCheckingUpdateRef.current) return;
    isCheckingUpdateRef.current = true;
    if (manual) setUpdateCheckStatusText('Checking for updates…');
    setIsCheckingUpdate(true);

    try {
      const [version, latestRelease] = await Promise.all([
        refreshCurrentAppVersion(),
        fetchLatestRelease(),
      ]);

      localStorage.setItem(UPDATE_LAST_CHECK_KEY, String(Date.now()));

      if (!latestRelease.latestVersion) {
        if (manual) {
          setUpdateCheckStatusText('Could not read the latest release. Try again later.');
        }
        return;
      }

      const hasUpdate = compareVersions(latestRelease.latestVersion, version) > 0;
      if (!hasUpdate) {
        if (manual) {
          const message = `You are on the latest version (v${version}).`;
          setUpdateCheckStatusText(message);
        }
        return;
      }

      setUpdateInfo({
        ...latestRelease,
        currentVersion: version,
      });
      setUpdateDownloadedApkUri('');
      setUpdateDownloadedFileName('');
      setUpdateDownloadProgress(0);
      setUpdateDownloadBytesText('');
      setUpdateDownloadErrorText('');
      setIsUpdateModalOpen(true);

      if (manual) {
        setUpdateCheckStatusText(`Update available: ${latestRelease.latestTag}`);
      }
    } catch (error) {
      console.error('Update check failed:', error);
      if (manual) {
        setUpdateCheckStatusText('Update check failed. Check your connection and try again.');
      }
    } finally {
      isCheckingUpdateRef.current = false;
      setIsCheckingUpdate(false);
    }
  }, [refreshCurrentAppVersion]);

  const checkOnLaunch = useCallback(() => {
    if (!Capacitor.isNativePlatform()) return;

    const lastCheckAt = Number(localStorage.getItem(UPDATE_LAST_CHECK_KEY) || 0);
    const isDue = !lastCheckAt || Number.isNaN(lastCheckAt) || Date.now() - lastCheckAt >= UPDATE_CHECK_INTERVAL_MS;
    if (!isDue) return;

    checkForAppUpdate({ manual: false });
  }, [checkForAppUpdate]);

  const downloadUpdateWithFileTransfer = useCallback(async (url, targetPath) => {
    try {
      await Filesystem.mkdir({
        path: UPDATE_DOWNLOAD_FOLDER,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch {
      // Parent folder may already exist.
    }

    const destination = await Filesystem.getUri({
      path: targetPath,
      directory: Directory.Documents,
    });

    let progressListener = null;
    try {
      progressListener = await FileTransfer.addListener('progress', (progress) => {
        if (progress.type !== 'download') return;

        const loaded = Number(progress.bytes || 0);
        const total = Number(progress.contentLength || 0);
        if (progress.lengthComputable && total > 0) {
          setUpdateDownloadProgress(Math.round((loaded / total) * 100));
          setUpdateDownloadBytesText(`${formatBytes(loaded)} / ${formatBytes(total)}`);
        } else if (loaded > 0) {
          setUpdateDownloadBytesText(`${formatBytes(loaded)} downloaded`);
        }
      });

      await FileTransfer.downloadFile({
        url,
        path: destination.uri,
        progress: true,
        headers: GITHUB_DOWNLOAD_HEADERS,
      });
    } finally {
      await progressListener?.remove();
    }

    return destination.uri;
  }, []);

  const handleDownloadUpdate = async () => {
    if (!updateInfo?.apkUrl || isUpdateDownloading) return;

    setIsUpdateDownloading(true);
    setUpdateDownloadedApkUri('');
    setUpdateDownloadedFileName('');
    setUpdateDownloadProgress(0);
    setUpdateDownloadBytesText('');
    setUpdateDownloadErrorText('');

    const fileName = updateInfo.apkName || `MyBills-v${updateInfo.latestVersion}.apk`;
    const targetPath = `${UPDATE_DOWNLOAD_FOLDER}/${fileName}`;

    try {
      if (Capacitor.isNativePlatform()) {
        const downloadedUri = await downloadUpdateWithFileTransfer(updateInfo.apkUrl, targetPath);
        setUpdateDownloadProgress(100);
        setUpdateDownloadBytesText('Download complete');
        setUpdateDownloadedApkUri(downloadedUri);
        setUpdateDownloadedFileName(fileName);
        return;
      }

      // Browser XHR cannot follow GitHub release redirects (CORS). Open the asset URL directly.
      const anchor = document.createElement('a');
      anchor.href = updateInfo.apkUrl;
      anchor.download = fileName;
      anchor.rel = 'noopener noreferrer';
      anchor.target = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      setUpdateDownloadProgress(100);
      setUpdateDownloadBytesText('Download started in your browser');
      setUpdateDownloadedApkUri('browser-download');
      setUpdateDownloadedFileName(fileName);
    } catch (error) {
      console.error('Update download failed:', error);
      setUpdateDownloadErrorText('Update download failed. Try again on the Android app build.');
    } finally {
      setIsUpdateDownloading(false);
    }
  };

  const handleCancelUpdateDownload = () => {
    if (!Capacitor.isNativePlatform()) {
      setIsUpdateDownloading(false);
      setUpdateDownloadErrorText('Download cancelled.');
      return;
    }

    setUpdateDownloadErrorText('Cancel is not available during a native download.');
  };

  const handleInstallUpdate = async () => {
    if (!updateDownloadedApkUri) return;

    if (!Capacitor.isNativePlatform()) {
      if (updateInfo?.releaseUrl) {
        window.open(updateInfo.releaseUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    try {
      await Share.share({
        title: 'MyBills update',
        text: 'Choose Open or Package Installer to install the update APK.',
        url: updateDownloadedApkUri,
        dialogTitle: 'Install MyBills update',
      });
    } catch (error) {
      console.error('Update install handoff failed:', error);
      if (updateInfo?.releaseUrl) {
        window.open(updateInfo.releaseUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleCloseUpdateModal = useCallback(() => {
    if (isUpdateDownloading) return;
    setIsUpdateModalOpen(false);
  }, [isUpdateDownloading]);

  return {
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
  };
};
