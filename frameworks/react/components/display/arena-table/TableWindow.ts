export interface ArenaWindow { offset: number; count: number }
export interface ArenaWindowPad { top: number; bottom: number }

const usable = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

const at = (starts: readonly number[], i: number): number => starts[i] ?? 0;

function firstAt(starts: readonly number[], y: number, inclusive: boolean): number {
  let lo = 0;
  let hi = starts.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (inclusive ? at(starts, mid) >= y : at(starts, mid) > y) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

function rowAt(starts: readonly number[], y: number): number {
  const total = starts.length - 1;
  return Math.min(Math.max(firstAt(starts, y, false) - 1, 0), Math.max(total - 1, 0));
}

export function arenaRowEstimate(measured: Iterable<number>, fallback: number | undefined): number {
  let sum = 0;
  let n = 0;
  for (const m of measured) {
    if (usable(m)) { sum += m; n += 1; }
  }
  if (n > 0) return sum / n;
  return usable(fallback) ? fallback : 0;
}

export function arenaRowStarts(total: number, extents: ReadonlyMap<number, number>, estimate: number): number[] {
  const rows = Math.max(0, Math.floor(total) || 0);
  const fill = usable(estimate) ? estimate : 0;
  const starts: number[] = new Array(rows + 1);
  starts[0] = 0;
  for (let i = 0; i < rows; i++) {
    const e = extents.get(i);
    starts[i + 1] = at(starts, i) + (usable(e) ? e : fill);
  }
  return starts;
}

export function arenaWindowRange(scrollTop: number, viewport: number, starts: readonly number[], overscan: number, initial: number): ArenaWindow {
  const total = starts.length - 1;
  if (total <= 0) return { offset: 0, count: 0 };
  if (!usable(at(starts, total))) return { offset: 0, count: Math.max(0, Math.min(total, initial)) };
  const top = Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0;
  const height = usable(viewport) ? viewport : 0;
  const pad = Math.max(0, overscan);
  const first = rowAt(starts, top);
  const last = Math.max(first, Math.min(Math.max(firstAt(starts, top + height, true) - 1, 0), total - 1));
  const offset = Math.max(0, first - pad);
  const end = Math.min(total, last + 1 + pad);
  return { offset, count: end - offset };
}

export function arenaWindowPad(starts: readonly number[], window: ArenaWindow): ArenaWindowPad {
  const total = starts.length - 1;
  if (total < 0) return { top: 0, bottom: 0 };
  const from = Math.min(Math.max(window.offset, 0), total);
  const to = Math.min(Math.max(window.offset + window.count, from), total);
  return { top: at(starts, from), bottom: at(starts, total) - at(starts, to) };
}

export function arenaWindowView(scrollTop: number, viewport: number, starts: readonly number[]): number {
  const total = starts.length - 1;
  if (total <= 0) return 0;
  if (!usable(at(starts, total)) || !usable(viewport)) return 1;
  const top = Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0;
  const whole = firstAt(starts, top + viewport, false) - 1 - firstAt(starts, top, true);
  return Math.max(1, whole);
}

export function arenaAnchoredScroll(scrollTop: number, before: readonly number[], after: readonly number[]): number {
  if (before.length < 2 || after.length < 2) return scrollTop;
  const row = Math.min(rowAt(before, scrollTop), after.length - 1);
  return at(after, row) + (scrollTop - at(before, Math.min(row, before.length - 1)));
}

export function arenaWindowPageTarget(abs: number, key: 'PageUp' | 'PageDown' | 'ControlHome' | 'ControlEnd', view: number, total: number): number | null {
  if (!(total >= 1) || !(view >= 1)) return null;
  if (key === 'ControlHome') return 0;
  if (key === 'ControlEnd') return total - 1;
  const at = Math.min(Math.max(Number.isFinite(abs) ? abs : 0, 0), total - 1);
  return key === 'PageDown' ? Math.min(total - 1, at + view) : Math.max(0, at - view);
}
