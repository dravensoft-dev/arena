import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { initArenaTheme, registerArenaPalette, resetArenaTheme, setArenaTheme } from '../../../Theme.ts';
import { ArenaPaletteScope, useArenaPalette } from './ArenaPaletteScope.tsx';

function Reader({ label }: { label: string }) {
  return <i data-reader={label}>{useArenaPalette()}</i>;
}

beforeEach(() => { setArenaTheme('dark'); });
afterEach(() => {
  cleanup();
  resetArenaTheme();
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

const ROOT = '--arena-runtime-palettes';

test('a scope naming a project palette renders before initArenaTheme and validates after', () => {
  resetArenaTheme();
  const root = mount(<ArenaPaletteScope palette="project-only"><Reader label="p" /></ArenaPaletteScope>);
  assert.ok(root.querySelector('[data-arena-part="palette-scope"]')?.classList.contains('arena-project-only'));
  act(() => { initArenaTheme({ palettes: [{ name: 'dark', polarity: 'dark' }, { name: 'project-only', polarity: 'light' }], default: 'dark' }); });
  assert.ok(root.querySelector('[data-arena-part="palette-scope"]')?.classList.contains('arena-project-only'));
  cleanup();
  act(() => { initArenaTheme(); });
  assert.throws(() => mount(<ArenaPaletteScope palette="project-only"><i /></ArenaPaletteScope>), /no palette named "project-only"/);
});

test('a scope naming a registered palette wears the hook and the properties', () => {
  resetArenaTheme();
  document.documentElement.style.setProperty(ROOT, '1');
  try {
    const palette = { name: 'scope-rt', polarity: 'light' as const, properties: { '--color-base-100': '#fafafa', '--level-base-100': '12%', '--arena-palette': 'scope-rt' } };
    const root = mount(<ArenaPaletteScope palette="scope-rt"><Reader label="r" /></ArenaPaletteScope>);
    const scope = () => root.querySelector<HTMLElement>('[data-arena-part="palette-scope"]');
    assert.ok(scope()?.classList.contains('arena-scope-rt'), 'before it is registered the scope wears the class of the name');
    act(() => { registerArenaPalette(palette); });
    assert.ok(scope()?.classList.contains('arena-polarity-light'));
    assert.equal(scope()?.classList.contains('arena-scope-rt'), false);
    assert.equal(scope()?.style.getPropertyValue('--color-base-100'), '#fafafa');
    assert.equal(scope()?.style.getPropertyValue('--arena-palette'), 'scope-rt');
    assert.equal(root.querySelector('[data-reader="r"]')?.textContent, 'scope-rt');
  } finally {
    document.documentElement.style.removeProperty(ROOT);
  }
});

test('an unknown name after init throws listing declared and registered', () => {
  resetArenaTheme();
  initArenaTheme();
  document.documentElement.style.setProperty(ROOT, '1');
  registerArenaPalette({ name: 'listed-rt', polarity: 'dark', properties: { '--arena-palette': 'listed-rt' } });
  const quiet = console.error;
  console.error = () => undefined;
  try {
    assert.throws(
      () => mount(<ArenaPaletteScope palette="nope"><i /></ArenaPaletteScope>),
      /no palette named "nope"; the declared palettes are dark, light; the registered palettes are listed-rt/,
    );
  } finally {
    console.error = quiet;
    document.documentElement.style.removeProperty(ROOT);
  }
});
