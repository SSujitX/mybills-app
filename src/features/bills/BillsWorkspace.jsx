import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Server,
  Trash2,
  X,
} from 'lucide-react';
import LiveDateTime from '../../components/layout/LiveDateTime.jsx';
import {
  getCachedExchangeRates,
  loadExchangeRates,
} from '../../shared/currency/exchangeRates.js';
import {
  getDateFormatOptions,
  getLocaleTag,
} from '../../shared/currency/localeDefaults.js';
import {
  loadShellPreferences,
  saveShellPreferences,
} from '../../shared/storage/shellPreferences.js';
import DisplayCurrencyBar from './DisplayCurrencyBar.jsx';
import { refreshBillNotifications } from './billNotifications.js';
import { formatMoney, summarizeBillMoney } from './billTotals.js';
import {
  BILL_CURRENCIES,
  createBillFromDraft,
  createEmptyBillDraft,
  loadBills,
  saveBills,
  toBillDraft,
  updateBillFromDraft,
} from './billStorage.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toLocalDay = (dateKey) => new Date(`${dateKey}T00:00:00`);

const getDaysUntil = (dateKey) => Math.ceil((toLocalDay(dateKey) - toLocalDay(getTodayKey())) / MS_PER_DAY);

const getTodayKey = () => {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
};

const formatDate = (dateKey) => new Intl.DateTimeFormat(
  getLocaleTag(),
  getDateFormatOptions(),
).format(new Date(`${dateKey}T12:00:00`));

const formatPrice = (bill) => new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: bill.currency,
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 2,
}).format(bill.price);

const getDueTone = (daysUntil) => {
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 3) return 'urgent';
  if (daysUntil <= 14) return 'near';
  return 'steady';
};

const getDueLabel = (daysUntil) => {
  if (daysUntil < 0) return `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} expired`;
  if (daysUntil === 0) return 'expires today';
  if (daysUntil === 1) return 'expires tomorrow';
  return `${daysUntil} days left`;
};

const MONTH_FORMATTER = new Intl.DateTimeFormat(getLocaleTag(), {
  month: 'long',
  year: 'numeric',
});

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(getLocaleTag(), {
  weekday: 'short',
});

const toDateKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

const getDateFromKey = (dateKey) => new Date(`${dateKey}T12:00:00`);

const getCalendarDays = (visibleMonth) => {
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date,
      key: toDateKey(date),
      isVisibleMonth: date.getMonth() === visibleMonth.getMonth(),
    };
  });
};

const getWeekdayLabels = () => Array.from({ length: 7 }, (_, index) => {
  const sunday = new Date(2026, 1, 1 + index, 12);
  return WEEKDAY_FORMATTER.format(sunday);
});

function DateField({ id, label, value, onChange }) {
  const selectedDate = getDateFromKey(value);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1,
    12,
  ));
  const wrapperRef = useRef(null);
  const lastWheelChangeRef = useRef(0);

  useEffect(() => {
    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12));
  }, [value]);

  useEffect(() => {
    if (!isPickerOpen) return undefined;

    const closeOnOutsidePress = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [isPickerOpen]);

  const moveMonth = (offset) => {
    setVisibleMonth((current) => new Date(
      current.getFullYear(),
      current.getMonth() + offset,
      1,
      12,
    ));
  };

  const moveYear = (offset) => {
    setVisibleMonth((current) => new Date(
      current.getFullYear() + offset,
      current.getMonth(),
      1,
      12,
    ));
  };

  const moveMonthOnWheel = (event) => {
    event.preventDefault();

    if (Math.abs(event.deltaY) < 8) return;

    const now = Date.now();
    if (now - lastWheelChangeRef.current < 180) return;

    lastWheelChangeRef.current = now;
    moveMonth(event.deltaY > 0 ? 1 : -1);
  };

  const selectDate = (dateKey) => {
    onChange(dateKey);
    setIsPickerOpen(false);
  };

  const calendarDays = getCalendarDays(visibleMonth);
  const today = getTodayKey();

  return (
    <div className="date-field" ref={wrapperRef}>
      <label htmlFor={id}>{label}</label>
      <div className="date-control">
        <CalendarDays aria-hidden="true" />
        <button
          className="date-value-btn"
          id={id}
          type="button"
          onClick={() => setIsPickerOpen((current) => !current)}
          aria-haspopup="dialog"
          aria-expanded={isPickerOpen}
        >
          {formatDate(value)}
        </button>
        <button
          className="date-picker-btn"
          type="button"
          onClick={() => setIsPickerOpen((current) => !current)}
          aria-label={`Select ${label.toLowerCase()}`}
          title={`Select ${label.toLowerCase()}`}
        >
          <CalendarDays aria-hidden="true" />
        </button>
      </div>

      {isPickerOpen && (
        <section
          className="bill-calendar"
          role="dialog"
          aria-label={`Select ${label.toLowerCase()}`}
          onWheel={moveMonthOnWheel}
        >
          <div className="calendar-head">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">
              <ChevronLeft aria-hidden="true" />
            </button>
            <strong>{MONTH_FORMATTER.format(visibleMonth)}</strong>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
          <div className="calendar-year-nav">
            <button type="button" onClick={() => moveYear(-1)} aria-label="Previous year">
              <ChevronsLeft aria-hidden="true" />
            </button>
            <span>{visibleMonth.getFullYear()}</span>
            <button type="button" onClick={() => moveYear(1)} aria-label="Next year">
              <ChevronsRight aria-hidden="true" />
            </button>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {getWeekdayLabels().map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((day) => (
              <button
                className={[
                  day.isVisibleMonth ? '' : 'outside-month',
                  day.key === value ? 'is-selected' : '',
                  day.key === today ? 'is-today' : '',
                ].filter(Boolean).join(' ')}
                type="button"
                key={day.key}
                onClick={() => selectDate(day.key)}
                aria-pressed={day.key === value}
              >
                {day.date.getDate()}
              </button>
            ))}
          </div>
          <div className="calendar-actions">
            <button type="button" onClick={() => selectDate(today)}>Today</button>
          </div>
        </section>
      )}
    </div>
  );
}

function CurrencyField({ value, onChange }) {
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

  return (
    <div className="currency-field" ref={wrapperRef}>
      <span className="field-label">Currency</span>
      <button
        className="currency-trigger"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{value}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="currency-menu" role="listbox" aria-label="Currency">
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
  );
}

export default function BillsWorkspace() {
  const [bills, setBills] = useState(() => loadBills());
  const [draft, setDraft] = useState(() => createEmptyBillDraft());
  const [shellPreferences, setShellPreferences] = useState(() => loadShellPreferences());
  const [ratesState, setRatesState] = useState({
    status: 'loading',
    rates: null,
    fetchedAt: null,
  });
  const [editingBillId, setEditingBillId] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [deleteBillId, setDeleteBillId] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    saveBills(bills);
    refreshBillNotifications();
  }, [bills]);

  useEffect(() => {
    let cancelled = false;

    const refreshRates = () => {
      const cached = getCachedExchangeRates();
      if (cached) {
        setRatesState({
          status: 'loading',
          rates: cached.rates,
          fetchedAt: cached.fetchedAt,
        });
      }

      loadExchangeRates().then((result) => {
        if (cancelled) return;

        setRatesState({
          status: result.status,
          rates: result.rates,
          fetchedAt: result.fetchedAt,
        });
      });
    };

    refreshRates();

    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') refreshRates();
    };

    document.addEventListener('visibilitychange', refreshOnVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, []);

  const moneySummary = useMemo(
    () => summarizeBillMoney(
      bills,
      shellPreferences.displayCurrency,
      ratesState.rates,
    ),
    [bills, shellPreferences.displayCurrency, ratesState.rates],
  );

  const formatConvertedTotal = (amount) => {
    if (ratesState.status === 'loading') return '…';
    if (amount === null || ratesState.status === 'unavailable') return '—';
    return formatMoney(amount, shellPreferences.displayCurrency);
  };

  const updateDisplayCurrency = (displayCurrency) => {
    const nextPreferences = saveShellPreferences({
      ...shellPreferences,
      displayCurrency,
    });
    setShellPreferences(nextPreferences);
  };

  const sortedBills = useMemo(() => [...bills].sort((left, right) => (
    left.expiryDate.localeCompare(right.expiryDate) || left.title.localeCompare(right.title)
  )), [bills]);

  const editingBill = bills.find((bill) => bill.id === editingBillId);

  const updateDraft = (field, value) => {
    if (formError) setFormError('');
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const resetComposer = () => {
    setDraft(createEmptyBillDraft());
    setEditingBillId('');
    setFormError('');
  };

  const openNewBill = () => {
    resetComposer();
    setIsComposerOpen(true);
  };

  const closeComposer = () => {
    resetComposer();
    setIsComposerOpen(false);
  };

  const submitBill = (event) => {
    event.preventDefault();

    const nextBill = editingBill
      ? updateBillFromDraft(editingBill, draft)
      : createBillFromDraft(draft);

    if (!nextBill) {
      setFormError('Title, price, purchase date, and next expiry are required.');
      return;
    }

    setBills((current) => editingBill
      ? current.map((bill) => (bill.id === editingBill.id ? nextBill : bill))
      : [...current, nextBill]);
    closeComposer();
  };

  const editBill = (bill) => {
    setEditingBillId(bill.id);
    setDraft(toBillDraft(bill));
    setFormError('');
    setIsComposerOpen(true);
  };

  const deleteCandidate = bills.find((bill) => bill.id === deleteBillId);

  const requestDeleteBill = (bill) => {
    setDeleteBillId(bill.id);
  };

  const cancelDeleteBill = () => {
    setDeleteBillId('');
  };

  const confirmDeleteBill = () => {
    if (!deleteCandidate) return;

    setBills((current) => current.filter((item) => item.id !== deleteCandidate.id));
    if (editingBillId === deleteCandidate.id) closeComposer();
    setDeleteBillId('');
  };

  return (
    <section className="bill-workspace" aria-label="Recurring bill ledger">
      <LiveDateTime />

      <DisplayCurrencyBar
        value={shellPreferences.displayCurrency}
        onChange={updateDisplayCurrency}
        ratesStatus={ratesState.status}
        ratesUpdatedAt={ratesState.fetchedAt}
        usdRates={ratesState.rates}
      />

      <div className="ledger-intro">
        <div>
          <h1>Bills</h1>
        </div>
        <button className="add-bill-command" type="button" onClick={openNewBill}>
          <Plus aria-hidden="true" />
          Add bill
        </button>
        <dl className="ledger-marks" aria-label="Bill totals">
          <div>
            <dt>Total bills</dt>
            <dd>{moneySummary.count}</dd>
          </div>
          <div>
            <dt>Total bill value</dt>
            <dd className="ledger-money">{formatConvertedTotal(moneySummary.totalAll)}</dd>
          </div>
          <div>
            <dt>Total bill due</dt>
            <dd className="ledger-money">{formatConvertedTotal(moneySummary.totalDueSoon)}</dd>
            <small>{moneySummary.dueSoonCount} due soon</small>
          </div>
          <div>
            <dt>Total expired</dt>
            <dd className="ledger-money">{formatConvertedTotal(moneySummary.totalExpired)}</dd>
            <small>{moneySummary.expiredCount} expired</small>
          </div>
        </dl>
      </div>

      <div className="ledger-layout">
        <section className="bill-rail" aria-label="Saved bills">
          <div className="rail-head">
            <ReceiptText aria-hidden="true" />
            <h2>Saved bills</h2>
          </div>

          {sortedBills.length === 0 ? (
            <div className="rail-empty">
              <Server aria-hidden="true" />
              <strong>No bills yet.</strong>
            </div>
          ) : sortedBills.map((bill) => {
            const daysUntil = getDaysUntil(bill.expiryDate);
            const tone = getDueTone(daysUntil);

            return (
              <article className={`bill-ticket ${tone}`} key={bill.id}>
                <div className="ticket-focus">
                  <div className="ticket-lead">
                    <h3 className="ticket-heading">{bill.title}</h3>
                    <span className="ticket-due-badge">{getDueLabel(daysUntil)}</span>
                  </div>
                  <p className={`ticket-details${bill.details ? '' : ' is-empty'}`}>
                    {bill.details || 'No details added.'}
                  </p>
                </div>
                <div className="ticket-side">
                  <dl className="ticket-facts">
                    <div>
                      <dt>Amount</dt>
                      <dd>{formatPrice(bill)}</dd>
                    </div>
                    <div>
                      <dt>Currency</dt>
                      <dd className="ticket-fact-currency">{bill.currency}</dd>
                    </div>
                    <div>
                      <dt>Purchased</dt>
                      <dd>{formatDate(bill.boughtDate)}</dd>
                    </div>
                    <div>
                      <dt>Expires</dt>
                      <dd className="ticket-fact-expiry">{formatDate(bill.expiryDate)}</dd>
                    </div>
                  </dl>
                  <div className="ticket-tools">
                    <button type="button" onClick={() => editBill(bill)} aria-label={`Edit ${bill.title}`} title="Edit bill">
                      <Pencil aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                    <button type="button" onClick={() => requestDeleteBill(bill)} aria-label={`Delete ${bill.title}`} title="Delete bill">
                      <Trash2 aria-hidden="true" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>

      {isComposerOpen && (
        <div className="composer-backdrop">
          <section className="composer-dialog" role="dialog" aria-modal="true" aria-labelledby="bill-composer-title">
            <form className="bill-composer" onSubmit={submitBill}>
              <div className="composer-head">
                <div>
                  <h2 id="bill-composer-title">{editingBill ? 'Edit bill' : 'Add bill'}</h2>
                </div>
                <button className="ghost-icon-btn" type="button" onClick={closeComposer} aria-label="Close bill form" title="Close">
                  <X aria-hidden="true" />
                </button>
              </div>

              <label>
                Title
                <input
                  value={draft.title}
                  onChange={(event) => updateDraft('title', event.target.value)}
                  placeholder="Hetzner server"
                  required
                />
              </label>

              <label className="bill-details-field">
                Details
                <div className="bill-details-shell">
                  <textarea
                    className="bill-details-input"
                    value={draft.details}
                    onChange={(event) => updateDraft('details', event.target.value)}
                    placeholder="Cloud VM for production API, monthly renewal."
                    rows="4"
                    spellCheck="true"
                  />
                </div>
              </label>

              <div className="price-row">
                <label>
                  Price
                  <input
                    className="bill-price-input"
                    min="0"
                    step="0.01"
                    type="number"
                    inputMode="decimal"
                    value={draft.price}
                    onChange={(event) => updateDraft('price', event.target.value)}
                    placeholder="12.99"
                    required
                  />
                </label>
                <CurrencyField
                  value={draft.currency}
                  onChange={(value) => updateDraft('currency', value)}
                />
              </div>

              <div className="date-row">
                <DateField
                  id="bill-purchased-date"
                  label="Purchased"
                  value={draft.boughtDate}
                  onChange={(value) => updateDraft('boughtDate', value)}
                />
                <DateField
                  id="bill-expiry-date"
                  label="Next expiry"
                  value={draft.expiryDate}
                  onChange={(value) => updateDraft('expiryDate', value)}
                />
              </div>

              {formError && <p className="form-error" role="alert">{formError}</p>}

              <button className="save-bill-btn" type="submit">
                {editingBill ? <Save aria-hidden="true" /> : <CalendarPlus aria-hidden="true" />}
                {editingBill ? 'Save changes' : 'Save bill'}
              </button>
            </form>
          </section>
        </div>
      )}

      {deleteCandidate && (
        <div className="composer-backdrop">
          <section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-bill-title">
            <button className="ghost-icon-btn delete-close-btn" type="button" onClick={cancelDeleteBill} aria-label="Close delete warning" title="Close">
              <X aria-hidden="true" />
            </button>
            <div className="delete-mark">
              <Trash2 aria-hidden="true" />
            </div>
            <h2 id="delete-bill-title">Delete bill?</h2>
            <p><strong>{deleteCandidate.title}</strong> will be removed from your saved bills.</p>
            <div className="delete-actions">
              <button type="button" onClick={cancelDeleteBill}>Cancel</button>
              <button type="button" onClick={confirmDeleteBill}>Delete bill</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
