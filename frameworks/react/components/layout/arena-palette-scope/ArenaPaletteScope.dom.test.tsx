import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { setArenaTheme } from '../../../Theme.ts';
import { ArenaPaletteScope, useArenaPalette } from './ArenaPaletteScope.tsx';

function Reader({ label }: { label: string }) {
  return <i data-reader={label}>{useArenaPalette()}</i>;
}

beforeEach(() => { setArenaTheme('dark'); });
afterEach(() => {
  cleanup();
  setArenaTheme('dark');
  try { globalThis.localStorage?.removeItem('arena-theme'); } catch { void 0; }
});

test('a reader outside any scope follows the page theme', () => {
  const root = mount(<Reader label="bare" />);
  const read = () => root.querySelector('[data-reader="bare"]')?.textContent;
  assert.equal(read(), 'dark');
  act(() => { setArenaTheme('light'); });
  assert.equal(read(), 'light');
});

test('a scope keeps its palette when the page theme changes', () => {
  const root = mount(<ArenaPaletteScope palette="dark"><Reader label="in" /></ArenaPaletteScope>);
  act(() => { setArenaTheme('light'); });
  assert.equal(root.querySelector('[data-reader="in"]')?.textContent, 'dark');
  assert.ok(root.querySelector('[data-arena-part="palette-scope"]')?.classList.contains('arena-dark'), 'the default palette is an island too');
});
