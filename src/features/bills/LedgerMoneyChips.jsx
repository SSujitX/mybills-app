import { formatMoney } from './billTotals.js';

function getCurrencyEntries(totalsByCurrency) {
  return Object.entries(totalsByCurrency || {})
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
    .sort(([left], [right]) => left.localeCompare(right));
}

export default function LedgerMoneyChips({
  totalsByCurrency,
  kicker = 'Original',
  variant = 'bills',
}) {
  const entries = getCurrencyEntries(totalsByCurrency);
  if (entries.length === 0) return null;

  const chipClassName = variant === 'spent'
    ? 'ledger-money-chips ledger-money-chips--spent'
    : 'ledger-money-chips';

  return (
    <div className={chipClassName} aria-label={`${kicker} totals by currency`}>
      <span className="ledger-money-chips-kicker">{kicker}</span>
      {entries.map(([currency, amount]) => (
        <span className="ledger-money-chip" key={currency}>
          {formatMoney(amount, currency)}
        </span>
      ))}
    </div>
  );
}
