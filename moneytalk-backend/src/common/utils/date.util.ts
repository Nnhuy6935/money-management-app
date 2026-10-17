const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VN_OFFSET = '+07:00';

/** Đầu ngày YYYY-MM-DD theo giờ Việt Nam, dạng instant UTC. */
export function startOfVnDay(date: string): Date {
  return new Date(`${date}T00:00:00${VN_OFFSET}`);
}

export function getDayRangeInUtc(date: string): { start: Date; end: Date } {
  // date format: YYYY-MM-DD — interpreted as calendar day in Vietnam
  const start = startOfVnDay(date);
  const end = new Date(`${date}T23:59:59.999${VN_OFFSET}`);
  return { start, end };
}

/** `to` inclusive: hết ngày `to` giờ VN. */
export function getDateRangeInUtc(
  from: string,
  to: string,
): {
  start: Date;
  end: Date;
} {
  const start = startOfVnDay(from);
  const end = new Date(`${to}T23:59:59.999${VN_OFFSET}`);
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

export type PeriodType = 'week' | 'month' | 'year';

/** Ngày lịch (không giờ), tính toán bằng UTC để tránh lệch timezone máy chủ. */
type CalendarDate = { y: number; m: number; d: number };

function parseCalendarDate(date: string): CalendarDate {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

function toIsoDate({ y, m, d }: CalendarDate): string {
  const value = new Date(Date.UTC(y, m - 1, d));
  return value.toISOString().slice(0, 10);
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const value = new Date(Date.UTC(date.y, date.m - 1, date.d + days));
  return {
    y: value.getUTCFullYear(),
    m: value.getUTCMonth() + 1,
    d: value.getUTCDate(),
  };
}

/**
 * Kỳ chứa `date` (giờ VN), dạng [start, end) theo ngày lịch YYYY-MM-DD.
 * week: thứ Hai → thứ Hai kế; month: mùng 1 → mùng 1 tháng sau; year: 1/1 → 1/1 năm sau.
 */
export function getPeriodBounds(
  periodType: PeriodType,
  date: string,
): { start: string; end: string } {
  const day = parseCalendarDate(date);

  if (periodType === 'week') {
    const weekday = new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay();
    const sinceMonday = (weekday + 6) % 7;
    const start = addDays(day, -sinceMonday);
    return { start: toIsoDate(start), end: toIsoDate(addDays(start, 7)) };
  }

  if (periodType === 'month') {
    return {
      start: toIsoDate({ y: day.y, m: day.m, d: 1 }),
      end: toIsoDate({ y: day.y, m: day.m + 1, d: 1 }),
    };
  }

  return {
    start: toIsoDate({ y: day.y, m: 1, d: 1 }),
    end: toIsoDate({ y: day.y + 1, m: 1, d: 1 }),
  };
}

/** Kỳ cùng loại ngay trước kỳ chứa `date`. */
export function getPreviousPeriodBounds(
  periodType: PeriodType,
  date: string,
): { start: string; end: string } {
  const current = getPeriodBounds(periodType, date);
  const dayBefore = toIsoDate(addDays(parseCalendarDate(current.start), -1));
  return getPeriodBounds(periodType, dayBefore);
}

export const VN_TIMEZONE_NAME = VN_TIMEZONE;
