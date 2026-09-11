import {
  calendarActionsBelowMinH, calendarTimeMinH, calendarTimeMinW,
} from '../../../Tokens.generated';

export interface ArenaZonedParts {
  y: number;
  m: number;
  d: number;
  hh: number;
  mm: number;
}

export interface EventTimes {
  readonly id: string;
  readonly start: string;
  readonly end: string;
}

export interface ArenaPlacement<T> {
  readonly ev: T;
  readonly dayIso: string;
  readonly startMin: number;
  readonly endMin: number;
}

export interface ArenaLaidOut<T> extends ArenaPlacement<T> {
  readonly col: number;
  readonly cols: number;
}

export function arenaShowsTime(chipHeight: number, slotWidth: number | null): boolean {
  if (chipHeight < calendarTimeMinH) return false;
  return slotWidth === null || slotWidth >= calendarTimeMinW;
}

export function arenaStacksActions(chipHeight: number, slotWidth: number | null): boolean {
  return chipHeight >= calendarActionsBelowMinH && !arenaShowsTime(chipHeight, slotWidth);
}

const warned = new Set<string>();

function arenaWarnOnce(message: string): void {
  if (warned.has(message) || typeof console === 'undefined') return;
  warned.add(message);
  console.warn('[arena] ' + message);
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) return cached;
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    if (timeZone === 'UTC') throw new Error('[arena] calendar: Intl rejected UTC.');
    arenaWarnOnce(`calendar: unknown timeZone "${timeZone}" — falling back to UTC.`);
    formatter = partsFormatter('UTC');
  }
  formatters.set(timeZone, formatter);
  return formatter;
}

export function arenaZonedParts(iso: string | null | undefined, timeZone: string): ArenaZonedParts | null {
  const at = new Date(iso ?? '');
  if (Number.isNaN(at.getTime())) return null;
  const out: Record<string, string> = {};
  for (const part of partsFormatter(timeZone).formatToParts(at)) {
    if (part.type !== 'literal') out[part.type] = part.value;
  }
  return {
    y: Number(out['year']), m: Number(out['month']), d: Number(out['day']),
    hh: Number(out['hour']), mm: Number(out['minute']),
  };
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

export const arenaIsoDateOf = (p: ArenaZonedParts): string =>
  `${String(p.y).padStart(4, '0')}-${pad2(p.m)}-${pad2(p.d)}`;

export const arenaMinutesOf = (p: ArenaZonedParts): number => p.hh * 60 + p.mm;

export const arenaFormatHM = (min: number): string =>
  `${pad2(Math.floor(min / 60) % 24)}:${pad2(Math.round(min) % 60)}`;

export function arenaParseHM(value: string | undefined, fallback: number): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? ''));
  if (!match) return fallback;
  const min = Number(match[1]) * 60 + Number(match[2]);
  return min >= 0 && min <= 24 * 60 ? min : fallback;
}

function asUtcDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function arenaAddDays(isoDate: string, n: number): string {
  const at = asUtcDate(isoDate);
  at.setUTCDate(at.getUTCDate() + n);
  return arenaIsoDateOf({
    y: at.getUTCFullYear(), m: at.getUTCMonth() + 1, d: at.getUTCDate(), hh: 0, mm: 0,
  });
}

export const arenaWeekdayOf = (isoDate: string): number => asUtcDate(isoDate).getUTCDay();

export function arenaStartOfWeek(isoDate: string, weekStartsOn = 1): string {
  return arenaAddDays(isoDate, -(((arenaWeekdayOf(isoDate) - weekStartsOn) % 7 + 7) % 7));
}

export function arenaTodayIso(timeZone: string): string {
  return arenaIsoDateOf(arenaZonedParts(new Date().toISOString(), timeZone) as ArenaZonedParts);
}

export function arenaNowMinutes(timeZone: string): number {
  return arenaMinutesOf(arenaZonedParts(new Date().toISOString(), timeZone) as ArenaZonedParts);
}

export function arenaPlaceEvents<T extends EventTimes>(
  events: readonly T[], timeZone: string,
): ArenaPlacement<T>[] {
  const out: ArenaPlacement<T>[] = [];
  for (const ev of events) {
    const from = arenaZonedParts(ev.start, timeZone);
    const to = arenaZonedParts(ev.end, timeZone);
    if (!from || !to) {
      arenaWarnOnce(`calendar: event "${ev.id || '?'}" has an unparseable start/end — skipped.`);
      continue;
    }
    const dayIso = arenaIsoDateOf(from);
    const startMin = arenaMinutesOf(from);
    const endMin = arenaIsoDateOf(to) === dayIso ? arenaMinutesOf(to) : 24 * 60;
    out.push({ ev, dayIso, startMin, endMin: Math.max(endMin, startMin) });
  }
  return out;
}

export function arenaLayoutDay<T>(placements: readonly ArenaPlacement<T>[]): ArenaLaidOut<T>[] {
  const sorted = [...placements].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const out: ArenaLaidOut<T>[] = [];
  let cluster: Array<ArenaPlacement<T> & { col: number }> = [];
  let colEnds: number[] = [];
  let clusterEnd = -Infinity;

  const flush = (): void => {
    for (const p of cluster) out.push({ ...p, cols: colEnds.length });
    cluster = [];
    colEnds = [];
    clusterEnd = -Infinity;
  };

  for (const p of sorted) {
    if (p.startMin >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= p.startMin);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(p.endMin);
    } else {
      colEnds[col] = p.endMin;
    }
    cluster.push({ ...p, col });
    clusterEnd = Math.max(clusterEnd, p.endMin);
  }
  flush();
  return out;
}

export function arenaDefaultDayStart<T>(placements: readonly ArenaPlacement<T>[], fallback = 8 * 60): number {
  if (!placements.length) return fallback;
  return Math.max(0, Math.floor(Math.min(...placements.map((p) => p.startMin)) / 60) * 60);
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options ?? {});
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options });
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

export const ARENA_DATE_OPTIONS = {
  weekdayShort: { weekday: 'short' },
  dayNumber: { day: 'numeric' },
  dayName: { weekday: 'long', day: 'numeric', month: 'long' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export function arenaFormatDate(isoDate: string, options?: Intl.DateTimeFormatOptions): string {
  return dateFormatter(options).format(asUtcDate(isoDate));
}

export function arenaRangeTitle(days: readonly string[]): string {
  if (!days.length) return '';
  const first = days[0];
  const last = days[days.length - 1];
  if (first === last) {
    return arenaFormatDate(first, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  const from = asUtcDate(first);
  const to = asUtcDate(last);
  const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
  const sameMonth = sameYear && from.getUTCMonth() === to.getUTCMonth();
  const left = sameMonth ? arenaFormatDate(first, { day: 'numeric' })
    : sameYear ? arenaFormatDate(first, { day: 'numeric', month: 'short' })
      : arenaFormatDate(first, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${left} – ${arenaFormatDate(last, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
