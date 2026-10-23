import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { initArenaTheme, registerArenaPalette, RUNTIME_CACHE_KEY, setArenaTheme } from '../../../Theme.ts';
import { resetArenaTheme } from '../../../ThemeState.ts';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
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

function captureWarnings<T>(run: () => T): { result: T; warned: string[] } {
  const warned: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { warned.push(args.map(String).join(' ')); };
  try {
    return { result: run(), warned };
  } finally {
    console.warn = original;
  }
}

test('a registered palette re-registered while a scope names it updates the host class and style', () => {
  resetArenaTheme();
  document.documentElement.style.setProperty(ROOT, '1');
  try {
    registerArenaPalette({ name: 'scope-flip', polarity: 'dark', properties: { '--color-base-100': '#101010', '--color-base-200': '#202020', '--arena-palette': 'scope-flip' } });
    const root = mount(<ArenaPaletteScope palette="scope-flip"><i /></ArenaPaletteScope>);
    const scope = () => root.querySelector<HTMLElement>('[data-arena-part="palette-scope"]');
    assert.ok(scope()?.classList.contains('arena-polarity-dark'));
    act(() => { registerArenaPalette({ name: 'scope-flip', polarity: 'light', properties: { '--color-base-100': '#fafafa', '--arena-palette': 'scope-flip' } }); });
    assert.ok(scope()?.classList.contains('arena-polarity-light'));
    assert.equal(scope()?.classList.contains('arena-polarity-dark'), false);
    assert.equal(scope()?.style.getPropertyValue('--color-base-100'), '#fafafa');
    assert.equal(scope()?.style.getPropertyValue('--color-base-200'), '', 'a property the new palette lacks was not removed');
  } finally {
    document.documentElement.style.removeProperty(ROOT);
  }
});

test('a scope naming a name nobody has registered renders pending, warns once, and paints when it is registered', () => {
  resetArenaTheme();
  forgetArenaWarnings();
  initArenaTheme();
  document.documentElement.style.setProperty(ROOT, '1');
  try {
    const { result: root, warned } = captureWarnings(() => mount(
      <ArenaPaletteScope palette="later-rt"><Reader label="l" /></ArenaPaletteScope>,
    ));
    const scope = () => root.querySelector<HTMLElement>('[data-arena-part="palette-scope"]');
    const palette = () => [...(scope()?.classList ?? [])].filter((c) => c.startsWith('arena-') && !c.startsWith('arena-palette-scope'));
    assert.deepEqual(palette(), [], 'no palette class while pending');
    assert.equal(scope()?.getAttribute('style') ?? '', '', 'and no properties');
    assert.equal(root.querySelector('[data-reader="l"]')?.textContent, 'later-rt', 'the reader still answers the scope name');
    assert.equal(warned.length, 1);
    assert.match(warned[0] ?? '', /no palette named "later-rt" is declared or registered/);
    const again = captureWarnings(() => {
      act(() => { setArenaTheme('dark'); });
      cleanup();
      mount(<ArenaPaletteScope palette="later-rt"><i /></ArenaPaletteScope>);
    });
    assert.deepEqual(again.warned, [], 'the same name warns once');
    cleanup();
    const root2 = mount(<ArenaPaletteScope palette="later-rt"><Reader label="l" /></ArenaPaletteScope>);
    act(() => { registerArenaPalette({ name: 'later-rt', polarity: 'light', properties: { '--color-base-100': '#fafafa', '--arena-palette': 'later-rt' } }); });
    const painted = root2.querySelector<HTMLElement>('[data-arena-part="palette-scope"]');
    assert.ok(painted?.classList.contains('arena-polarity-light'));
    assert.equal(painted?.style.getPropertyValue('--color-base-100'), '#fafafa');
  } finally {
    document.documentElement.style.removeProperty(ROOT);
  }
});

test('a scope naming a cache-restored palette hydrates against the server markup, then wears the palette', () => {
  resetArenaTheme();
  const palette = { name: 'scope-cached', polarity: 'light' as const, properties: { '--color-base-100': '#fafafa', '--arena-palette': 'scope-cached' } };
  localStorage.setItem('arena-theme', 'scope-cached');
  localStorage.setItem(RUNTIME_CACHE_KEY, JSON.stringify(palette));
  try {
    initArenaTheme();
    const element = <ArenaPaletteScope palette="scope-cached"><Reader label="c" /></ArenaPaletteScope>;
    const server = renderToString(element);
    assert.match(server, /arena-scope-cached/);
    assert.doesNotMatch(server, /arena-polarity/);
    const box = document.createElement('div');
    box.innerHTML = server;
    document.body.appendChild(box);
    const logged: unknown[][] = [];
    const recovered: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => { logged.push(args); };
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      act(() => { root = hydrateRoot(box, element, { onRecoverableError: (error) => { recovered.push(error); } }); });
    } finally {
      console.error = original;
    }
    assert.deepEqual(logged, []);
    assert.deepEqual(recovered, []);
    const scope = box.querySelector<HTMLElement>('[data-arena-part="palette-scope"]');
    assert.ok(scope?.classList.contains('arena-polarity-light'));
    assert.equal(scope?.style.getPropertyValue('--color-base-100'), '#fafafa');
    act(() => { root?.unmount(); });
    box.remove();
  } finally {
    localStorage.removeItem(RUNTIME_CACHE_KEY);
  }
});

test('a scope naming an unregistered palette hydrates against a server that ran without init, then is pending', () => {
  resetArenaTheme();
  const element = <ArenaPaletteScope palette="scope-late"><Reader label="l" /></ArenaPaletteScope>;
  const server = renderToString(element);
  assert.match(server, /arena-scope-late/);
  initArenaTheme();
  const box = document.createElement('div');
  box.innerHTML = server;
  document.body.appendChild(box);
  const logged: unknown[][] = [];
  const recovered: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { logged.push(args); };
  const originalWarn = console.warn;
  console.warn = () => { void 0; };
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    act(() => { root = hydrateRoot(box, element, { onRecoverableError: (error) => { recovered.push(error); } }); });
  } finally {
    console.error = original;
    console.warn = originalWarn;
  }
  assert.deepEqual(logged, []);
  assert.deepEqual(recovered, []);
  const scope = box.querySelector<HTMLElement>('[data-arena-part="palette-scope"]');
  assert.equal(scope?.classList.contains('arena-scope-late'), false, 'pending after hydration');
  assert.equal(scope?.className.includes('arena-polarity'), false);
  act(() => { root?.unmount(); });
  box.remove();
});
