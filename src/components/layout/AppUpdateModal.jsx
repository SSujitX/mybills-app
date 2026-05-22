export default function AppUpdateModal({
  updateInfo,
  isUpdateDownloading,
  updateDownloadProgress,
  updateDownloadBytesText,
  updateDownloadedApkUri,
  updateDownloadedFileName,
  updateDownloadErrorText,
  onDownload,
  onCancelDownload,
  onInstall,
  onClose,
}) {
  if (!updateInfo) return null;

  return (
    <div
      className="composer-backdrop update-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="update-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-update-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="app-update-title" className="update-modal-title">Update available</h2>
        <p className="update-version-line">
          Current version: <strong>v{updateInfo.currentVersion || '0.0.0'}</strong>
        </p>
        <p className="update-version-line">
          Latest version: <strong>{updateInfo.latestTag}</strong>
        </p>

        {updateInfo.releaseNotes && (
          <div className="update-notes-box">
            <p>{updateInfo.releaseNotes.split('\n').slice(0, 5).join('\n')}</p>
          </div>
        )}

        {isUpdateDownloading && (
          <div className="update-progress-wrap">
            <div className="update-progress-bar">
              <div
                className="update-progress-fill"
                style={{ width: `${Math.max(2, updateDownloadProgress)}%` }}
              />
            </div>
            <p className="update-progress-text">
              Downloading: {updateDownloadProgress}%
              {updateDownloadBytesText ? ` (${updateDownloadBytesText})` : ''}
            </p>
          </div>
        )}

        {updateDownloadedApkUri && (
          <p className="settings-status update-download-done">
            Download complete: {updateDownloadedFileName}
          </p>
        )}
        {!updateDownloadedApkUri && updateDownloadErrorText && (
          <p className="settings-status update-download-error" role="alert">
            {updateDownloadErrorText}
          </p>
        )}

        <div className="update-modal-actions">
          {!updateDownloadedApkUri ? (
            <button
              type="button"
              className="settings-test-btn"
              onClick={onDownload}
              disabled={isUpdateDownloading || !updateInfo.apkUrl}
            >
              {isUpdateDownloading ? 'Downloading…' : 'Download update'}
            </button>
          ) : (
            <button
              type="button"
              className="settings-test-btn"
              onClick={onInstall}
            >
              Install update
            </button>
          )}

          {isUpdateDownloading && (
            <button
              type="button"
              className="settings-update-secondary-btn"
              onClick={onCancelDownload}
            >
              Cancel download
            </button>
          )}

          <button
            type="button"
            className="settings-update-secondary-btn"
            onClick={onClose}
            disabled={isUpdateDownloading}
          >
            Later
          </button>
        </div>
      </section>
    </div>
  );
}
