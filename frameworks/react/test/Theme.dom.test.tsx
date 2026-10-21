/* A .dom suite because every claim here is about documentElement's class list, and the
 * module keeps process-wide state, so each test re-initialises it and clears the root. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_DEFAULT_THEMES, arenaThemeClass, initArenaTheme, getArenaTheme, setArenaTheme,
  toggleArenaTheme, arenaPalettes,
} from '../Theme.ts';
import type { ArenaThemeConfig } from '../Theme.ts';
import React from 'react';
import { mount, cleanup, act } from './Harness.tsx';
import { useArenaTheme } from '../Theme.ts';

const THREE: ArenaThemeConfig = {
  palettes: [
    { name: 'dark', polarity: 'dark' },
    { name: 'light', polarity: 'light' },
    { name: 'high-contrast', polarity: 'light' },
  ],
  default: 'dark',
};

function clean() {
  document.documentElement.className = '';
  localStorage.removeItem('arena-theme');
}

test('the shipped default is dark and light, which is what the package carries', () => {
  clean();
  initArenaTheme();
  assert.deepEqual(arenaPalettes(), ARENA_DEFAULT_THEMES.palettes);
  clean();
});

test('the default palette wears no class, because it is the one on :root', () => {
  clean();
  initArenaTheme(THREE);
  setArenaTheme('dark');
  assert.equal(document.documentElement.className.trim(), '');
  clean();
});

test('any other palette wears arena-<name>, and only one at a time', () => {
  clean();
  initArenaTheme(THREE);

  setArenaTheme('high-contrast');
  assert.ok(document.documentElement.classList.contains(arenaThemeClass('high-contrast')));

  setArenaTheme('light');
  assert.ok(document.documentElement.classList.contains(arenaThemeClass('light')));
  assert.equal(document.documentElement.classList.contains(arenaThemeClass('high-contrast')), false,
    'the previous palette is removed, or two skins fight over the same custom property');
  clean();
});

test('a name no palette declares is refused by name rather than applied silently', () => {
  clean();
  initArenaTheme(THREE);
  setArenaTheme('light');
  assert.throws(() => setArenaTheme('midnight'), /no palette named "midnight"/);
  assert.equal(getArenaTheme(), 'light', 'a refused name leaves the current one standing');
  clean();
});

test('toggle walks the declared palettes in order and wraps', () => {
  clean();
  initArenaTheme(THREE);
  setArenaTheme('dark');
  assert.equal(toggleArenaTheme(), 'light');
  assert.equal(toggleArenaTheme(), 'high-contrast');
  assert.equal(toggleArenaTheme(), 'dark');
  clean();
});

test('a stored choice is honoured, and one naming a removed palette is not', () => {
  clean();
  localStorage.setItem('arena-theme', 'high-contrast');
  assert.equal(initArenaTheme(THREE), 'high-contrast');

  localStorage.setItem('arena-theme', 'midnight');
  const recovered = initArenaTheme(THREE);
  assert.notEqual(recovered, 'midnight', 'a palette that no longer exists is never applied');
  assert.ok(THREE.palettes.some((p) => p.name === recovered), 'and what replaces it is a declared palette');
  clean();
});

test('with nothing stored, the first palette of the preferred polarity wins', () => {
  clean();
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  initArenaTheme(THREE);
  assert.equal(getArenaTheme(), prefersLight ? 'light' : 'dark',
    'of the two light palettes it is the first declared, never the last');
  clean();
});

test('choosing a palette remembers it for the next load', () => {
  clean();
  initArenaTheme(THREE);
  setArenaTheme('high-contrast');
  assert.equal(localStorage.getItem('arena-theme'), 'high-contrast');
  clean();
});

test('initArenaTheme after the stored key is removed tells a mounted useArenaTheme the system\'s palette', () => {
  clean();
  initArenaTheme(THREE);
  setArenaTheme('high-contrast');
  const Label = () => React.createElement('span', { id: 'name' }, useArenaTheme()[0]);
  const box = mount(React.createElement(Label));
  assert.equal(box.querySelector('#name')?.textContent, 'high-contrast');

  localStorage.removeItem('arena-theme');
  act(() => { initArenaTheme(THREE); });
  assert.notEqual(getArenaTheme(), 'high-contrast');
  assert.equal(box.querySelector('#name')?.textContent, getArenaTheme(),
    'the mounted hook shows the palette the page now wears, not the one it held before');
  cleanup();
  clean();
});
