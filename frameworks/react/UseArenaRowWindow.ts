import type * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ArenaTableSlice } from './Api.generated.ts';
import { limitWindowInitial, limitWindowOverscan } from './Tokens.generated.js';
import {
  arenaAnchoredScroll, arenaRowEstimate, arenaRowStarts, arenaWindowPad, arenaWindowRange, arenaWindowView,
} from './components/display/arena-table/TableWindow.ts';

export interface ArenaRowWindowOptions {
  total: number;
  rowHeight?: number;
  overscan?: number;
  enabled?: boolean;
}

export interface ArenaRowWindowResult<T extends HTMLElement = HTMLDivElement> {
  ref: React.RefObject<T>;
  style: React.CSSProperties;
  offset: number;
  count: number;
  padTop: number;
  padBottom: number;
  slice: ArenaTableSlice;
  scrollToRow: (index: number) => void;
  onRowRequest: (index: number) => void;
}

interface Reading {
  offset: number;
  count: number;
  padTop: number;
  padBottom: number;
  head: number;
}

const ROWS = '[data-arena-part="table.row"], [data-arena-part="table.card"]';

const finite = (value: number | undefined): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const same = (a: Reading, b: Reading) => a.offset === b.offset && a.count === b.count && a.padTop === b.padTop
  && a.padBottom === b.padBottom && a.head === b.head;

function stickyHead(box: HTMLElement): number {
  const th = box.querySelector('[data-arena-part="table.th"]');
  const view = box.ownerDocument.defaultView;
  if (!th || !view || view.getComputedStyle(th).position !== 'sticky') return 0;
  const row = th.closest('[data-arena-part="table.head-row"]') ?? th;
  return row.getBoundingClientRect().height;
}

function extentsOf(rows: readonly Element[]): number[] {
  const rects = rows.map((row) => row.getBoundingClientRect());
  return rects.map((rect, i) => {
    const next = rects[i + 1];
    const before = rects[i - 1];
    const gap = next ? next.top - rect.bottom : before ? rect.top - before.bottom : 0;
    return rect.height + Math.max(0, gap);
  });
}

interface Latest {
  rows: number;
  rowHeight: number | undefined;
  overscan: number;
  first: number;
}

interface Kept {
  extents: Map<number, number>;
  starts: number[];
  lead: number;
  head: number;
  dirty: boolean;
  rows: number;
  rowHeight: number | undefined;
}

interface Watch<T extends HTMLElement> {
  ref: React.RefObject<T>;
  enable(on: boolean): void;
  sync(): void;
}

function readBox(box: HTMLElement, latest: Latest, kept: Kept, watched: Set<Element>, observer: ResizeObserver,
  report: (next: Reading) => void): void {
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
    kept.starts = arenaRowStarts(latest.rows, kept.extents, arenaRowEstimate(kept.extents.values(), latest.rowHeight));
    kept.dirty = false;
  }
  let top = box.scrollTop;
  if (before !== kept.starts && before.length === kept.starts.length) {
    const anchored = arenaAnchoredScroll(top, before, kept.starts);
    if (Math.abs(anchored - top) >= 0.5) { box.scrollTop = anchored; top = anchored; }
  }
  const win = arenaWindowRange(top, box.clientHeight - kept.lead, kept.starts, latest.overscan, limitWindowInitial);
  const pad = arenaWindowPad(kept.starts, win);
  report({ offset: win.offset, count: win.count, padTop: pad.top, padBottom: pad.bottom, head: kept.head });
}

function watchBox<T extends HTMLElement>(on: boolean, latest: Latest, kept: Kept, report: (next: Reading) => void): Watch<T> {
  let box: T | null = null;
  let enabled = on;
  let stop: (() => void) | null = null;
  let run: (() => void) | null = null;
  const release = () => {
    stop?.();
    stop = null;
    run = null;
  };
  const hold = () => {
    release();
    if (!box || !enabled || typeof ResizeObserver === 'undefined') return;
    const target = box;
    const watched = new Set<Element>();
    let wrapper: Element | null = null;
    const observer = new ResizeObserver(() => run?.());
    const sync = () => {
      if (target.firstElementChild !== wrapper) {
        if (wrapper) observer.unobserve(wrapper);
        wrapper = target.firstElementChild;
        if (wrapper) observer.observe(wrapper);
      }
      readBox(target, latest, kept, watched, observer, report);
    };
    observer.observe(target);
    target.addEventListener('scroll', sync, { passive: true });
    run = sync;
    stop = () => {
      target.removeEventListener('scroll', sync);
      observer.disconnect();
      watched.clear();
    };
    sync();
  };
  const ref = { current: null as T | null };
  Object.defineProperty(ref, 'current', {
    configurable: true,
    enumerable: true,
    get: () => box,
    set(next: T | null) {
      if (next === box) return;
      box = next;
      hold();
    },
  });
  return {
    ref: ref as React.RefObject<T>,
    enable(next) {
      enabled = next;
      hold();
    },
    sync: () => run?.(),
  };
}

export function useArenaRowWindow<T extends HTMLElement = HTMLDivElement>(options: ArenaRowWindowOptions): ArenaRowWindowResult<T> {
  const { total, rowHeight, overscan = limitWindowOverscan, enabled = true } = options;
  const rows = Math.max(0, Math.floor(finite(total)));
  const [reading, setReading] = useState<Reading | null>(null);
  const latest = useRef<Latest>({ rows, rowHeight, overscan, first: 0 });
  const kept = useRef<Kept>({
    extents: new Map<number, number>(),
    starts: [0],
    lead: 0,
    head: 0,
    dirty: true,
    rows: -1,
    rowHeight: undefined,
  });
  const watch = useRef<Watch<T> | null>(null);
  watch.current ??= watchBox<T>(enabled, latest.current, kept.current,
    (next) => setReading((prev) => (prev && same(prev, next) ? prev : next)));

  useEffect(() => {
    const current = watch.current!;
    current.enable(enabled);
    return () => current.enable(false);
  }, [enabled]);

  useEffect(() => {
    watch.current!.sync();
  });

  const measured = enabled && reading !== null;
  const offset = measured ? Math.min(reading.offset, rows) : 0;
  const count = measured ? Math.max(0, Math.min(reading.count, rows - offset)) : Math.min(rows, limitWindowInitial);
  const padTop = measured ? reading.padTop : 0;
  const padBottom = measured ? reading.padBottom : 0;
  const stuck = measured ? reading.head : 0;
  Object.assign(latest.current, { rows, rowHeight, overscan, first: offset });

  const style = useMemo<React.CSSProperties>(() => ({ overflowAnchor: 'none', scrollPaddingTop: stuck }), [stuck]);
  const slice = useMemo<ArenaTableSlice>(() => ({ total: finite(total), offset }), [total, offset]);

  const scrollToRow = useCallback((index: number) => {
    const box = watch.current?.ref.current;
    if (!box) return;
    const state = kept.current;
    const row = Math.min(Math.max(Math.floor(finite(index)), 0), Math.max(0, state.starts.length - 2));
    box.scrollTop = (state.starts[row] ?? 0) + state.lead - state.head;
  }, []);

  const onRowRequest = useCallback((index: number) => {
    const box = watch.current?.ref.current;
    if (!box) return;
    const state = kept.current;
    const row = Math.min(Math.max(Math.floor(finite(index)), 0), Math.max(0, state.starts.length - 2));
    const top = (state.starts[row] ?? 0) + state.lead;
    const bottom = (state.starts[row + 1] ?? top) + state.lead;
    if (top - state.head < box.scrollTop) box.scrollTop = top - state.head;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
  }, []);

  return { ref: watch.current.ref, style, offset, count, padTop, padBottom, slice, scrollToRow, onRowRequest };
}
