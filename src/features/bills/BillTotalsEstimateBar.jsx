import { Activity, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BILL_CURRENCIES } from './billStorage.js';
import {
  formatRatesUpdatedAt,
  formatUsdComparisonRate,
} from '../../shared/currency/exchangeRates.js';

function CompactCurrencyPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsidePress = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [isOpen]);

  return (
    <div className="bill-totals-currency" ref={wrapperRef}>
      <button
        className="bill-totals-currency-trigger"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Estimate totals in ${value}`}
      >
        <span>{value}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="bill-totals-currency-menu" role="listbox" aria-label="Estimate currency">
          {BILL_CURRENCIES.map((currency) => (
            <button
              className={currency === value ? 'is-selected' : ''}
              type="button"
              role="option"
              aria-selected={currency === value}
              key={currency}
              onClick={() => {
                onChange(currency);
                setIsOpen(false);
              }}
            >
              {currency}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BillTotalsEstimateBar({ ratesState, currency, onCurrencyChange }) {
  const rateLine = (() => {
    if (ratesState.status === 'loading') return '1 USD = …';
    const comparison = formatUsdComparisonRate(currency, ratesState.rates);
    return comparison || '1 USD = --';
  })();

  const updatedLabel = (() => {
    if (ratesState.status === 'loading') return 'Updating rates';
    if (ratesState.status === 'unavailable') return 'Rates unavailable';
    if (ratesState.fetchedAt) {
      return `Updated ${formatRatesUpdatedAt(ratesState.fetchedAt)}`;
    }
    return 'Live rate';
  })();

  const rateStatus = ratesState.status === 'loading'
    ? 'loading'
    : ratesState.status === 'unavailable'
      ? 'offline'
      : 'live';

  return (
    <div className="bill-totals-estimate" aria-label="Bill total estimate">
      <section
        className="bill-totals-estimate-cell bill-totals-estimate-cell--rate"
        title={updatedLabel}
        aria-label={`USD rate, ${updatedLabel}`}
      >
        <div className="bill-totals-estimate-head">
          <span className="bill-totals-estimate-badge" aria-hidden="true">
            <Activity className="bill-totals-estimate-icon" />
          </span>
          <span className="bill-totals-estimate-kicker">USD rate</span>
          <span className={`bill-totals-estimate-status is-${rateStatus}`}>
            {rateStatus === 'loading' ? '…' : rateStatus === 'live' ? 'Live' : 'Off'}
          </span>
        </div>
        <p className="bill-totals-estimate-rate-line">{rateLine}</p>
      </section>
      <section className="bill-totals-estimate-cell bill-totals-estimate-cell--picker">
        <span className="bill-totals-estimate-kicker">Totals in</span>
        <CompactCurrencyPicker value={currency} onChange={onCurrencyChange} />
      </section>
    </div>
  );
}
