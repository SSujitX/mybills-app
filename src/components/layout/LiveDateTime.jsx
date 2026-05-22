import { useEffect, useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import {
  getDateFormatOptions,
  getLocaleTag,
  getTimeFormatOptions,
} from '../../shared/currency/localeDefaults.js';

export default function LiveDateTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const date = new Intl.DateTimeFormat(getLocaleTag(), {
    weekday: 'short',
    ...getDateFormatOptions(),
  }).format(now);

  const time = new Intl.DateTimeFormat(getLocaleTag(), getTimeFormatOptions()).format(now);

  return (
    <div className="live-datetime" aria-label={`${date}, ${time}`}>
      <span>
        <CalendarDays aria-hidden="true" />
        {date}
      </span>
      <i aria-hidden="true" />
      <span className="live-time">
        <Clock3 aria-hidden="true" />
        {time}
      </span>
    </div>
  );
}
