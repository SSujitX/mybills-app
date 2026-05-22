import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
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

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const result = String(reader.result || '');
    const base64Data = result.includes(',') ? result.split(',')[1] : result;
    resolve(base64Data);
  };
  reader.onerror = () => reject(new Error('blob-read-failed'));
  reader.readAsDataURL(blob);
});

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
  const updateDownloadRequestRef = useRef(null);

  useEffect(() => () => {
    if (updateDownloadRequestRef.current) {
      updateDownloadRequestRef.current.abort();
      updateDownloadRequestRef.current = null;
    }
  }, []);

  const checkForAppUpdate = useCallback(async ({ manual = false } = {}) => {
    if (isCheckingUpdateRef.current) return;
    isCheckingUpdateRef.current = true;
    if (manual) setUpdateCheckStatusText('Checking for updates…');
    setIsCheckingUpdate(true);

    try {
      const [version, latestRelease] = await Promise.all([
        getCurrentAppVersion(currentAppVersion),
        fetchLatestRelease(),
      ]);

      setCurrentAppVersion(version);
      localStorage.setItem(CURRENT_APP_VERSION_KEY, version);
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
  }, [currentAppVersion]);

  const checkOnLaunch = useCallback(() => {
    if (!Capacitor.isNativePlatform()) return;

    const lastCheckAt = Number(localStorage.getItem(UPDATE_LAST_CHECK_KEY) || 0);
    const isDue = !lastCheckAt || Number.isNaN(lastCheckAt) || Date.now() - lastCheckAt >= UPDATE_CHECK_INTERVAL_MS;
    if (!isDue) return;

    checkForAppUpdate({ manual: false });
  }, [checkForAppUpdate]);

  const downloadApkBlob = useCallback((url) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    updateDownloadRequestRef.current = xhr;
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onprogress = (event) => {
      if (!event.lengthComputable) return;
      setUpdateDownloadProgress(Math.round((event.loaded / event.total) * 100));
      setUpdateDownloadBytesText(`${formatBytes(event.loaded)} / ${formatBytes(event.total)}`);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
        return;
      }
      reject(new Error(`download-failed-${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('download-network-error'));
    xhr.onabort = () => reject(new Error('download-aborted'));
    xhr.send();
  }), []);

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
      if (Capacitor.isNativePlatform() && typeof Filesystem.downloadFile === 'function') {
        let progressListener = null;

        try {
          progressListener = await Filesystem.addListener('progress', (event) => {
            const total = Number(event?.contentLength || 0);
            const loaded = Number(event?.bytes || 0);
            if (total > 0) {
              setUpdateDownloadProgress(Math.round((loaded / total) * 100));
              setUpdateDownloadBytesText(`${formatBytes(loaded)} / ${formatBytes(total)}`);
            } else if (loaded > 0) {
              setUpdateDownloadBytesText(`${formatBytes(loaded)} downloaded`);
            }
          });
        } catch {
          progressListener = null;
        }

        await Filesystem.downloadFile({
          url: updateInfo.apkUrl,
          path: targetPath,
          directory: Directory.Documents,
          recursive: true,
          progress: true,
        });

        if (progressListener) {
          await progressListener.remove();
        }

        const fileUri = await Filesystem.getUri({
          path: targetPath,
          directory: Directory.Documents,
        });

        setUpdateDownloadProgress(100);
        setUpdateDownloadBytesText('Download complete');
        setUpdateDownloadedApkUri(fileUri.uri);
        setUpdateDownloadedFileName(fileName);
        return;
      }

      const apkBlob = await downloadApkBlob(updateInfo.apkUrl);

      if (Capacitor.isNativePlatform()) {
        const base64Data = await blobToBase64(apkBlob);
        await Filesystem.writeFile({
          path: targetPath,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
        const fileUri = await Filesystem.getUri({
          path: targetPath,
          directory: Directory.Documents,
        });
        setUpdateDownloadedApkUri(fileUri.uri);
      } else {
        const objectUrl = URL.createObjectURL(apkBlob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(objectUrl);
        setUpdateDownloadedApkUri('browser-download');
      }

      setUpdateDownloadProgress(100);
      setUpdateDownloadBytesText('Download complete');
      setUpdateDownloadedFileName(fileName);
    } catch (error) {
      console.error('Update download failed:', error);
      const isAborted = String(error?.message || '').includes('aborted');
      setUpdateDownloadErrorText(
        isAborted ? 'Download cancelled.' : 'Update download failed. Try again.',
      );
    } finally {
      updateDownloadRequestRef.current = null;
      setIsUpdateDownloading(false);
    }
  };

  const handleCancelUpdateDownload = () => {
    const request = updateDownloadRequestRef.current;
    if (!request) return;
    request.abort();
    updateDownloadRequestRef.current = null;
    setIsUpdateDownloading(false);
    setUpdateDownloadErrorText('Download cancelled.');
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
