import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
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

  const ratesHint = (() => {
    if (ratesStatus === 'loading') return 'Fetching latest exchange rates…';
    if (ratesStatus === 'unavailable') return 'Rates unavailable. Totals may be hidden.';
    if (ratesStatus === 'cached') {
      return `Using cached rates from ${formatRatesUpdatedAt(ratesUpdatedAt)} · compared to USD`;
    }
    if (ratesUpdatedAt) {
      return `Rates updated ${formatRatesUpdatedAt(ratesUpdatedAt)} · compared to USD`;
    }
    return 'Live rates from ExchangeRate-API · compared to USD';
  })();

  const rateLine = (() => {
    if (ratesStatus === 'loading') return '1 USD = …';
    if (!usdComparison) return '1 USD = —';
    return usdComparison;
  })();

  return (
    <section className="display-currency-bar" aria-label="Display currency settings">
      <div className="display-currency-copy">
        <Globe aria-hidden="true" />
        <div>
          <span className="display-currency-label">View totals in</span>
          <p className="display-currency-hint">{ratesHint}</p>
          <p className="display-currency-rate">
            <span className="display-currency-rate-label">USD rate</span>
            <strong>{rateLine}</strong>
          </p>
        </div>
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
          <div className="display-currency-menu" role="listbox" aria-label="Display currency">
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
    </section>
  );
}
