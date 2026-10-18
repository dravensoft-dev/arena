export interface RowWindowReading {
  offset: number;
  count: number;
  padTop: number;
  padBottom: number;
  head: number;
  view: number;
}

export interface RowWindowLatest {
  rows: number;
  rowHeight: number | undefined;
  overscan: number;
  first: number;
}

export interface RowWindowAim {
  row: number;
  near: boolean;
}

export interface RowWindowKept {
  extents: Map<number, number>;
  starts: number[];
  lead: number;
  head: number;
  dirty: boolean;
  rows: number;
  rowHeight: number | undefined;
  aim: RowWindowAim | null;
  tries: number;
}

export interface RowWindowMath {
  estimate(measured: Iterable<number>, fallback: number | undefined): number;
  starts(total: number, extents: ReadonlyMap<number, number>, estimate: number): number[];
  range(scrollTop: number, viewport: number, starts: readonly number[], overscan: number, initial: number): { offset: number; count: number };
  pad(starts: readonly number[], win: { offset: number; count: number }): { top: number; bottom: number };
  view(scrollTop: number, viewport: number, starts: readonly number[]): number;
  anchored(scrollTop: number, before: readonly number[], after: readonly number[]): number;
  initial: number;
}

const ROWS = '[data-arena-part="table.row"], [data-arena-part="table.card"]';

export function finite(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function newKept(): RowWindowKept {
  return {
    extents: new Map<number, number>(),
    starts: [0],
    lead: 0,
    head: 0,
    dirty: true,
    rows: -1,
    rowHeight: undefined,
    aim: null,
    tries: 0,
  };
}

export function stickyHead(box: HTMLElement): number {
  const th = box.querySelector('[data-arena-part="table.th"]');
  const view = box.ownerDocument.defaultView;
  if (!th || !view || view.getComputedStyle(th).position !== 'sticky') return 0;
  const row = th.closest('[data-arena-part="table.head-row"]') ?? th;
  return row.getBoundingClientRect().height;
}

export function extentsOf(rows: readonly Element[]): number[] {
  const rects = rows.map((row) => row.getBoundingClientRect());
  return rects.map((rect, i) => {
    const next = rects[i + 1];
    const before = rects[i - 1];
    const gap = next ? next.top - rect.bottom : before ? rect.top - before.bottom : 0;
    return rect.height + Math.max(0, gap);
  });
}

export function aimRow(kept: RowWindowKept, aim: RowWindowAim): number {
  return Math.min(Math.max(Math.floor(finite(aim.row)), 0), Math.max(0, kept.starts.length - 2));
}

export function aimedTop(kept: RowWindowKept, box: HTMLElement, aim: RowWindowAim): number {
  const row = aimRow(kept, aim);
  const room = Math.max(0, (kept.starts[kept.starts.length - 1] ?? 0) + kept.lead - box.clientHeight);
  const reach = (value: number) => Math.min(Math.max(value, 0), room);
  const top = (kept.starts[row] ?? 0) + kept.lead;
  if (!aim.near) return row === 0 ? 0 : reach(top - kept.head);
  const bottom = (kept.starts[row + 1] ?? top) + kept.lead;
  if (top - kept.head < box.scrollTop) return reach(top - kept.head);
  return bottom > box.scrollTop + box.clientHeight ? reach(bottom - box.clientHeight) : box.scrollTop;
}

export function aimAt(kept: RowWindowKept, box: HTMLElement, aim: RowWindowAim): void {
  kept.aim = aim;
  kept.tries = 0;
  box.scrollTop = aimedTop(kept, box, aim);
}

export function readBox(box: HTMLElement, math: RowWindowMath, latest: RowWindowLatest, kept: RowWindowKept,
  watched: Set<Element>, observer: ResizeObserver, report: (next: RowWindowReading) => void): void {
  const mounted = Array.from(box.querySelectorAll(ROWS));
  for (const row of watched) {
    if (!mounted.includes(row)) { observer.unobserve(row); watched.delete(row); }
  }
  for (const row of mounted) {
    if (!watched.has(row)) { observer.observe(row); watched.add(row); }
  }
  const first = latest.first;
  let every = mounted.length > 0;
  extentsOf(mounted).forEach((size, i) => {
    const old = kept.extents.get(first + i);
    if (old === undefined || Math.abs(old - size) < 0.5) every = false;
    if (old === undefined || Math.abs(old - size) >= 0.5) { kept.extents.set(first + i, size); kept.dirty = true; }
  });
  if (every) {
    for (const index of Array.from(kept.extents.keys())) {
      if (index < first || index >= first + mounted.length) { kept.extents.delete(index); kept.dirty = true; }
    }
  }
  const table = mounted[0]?.closest('[data-arena-part="table"]');
  if (mounted[0] && table) kept.lead = mounted[0].getBoundingClientRect().top - table.getBoundingClientRect().top;
  kept.head = stickyHead(box);
  if (kept.rows !== latest.rows || kept.rowHeight !== latest.rowHeight) {
    kept.rows = latest.rows;
    kept.rowHeight = latest.rowHeight;
    kept.dirty = true;
  }
  const before = kept.starts;
  if (kept.dirty) {
    kept.starts = math.starts(latest.rows, kept.extents, math.estimate(kept.extents.values(), latest.rowHeight));
    kept.dirty = false;
  }
  let top = box.scrollTop;
  if (before !== kept.starts && before.length === kept.starts.length) {
    const anchored = math.anchored(top, before, kept.starts);
    if (Math.abs(anchored - top) >= 0.5) { box.scrollTop = anchored; top = anchored; }
  }
  if (kept.aim) {
    const goal = aimedTop(kept, box, kept.aim);
    kept.tries += 1;
    if ((kept.extents.has(aimRow(kept, kept.aim)) && Math.abs(goal - top) < 1) || kept.tries > 64) kept.aim = null;
    else if (Math.abs(goal - top) >= 1) { box.scrollTop = goal; top = box.scrollTop; }
  }
  const win = math.range(top, box.clientHeight - kept.lead, kept.starts, latest.overscan, math.initial);
  const pad = math.pad(kept.starts, win);
  report({
    offset: win.offset, count: win.count, padTop: pad.top, padBottom: pad.bottom, head: kept.head,
    view: (kept.starts[kept.starts.length - 1] ?? 0) > 0 ? math.view(top, box.clientHeight - kept.lead, kept.starts) : 0,
  });
}
