import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arenaAnchoredScroll, arenaRowEstimate, arenaRowStarts, arenaWindowPad, arenaWindowPageTarget,
  arenaWindowRange, arenaWindowView,
} from './TableWindow';
import { limitWindowInitial, limitWindowOverscan } from '../../../Tokens.generated';

function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function extentsOf(total: number, next: () => number): Map<number, number> {
  const out = new Map<number, number>();
  for (let i = 0; i < total; i++) {
    if (next() < 0.6) out.set(i, 20 + Math.floor(next() * 80));
  }
  return out;
}

function startsOf(total: number, next: () => number): number[] {
  const extents = extentsOf(total, next);
  const estimate = arenaRowEstimate(extents.values(), 40);
  return arenaRowStarts(total, extents, estimate);
}

function met(starts: readonly number[], top: number, viewport: number): number[] {
  const rows: number[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    if (starts[i]! < top + viewport && starts[i + 1]! > top) rows.push(i);
  }
  return rows;
}

const TOTALS = [0, 1, 7, 20000];
const OVERSCANS = [0, 6];

function sweep(body: (starts: number[], overscan: number, top: number, viewport: number) => void): void {
  const next = seeded(24);
  for (const total of TOTALS) {
    const starts = startsOf(total, next);
    for (const overscan of OVERSCANS) {
      for (let k = 0; k < 120; k++) {
        const reach = starts[total]! + 200;
        body(starts, overscan, next() * reach - 50, 1 + next() * 900);
      }
    }
  }
}

test('the pinned windows are written for the overscan and initial tokens', () => {
  assert.equal(limitWindowOverscan, 6);
  assert.equal(limitWindowInitial, 30);
});

test('the window holds every row the viewport meets', () => {
  sweep((starts, overscan, top, viewport) => {
    const win = arenaWindowRange(top, viewport, starts, overscan, limitWindowInitial);
    for (const row of met(starts, Math.max(0, top), viewport)) {
      assert.ok(row >= win.offset && row < win.offset + win.count, `row ${row} outside ${JSON.stringify(win)}`);
    }
  });
});

test('the window is no wider than the rows met plus overscan on each side', () => {
  sweep((starts, overscan, top, viewport) => {
    const win = arenaWindowRange(top, viewport, starts, overscan, limitWindowInitial);
    const rows = met(starts, Math.max(0, top), viewport).length;
    assert.ok(win.count <= Math.max(rows, 1) + 2 * overscan, `${win.count} > ${rows} + 2 * ${overscan}`);
  });
});

test('the window stays inside the list', () => {
  sweep((starts, overscan, top, viewport) => {
    const win = arenaWindowRange(top, viewport, starts, overscan, limitWindowInitial);
    assert.ok(win.offset >= 0 && win.count >= 0);
    assert.ok(win.offset + win.count <= starts.length - 1);
  });
});

test('the window moves only forward as the scroll position grows', () => {
  const next = seeded(7);
  for (const total of TOTALS) {
    const starts = startsOf(total, next);
    for (const overscan of OVERSCANS) {
      let offset = 0;
      let end = 0;
      for (let top = 0; top <= starts[total]! + 300; top += 37) {
        const win = arenaWindowRange(top, 480, starts, overscan, limitWindowInitial);
        assert.ok(win.offset >= offset, `offset fell at ${top}`);
        assert.ok(win.offset + win.count >= end, `end fell at ${top}`);
        offset = win.offset;
        end = win.offset + win.count;
      }
    }
  }
});

test('the pads and the window add up to the whole list', () => {
  sweep((starts, overscan, top, viewport) => {
    const total = starts.length - 1;
    const win = arenaWindowRange(top, viewport, starts, overscan, limitWindowInitial);
    const pad = arenaWindowPad(starts, win);
    let inside = 0;
    for (let i = win.offset; i < win.offset + win.count; i++) inside += starts[i + 1]! - starts[i]!;
    assert.ok(Math.abs(pad.top + inside + pad.bottom - starts[total]!) < 1e-6);
    assert.ok(pad.top >= 0 && pad.bottom >= 0);
  });
});

test('an anchored scroll keeps the row at the old scroll position where it was', () => {
  const next = seeded(11);
  for (const total of [1, 7, 20000]) {
    const before = startsOf(total, next);
    const after = startsOf(total, next);
    for (let k = 0; k < 120; k++) {
      const top = next() * before[total]!;
      const row = met(before, top, 0.001)[0] ?? total - 1;
      const moved = arenaAnchoredScroll(top, before, after);
      assert.ok(Math.abs(after[row]! - moved - (before[row]! - top)) < 1e-6);
    }
  }
});

test('an anchored scroll over starts that did not change is the same scroll position', () => {
  const starts = startsOf(7, seeded(3));
  assert.equal(arenaAnchoredScroll(0, starts, starts), 0);
  assert.ok(Math.abs(arenaAnchoredScroll(starts[7]! / 2, starts, starts) - starts[7]! / 2) < 1e-9);
});

test('an estimate that is not a positive number gives the initial window with no NaN', () => {
  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    for (const total of TOTALS) {
      const estimate = arenaRowEstimate([], bad);
      assert.equal(estimate, 0);
      const starts = arenaRowStarts(total, new Map(), bad);
      assert.ok(starts.every((s) => s === 0));
      const win = arenaWindowRange(120, 400, starts, 6, limitWindowInitial);
      assert.deepEqual(win, { offset: 0, count: Math.min(total, limitWindowInitial) });
      const pad = arenaWindowPad(starts, win);
      assert.deepEqual(pad, { top: 0, bottom: 0 });
      assert.ok(Number.isFinite(arenaWindowView(120, 400, starts)));
    }
  }
});

test('the estimate is the mean of the measured and falls back when nothing is', () => {
  assert.equal(arenaRowEstimate([30, 50], 99), 40);
  assert.equal(arenaRowEstimate(new Map([[1, 10], [2, 20], [3, 60]]).values(), undefined), 30);
  assert.equal(arenaRowEstimate([0, -5, Number.NaN, Number.POSITIVE_INFINITY, 36], 99), 36);
  assert.equal(arenaRowEstimate([0, -5, Number.NaN], 48), 48);
  assert.equal(arenaRowEstimate([], undefined), 0);
});

test('a row without an extent counts as the estimate', () => {
  const next = seeded(5);
  const extents = extentsOf(50, next);
  const starts = arenaRowStarts(50, extents, 33);
  assert.equal(starts.length, 51);
  for (let i = 0; i < 50; i++) assert.equal(starts[i + 1]! - starts[i]!, extents.get(i) ?? 33);
});

test('the view is the rows that lie whole inside the viewport, and at least one', () => {
  sweep((starts, _overscan, top, viewport) => {
    const total = starts.length - 1;
    const view = arenaWindowView(top, viewport, starts);
    if (total === 0) return assert.equal(view, 0);
    const from = Math.max(0, top);
    let whole = 0;
    for (let i = 0; i < total; i++) if (starts[i]! >= from && starts[i + 1]! <= from + viewport) whole += 1;
    assert.equal(view, Math.max(1, whole));
  });
});

test('the page target clamps at both ends', () => {
  assert.equal(arenaWindowPageTarget(5, 'PageDown', 10, 100), 15);
  assert.equal(arenaWindowPageTarget(95, 'PageDown', 10, 100), 99);
  assert.equal(arenaWindowPageTarget(5, 'PageUp', 10, 100), 0);
  assert.equal(arenaWindowPageTarget(50, 'PageUp', 10, 100), 40);
  assert.equal(arenaWindowPageTarget(50, 'ControlHome', 10, 100), 0);
  assert.equal(arenaWindowPageTarget(50, 'ControlEnd', 10, 100), 99);
});

test('the page target is null when there is nothing to reach', () => {
  for (const key of ['PageUp', 'PageDown', 'ControlHome', 'ControlEnd'] as const) {
    assert.equal(arenaWindowPageTarget(0, key, 10, -1), null);
    assert.equal(arenaWindowPageTarget(0, key, 0, 100), null);
  }
});
