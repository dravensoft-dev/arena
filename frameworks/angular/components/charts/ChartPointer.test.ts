import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaCursorHandles2d, arenaCursorStep2d } from './ChartPointer';
import type { ArenaCell } from './ChartPointer';

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'];
const OTHER = ['a', 'Tab', 'PageUp', 'PageDown', 'Enter', ' ', ''];

function grids(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let rows = 1; rows <= 8; rows += 1) for (let cols = 1; cols <= 8; cols += 1) out.push([rows, cols]);
  return out;
}

function cells(rows: number, cols: number): ArenaCell[] {
  const out: ArenaCell[] = [];
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) out.push({ row, col });
  return out;
}

test('the two-axis cursor handles exactly the four arrows, Home, End and Escape', () => {
  for (const key of KEYS) assert.equal(arenaCursorHandles2d(key), true, key);
  for (const key of OTHER) assert.equal(arenaCursorHandles2d(key), false, JSON.stringify(key));
});

test('the two-axis cursor stays inside the grid and is null only after Escape or on an empty grid', () => {
  for (const [rows, cols] of grids()) {
    for (const key of [...KEYS, ...OTHER]) {
      for (const from of [null, ...cells(rows, cols)]) {
        const next = arenaCursorStep2d(from, key, rows, cols);
        const where = `${rows}x${cols} ${key} from ${JSON.stringify(from)}`;
        if (key === 'Escape') { assert.equal(next, null, where); continue; }
        if (from === null && !arenaCursorHandles2d(key)) { assert.equal(next, null, where); continue; }
        assert.ok(next !== null, where);
        assert.ok(next.row >= 0 && next.row < rows && next.col >= 0 && next.col < cols, where);
      }
    }
  }
  for (const key of KEYS) {
    assert.equal(arenaCursorStep2d({ row: 0, col: 0 }, key, 0, 3), null);
    assert.equal(arenaCursorStep2d({ row: 0, col: 0 }, key, 3, 0), null);
  }
});

test('an arrow moves one coordinate by at most one and never wraps at an edge', () => {
  const moves: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
  for (const [rows, cols] of grids()) {
    for (const from of cells(rows, cols)) {
      for (const [key, [dr, dc]] of Object.entries(moves)) {
        const next = arenaCursorStep2d(from, key, rows, cols) as ArenaCell;
        const row = from.row + dr;
        const col = from.col + dc;
        const inside = row >= 0 && row < rows && col >= 0 && col < cols;
        assert.deepEqual(next, inside ? { row, col } : from, `${rows}x${cols} ${key} from ${JSON.stringify(from)}`);
        assert.ok(Math.abs(next.row - from.row) + Math.abs(next.col - from.col) <= 1);
      }
    }
  }
});

test('Home and End keep the row and go to its first and last column', () => {
  for (const [rows, cols] of grids()) {
    for (const from of cells(rows, cols)) {
      assert.deepEqual(arenaCursorStep2d(from, 'Home', rows, cols), { row: from.row, col: 0 });
      assert.deepEqual(arenaCursorStep2d(from, 'End', rows, cols), { row: from.row, col: cols - 1 });
    }
  }
});

test('the first key from no cell lands on the first cell, and End on the last column of the first row', () => {
  for (const [rows, cols] of grids()) {
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home']) {
      assert.deepEqual(arenaCursorStep2d(null, key, rows, cols), { row: 0, col: 0 }, `${rows}x${cols} ${key}`);
    }
    assert.deepEqual(arenaCursorStep2d(null, 'End', rows, cols), { row: 0, col: cols - 1 });
  }
});

test('a key the cursor does not handle returns the cell it was given', () => {
  for (const [rows, cols] of grids()) {
    for (const key of OTHER) {
      assert.equal(arenaCursorStep2d(null, key, rows, cols), null);
      for (const from of cells(rows, cols)) assert.equal(arenaCursorStep2d(from, key, rows, cols), from, key);
    }
  }
});

test('a cell left outside a grid that shrank comes back inside on every handled key but Escape', () => {
  const outside: ArenaCell[] = [{ row: 9, col: 0 }, { row: 0, col: 9 }, { row: 9, col: 9 }, { row: 5, col: 3 }];
  for (const [rows, cols] of grids()) {
    for (const key of KEYS.filter((one) => one !== 'Escape')) {
      for (const from of outside) {
        const next = arenaCursorStep2d(from, key, rows, cols);
        const where = `${rows}x${cols} ${key} from ${JSON.stringify(from)}`;
        assert.ok(next !== null, where);
        assert.ok(next.row >= 0 && next.row < rows && next.col >= 0 && next.col < cols, where);
      }
    }
  }
  assert.deepEqual(arenaCursorStep2d({ row: 5, col: 0 }, 'End', 3, 4), { row: 2, col: 3 });
  assert.deepEqual(arenaCursorStep2d({ row: 0, col: 7 }, 'ArrowRight', 3, 4), { row: 0, col: 3 });
  assert.deepEqual(arenaCursorStep2d({ row: 0, col: 7 }, 'ArrowLeft', 3, 4), { row: 0, col: 2 });
});
