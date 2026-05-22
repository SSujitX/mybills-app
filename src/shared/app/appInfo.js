import { Capacitor } from '@capacitor/core';
import capacitorConfig from '../../../capacitor.config.json';

export const APP_NAME = capacitorConfig.appName || 'MyBills';
export const APP_ID = capacitorConfig.appId || 'com.mybills.app';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';

export const getAppPlatformLabel = () => {
  if (!Capacitor.isNativePlatform()) return 'Web';
  return Capacitor.getPlatform();
};

export const APP_UPDATE_NOTE = 'Install the latest signed Android release build to update MyBills.';
