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

export function getKolkataTimeDetails(date: Date) {
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
  
  const parts = formatter.formatToParts(date);
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

export function isWorkingHours(date: Date) {
  // TEMPORARILY DISABLED: Allow 24/7 working hours
  return true;
  // const details = getKolkataTimeDetails(date);
  // return details.hour >= 7 && details.hour < 19;
}

export function getKolkataDateOnly(date: Date) {
  const details = getKolkataTimeDetails(date);
  return new Date(Date.UTC(details.year, details.month - 1, details.day));
}

export function getKolkataStartOfDay(date?: Date | string) {
  const d = date ? new Date(date) : getCurrentKolkataTime();
  const details = getKolkataTimeDetails(d);
  const utcMillis = Date.UTC(details.year, details.month - 1, details.day, 0, 0, 0, 0);
  return new Date(utcMillis - (5.5 * 60 * 60 * 1000));
}

export function getKolkataEndOfDay(date?: Date | string) {
  const d = date ? new Date(date) : getCurrentKolkataTime();
  const details = getKolkataTimeDetails(d);
  const utcMillis = Date.UTC(details.year, details.month - 1, details.day, 23, 59, 59, 999);
  return new Date(utcMillis - (5.5 * 60 * 60 * 1000));
}

export function getKolkataMonthBoundaries(year: number, month: number) {
  const utcStart = Date.UTC(year, month - 1, 1, 0, 0, 0, 0);
  const utcEnd = Date.UTC(year, month, 0, 23, 59, 59, 999);
  return {
    start: new Date(utcStart - (5.5 * 60 * 60 * 1000)),
    end: new Date(utcEnd - (5.5 * 60 * 60 * 1000))
  };
}

export function formatKolkataVisitTime(date?: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const timeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
  return `Today, ${timeStr}`;
}
