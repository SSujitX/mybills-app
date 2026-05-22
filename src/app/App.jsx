import { useEffect } from 'react';
import AppFooter from '../components/layout/AppFooter.jsx';
import AppHeader from '../components/layout/AppHeader.jsx';
import AppSettings from '../components/layout/AppSettings.jsx';
import { refreshBillNotifications } from '../features/bills/billNotifications.js';
import BillsWorkspace from '../features/bills/BillsWorkspace.jsx';

export default function App() {
  useEffect(() => {
    refreshBillNotifications();
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
