function parseToValidDate(input?: Date | string | null): Date {
  if (!input) return getCurrentKolkataTime();
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? getCurrentKolkataTime() : input;
  }
  const str = String(input).trim();
  if (!str || str === 'undefined' || str === 'null') {
    return getCurrentKolkataTime();
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? getCurrentKolkataTime() : parsed;
}

export function getCurrentKolkataTime() {
  if (process.env.DEV_TIME_OVERRIDE) {
    const [hours, minutes] = process.env.DEV_TIME_OVERRIDE.split(':').map(Number);
    const date = new Date();
    // Setting UTC hours as an approximation for dev override
    date.setUTCHours(hours - 5, minutes - 30, 0, 0); // Reverse Kolkata offset (UTC+5:30)
    return date;
  }
  return new Date();
}

export function getKolkataTimeDetails(date?: Date | string | null) {
  const d = parseToValidDate(date);
  // Use Intl.DateTimeFormat to reliably extract parts in Asia/Kolkata
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  
  const parts = formatter.formatToParts(d);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

export function isWorkingHours(date?: Date | string | null) {
  const details = getKolkataTimeDetails(date);
  return details.hour >= 7 && details.hour < 19;
}

export function getKolkataDateOnly(date?: Date | string | null) {
  const details = getKolkataTimeDetails(date);
  return new Date(Date.UTC(details.year, details.month - 1, details.day));
}

export function getKolkataDateString(date: Date = getCurrentKolkataTime()): string {
  const details = getKolkataTimeDetails(date);
  const mm = String(details.month).padStart(2, '0');
  const dd = String(details.day).padStart(2, '0');
  return `${details.year}-${mm}-${dd}`;
}

export function getKolkataStartOfDay(date?: Date | string | null) {
  const d = parseToValidDate(date);
  const details = getKolkataTimeDetails(d);
  const utcMillis = Date.UTC(details.year, details.month - 1, details.day, 0, 0, 0, 0);
  return new Date(utcMillis - (5.5 * 60 * 60 * 1000));
}

export function getKolkataEndOfDay(date?: Date | string | null) {
  const d = parseToValidDate(date);
  const details = getKolkataTimeDetails(d);
  const utcMillis = Date.UTC(details.year, details.month - 1, details.day, 23, 59, 59, 999);
  return new Date(utcMillis - (5.5 * 60 * 60 * 1000));
}

export function getKolkataMonthBoundaries(year: number, month: number) {
  const safeYear = isNaN(year) ? getKolkataTimeDetails().year : year;
  const safeMonth = isNaN(month) ? getKolkataTimeDetails().month : month;
  const utcStart = Date.UTC(safeYear, safeMonth - 1, 1, 0, 0, 0, 0);
  const utcEnd = Date.UTC(safeYear, safeMonth, 0, 23, 59, 59, 999);
  return {
    start: new Date(utcStart - (5.5 * 60 * 60 * 1000)),
    end: new Date(utcEnd - (5.5 * 60 * 60 * 1000))
  };
}

export function formatKolkataVisitTime(date?: Date | string | null): string {
  if (!date) return '';
  const d = parseToValidDate(date);
  try {
    const timeStr = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(d);
    return `Today, ${timeStr}`;
  } catch {
    return '';
  }
}
