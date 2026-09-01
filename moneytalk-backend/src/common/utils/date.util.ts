const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

export function getDayRangeInUtc(date: string): { start: Date; end: Date } {
  // date format: YYYY-MM-DD — interpreted as calendar day in Vietnam
  const start = new Date(`${date}T00:00:00+07:00`);
  const end = new Date(`${date}T23:59:59.999+07:00`);
  return { start, end };
}

export function getDateRangeInUtc(from: string, to: string): {
  start: Date;
  end: Date;
} {
  const start = new Date(`${from}T00:00:00+07:00`);
  const end = new Date(`${to}T23:59:59.999+07:00`);
  return { start, end };
}

export function formatDateInVn(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
