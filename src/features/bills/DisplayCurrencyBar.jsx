import { useEffect, useRef, useState } from 'react';
import { Activity, ChevronDown, Globe } from 'lucide-react';
import { BILL_CURRENCIES } from './billStorage.js';
import {
  formatRatesUpdatedAt,
  formatUsdComparisonRate,
} from '../../shared/currency/exchangeRates.js';

export default function DisplayCurrencyBar({
  value,
  onChange,
  ratesStatus,
  ratesUpdatedAt,
  usdRates,
}) {
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

  const selectCurrency = (currency) => {
    onChange(currency);
    setIsOpen(false);
  };

  const usdComparison = formatUsdComparisonRate(value, usdRates);

  const statusText = (() => {
    if (ratesStatus === 'loading') return 'Fetching latest exchange rates...';
    if (ratesStatus === 'unavailable') return 'Rates unavailable. Totals may be hidden.';
    if (ratesStatus === 'cached') {
      return `Using cached rates from ${formatRatesUpdatedAt(ratesUpdatedAt)}`;
    }
    if (ratesUpdatedAt) {
      return `Rates updated ${formatRatesUpdatedAt(ratesUpdatedAt)}`;
    }
    return 'Live exchange rate';
  })();

  const rateLine = (() => {
    if (ratesStatus === 'loading') return '1 USD = ...';
    if (!usdComparison) return '1 USD = --';
    return usdComparison;
  })();

  return (
    <section className="display-currency-bar" aria-label="Global currency">
      <div className="display-currency-top">
        <div className="display-currency-copy">
          <Globe aria-hidden="true" />
          <span className="display-currency-label">Currency</span>
        </div>
        <div className="display-currency-picker" ref={wrapperRef}>
          <button
            className="display-currency-trigger"
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span>{value}</span>
            <ChevronDown aria-hidden="true" />
          </button>
          {isOpen && (
            <div className="display-currency-menu" role="listbox" aria-label="Global currency">
              {BILL_CURRENCIES.map((currency) => (
                <button
                  className={currency === value ? 'is-selected' : ''}
                  type="button"
                  role="option"
                  aria-selected={currency === value}
                  key={currency}
                  onClick={() => selectCurrency(currency)}
                >
                  {currency}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="display-currency-monitor">
        <div className="rate-monitor-copy">
          <Activity aria-hidden="true" />
          <div>
            <span>Dollar monitor</span>
            <p>{statusText}</p>
          </div>
        </div>
        <strong>{rateLine}</strong>
      </div>
    </section>
  );
}
