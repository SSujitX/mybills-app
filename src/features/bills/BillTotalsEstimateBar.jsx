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

  return (
    <div className="bill-totals-estimate" aria-label="Bill total estimate">
      <div className="bill-totals-estimate-rate" title={updatedLabel}>
        <Activity aria-hidden="true" className="bill-totals-estimate-icon" />
        <div className="bill-totals-estimate-rate-copy">
          <span className="bill-totals-estimate-kicker">USD rate</span>
          <strong className="bill-totals-estimate-pill">{rateLine}</strong>
        </div>
      </div>
      <div className="bill-totals-estimate-picker">
        <span className="bill-totals-estimate-label">Totals in</span>
        <CompactCurrencyPicker value={currency} onChange={onCurrencyChange} />
      </div>
    </div>
  );
}
