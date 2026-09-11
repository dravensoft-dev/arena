import { calendarActionsBelowMinH, calendarTimeMinH, calendarTimeMinW } from '../../../Tokens.generated.js';

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
  let f: Intl.DateTimeFormat;
  try {

    f = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    if (timeZone === 'UTC') throw new Error('[arena] calendar: Intl rejected UTC.');
    arenaWarnOnce(`calendar: unknown timeZone "${timeZone}" — falling back to UTC.`);
    f = partsFormatter('UTC');
  }
  formatters.set(timeZone, f);
  return f;
}

export interface ArenaCalendarDate { y: number; m: number; d: number }
export interface ArenaZonedParts extends ArenaCalendarDate { hh: number; mm: number }

export function arenaZonedParts(iso: string | undefined, timeZone: string): ArenaZonedParts | null {
  const at = new Date(iso ?? '');
  if (Number.isNaN(at.getTime())) return null;
  const out: Record<string, string> = {};
  for (const p of partsFormatter(timeZone).formatToParts(at)) {
    if (p.type !== 'literal') out[p.type] = p.value;
  }
  return { y: +(out.year ?? 0), m: +(out.month ?? 0), d: +(out.day ?? 0), hh: +(out.hour ?? 0), mm: +(out.minute ?? 0) };
}

const p2 = (n: number) => String(n).padStart(2, '0');

export const arenaIsoDateOf = (p: ArenaCalendarDate): string => `${String(p.y).padStart(4, '0')}-${p2(p.m)}-${p2(p.d)}`;
export const arenaMinutesOf = (p: ArenaZonedParts): number => p.hh * 60 + p.mm;
export const arenaFormatHM = (min: number): string => `${p2(Math.floor(min / 60) % 24)}:${p2(Math.round(min) % 60)}`;

export function arenaParseHM(value: string | undefined, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? ''));
  if (!m) return fallback;
  const min = Number(m[1]) * 60 + Number(m[2]);
  return min >= 0 && min <= 24 * 60 ? min : fallback;
}

function asUtcDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
}

export function arenaAddDays(isoDate: string, n: number): string {
  const t = asUtcDate(isoDate);
  t.setUTCDate(t.getUTCDate() + n);
  return arenaIsoDateOf({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() });
}

export const arenaWeekdayOf = (isoDate: string): number => asUtcDate(isoDate).getUTCDay();

export function arenaStartOfWeek(isoDate: string, weekStartsOn = 1): string {
  return arenaAddDays(isoDate, -(((arenaWeekdayOf(isoDate) - weekStartsOn) % 7 + 7) % 7));
}

const nowParts = (timeZone: string): ArenaZonedParts => {
  const parts = arenaZonedParts(new Date().toISOString(), timeZone);
  if (!parts) throw new Error(`[arena] calendar: the current instant is unreadable in "${timeZone}".`);
  return parts;
};

export const arenaTodayIso = (timeZone: string): string => arenaIsoDateOf(nowParts(timeZone));
export const arenaNowMinutes = (timeZone: string): number => arenaMinutesOf(nowParts(timeZone));

export interface ArenaCalendarEventData {
  id?: string;
  start?: string;
  end?: string;
  colorId?: number;
}

export interface ArenaPlacement<T extends ArenaCalendarEventData = ArenaCalendarEventData> {
  ev: T;
  dayIso: string;
  startMin: number;
  endMin: number;
}

export interface ArenaLaidOut<T extends ArenaCalendarEventData = ArenaCalendarEventData> extends ArenaPlacement<T> {
  col: number;
  cols: number;
}

export function arenaPlaceEvents<T extends ArenaCalendarEventData>(
  events: T[] | undefined, timeZone: string,
): ArenaPlacement<T>[] {
  const out: ArenaPlacement<T>[] = [];
  for (const ev of events || []) {
    const s = arenaZonedParts(ev?.start, timeZone);
    const e = arenaZonedParts(ev?.end, timeZone);
    if (!s || !e) {
      arenaWarnOnce(`calendar: event "${ev?.id ?? '?'}" has an unparseable start/end — skipped.`);
      continue;
    }
    const dayIso = arenaIsoDateOf(s);
    const startMin = arenaMinutesOf(s);
    const endMin = arenaIsoDateOf(e) === dayIso ? arenaMinutesOf(e) : 24 * 60;
    out.push({ ev, dayIso, startMin, endMin: Math.max(endMin, startMin) });
  }
  return out;
}

export function arenaLayoutDay<T extends ArenaCalendarEventData>(placements: ArenaPlacement<T>[]): ArenaLaidOut<T>[] {
  const sorted = [...placements].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const out: ArenaLaidOut<T>[] = [];
  let cluster: (ArenaPlacement<T> & { col: number })[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
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

export function arenaDefaultDayStart(placements: ArenaPlacement<ArenaCalendarEventData>[], fallback = 8 * 60): number {
  if (!placements.length) return fallback;
  return Math.max(0, Math.floor(Math.min(...placements.map((p) => p.startMin)) / 60) * 60);
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
function dateFormatter(opts?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(opts ?? {});
  let f = dateFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts });
    dateFormatters.set(key, f);
  }
  return f;
}

export const ARENA_DATE_OPTIONS = {
  weekdayShort: { weekday: 'short' },
  dayNumber: { day: 'numeric' },
  dayName: { weekday: 'long', day: 'numeric', month: 'long' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export const arenaFormatDate = (isoDate: string, opts?: Intl.DateTimeFormatOptions): string =>
  dateFormatter(opts).format(asUtcDate(isoDate));

export function arenaRangeTitle(days: string[]): string {
  const a = days[0];
  const b = days[days.length - 1];
  if (a === undefined || b === undefined) return '';
  if (a === b) return arenaFormatDate(a, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const A = asUtcDate(a);
  const B = asUtcDate(b);
  const sameYear = A.getUTCFullYear() === B.getUTCFullYear();
  const sameMonth = sameYear && A.getUTCMonth() === B.getUTCMonth();
  const left = sameMonth ? arenaFormatDate(a, { day: 'numeric' })
    : sameYear ? arenaFormatDate(a, { day: 'numeric', month: 'short' })
      : arenaFormatDate(a, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${left} – ${arenaFormatDate(b, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
