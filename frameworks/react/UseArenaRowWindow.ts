import type * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ArenaTableSlice } from './Api.generated.ts';
import { limitWindowInitial, limitWindowOverscan } from './Tokens.generated.js';
import {
  arenaAnchoredScroll, arenaRowEstimate, arenaRowStarts, arenaWindowPad, arenaWindowRange, arenaWindowView,
} from './components/display/arena-table/TableWindow.ts';
import {
  aimAt, finite, newKept, TABLE_PARTS, watchRowBox,
  type RowWindowKept as Kept, type RowWindowLatest as Latest, type RowWindowMath, type RowWindowReading as Reading,
} from './RowWindowMeasure.ts';

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

const MATH: RowWindowMath = {
  estimate: arenaRowEstimate, starts: arenaRowStarts, range: arenaWindowRange, pad: arenaWindowPad,
  view: arenaWindowView, anchored: arenaAnchoredScroll, initial: limitWindowInitial,
};

const same = (a: Reading, b: Reading) => a.offset === b.offset && a.count === b.count && a.padTop === b.padTop
  && a.padBottom === b.padBottom && a.head === b.head && a.view === b.view;

interface Watch<T extends HTMLElement> {
  ref: React.RefObject<T>;
  enable(on: boolean): void;
  sync(): void;
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
    const watch = watchRowBox(box, TABLE_PARTS, MATH, latest, kept, report);
    run = watch.run;
    stop = watch.stop;
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
  const kept = useRef<Kept>(newKept());
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
  const view = measured && reading.view > 0 ? reading.view : undefined;
  const slice = useMemo<ArenaTableSlice>(
    () => (view === undefined ? { total: finite(total), offset } : { total: finite(total), offset, view }),
    [total, offset, view],
  );

  const scrollToRow = useCallback((index: number) => {
    const box = watch.current?.ref.current;
    if (box) aimAt(kept.current, box, { row: index, near: false });
  }, []);

  const onRowRequest = useCallback((index: number) => {
    const box = watch.current?.ref.current;
    if (box) aimAt(kept.current, box, { row: index, near: true });
  }, []);

  return { ref: watch.current.ref, style, offset, count, padTop, padBottom, slice, scrollToRow, onRowRequest };
}
