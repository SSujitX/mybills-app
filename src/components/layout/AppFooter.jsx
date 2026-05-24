const START_YEAR = 2026;

export default function AppFooter() {
  const currentYear = new Date().getFullYear();
  const yearText = currentYear > START_YEAR ? `${START_YEAR}-${currentYear}` : START_YEAR;

  return (
    <footer className="app-footer">
      <p>Copyright {yearText} MyBills.</p>
      <p>
        Built by{' '}
        <a href="https://github.com/SSujitX" target="_blank" rel="noreferrer">
          Sujit Biswas
        </a>
        .
      </p>
    </footer>
  );
}
