import LiveDateTime from './LiveDateTime.jsx';

export default function AppHeader() {
  const scrollHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <button
          className="app-header-brand"
          type="button"
          onClick={scrollHome}
          aria-label="Return to MyBills top"
        >
          <span className="app-header-logo-wrap" aria-hidden="true">
            <img src="/mybills-logo.png" alt="" className="app-header-logo" />
          </span>
          <strong className="app-header-title">MyBills</strong>
        </button>
        <LiveDateTime />
      </div>
    </header>
  );
}
