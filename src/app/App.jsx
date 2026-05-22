import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import AppFooter from '../components/layout/AppFooter.jsx';
import AppHeader from '../components/layout/AppHeader.jsx';
import AppSettings from '../components/layout/AppSettings.jsx';
import { refreshBillNotifications } from '../features/bills/billNotifications.js';
import BillsWorkspace from '../features/bills/BillsWorkspace.jsx';

export default function App() {
  useEffect(() => {
    refreshBillNotifications();
  }, []);

  useEffect(() => {
    const setupSystemBars = async () => {
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

      await StatusBar.show();
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: '#07070a' });
      await StatusBar.setStyle({ style: Style.Dark });
    };

    setupSystemBars();
  }, []);

  return (
    <div className="app-container">
      <AppHeader />
      <main className="app-main">
        <BillsWorkspace />
      </main>
      <AppSettings />
      <AppFooter />
    </div>
  );
}
