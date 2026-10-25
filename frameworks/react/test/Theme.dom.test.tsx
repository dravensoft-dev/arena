/* A .dom suite because every claim here is about documentElement's class list, and the
 * module keeps process-wide state, so each test re-initialises it and clears the root. The
 * runtime-palette tests register a real `arenaRuntimePalette` result, so a drift between the two
 * declarations of its shape fails this file's type-check. */

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_DEFAULT_THEMES, arenaThemeClass, initArenaTheme, getArenaTheme, setArenaTheme,
  toggleArenaTheme, arenaPalettes, registerArenaPalette, unregisterArenaPalette, RUNTIME_CACHE_KEY, useArenaPalettes,
} from '../Theme.ts';
import { resetArenaTheme } from '../ThemeState.ts';
import { forgetArenaWarnings } from '../WarnOnce.ts';
import type { themeCss } from '../../../scripts/generate/core/arena-cli/theme-css.ts';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { PALETTE_KEYS } from '../../../scripts/generate/core/arena-cli/palette-keys.ts';
import { runtimeData } from '../../../scripts/generate/core/arena-cli/theme-css.ts';
import { arenaRuntimePalette } from '../../../scripts/generate/core/arena-cli/palette.ts';
import type { ArenaThemeConfig } from '../Theme.ts';
import React from 'react';
import { mount, cleanup, act } from './Harness.tsx';
import { useArenaTheme } from '../Theme.ts';
import { REMOVAL_CASES, REMOVAL_CONFIGS, removalPalette } from '../../../scripts/lib/arena/palette-removal-cases.ts';
import { removalStep, withPrefers, type RemovalObserved } from './RemovalSteps.ts';

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

const PALETTE_KEYS_FIXTURE = (base: string): Record<string, string> => Object.fromEntries(
  PALETTE_KEYS.map((key) => [key, base]),
);
type CheckedConfig = Parameters<typeof themeCss>[0];
const BUILD: CheckedConfig = {
  palettes: [
    { name: 'dark', default: true, polarity: 'dark', colors: PALETTE_KEYS_FIXTURE('#141010') },
    { name: 'light', polarity: 'light', colors: PALETTE_KEYS_FIXTURE('#ffffff') },
  ],
  fonts: {},
  runtimePalettes: true,
};
const LEVELS = [
  { selector: '.arena-x__y', state: '', property: 'color', variable: 'color-base-content', percent: 62, level: 'level-ink-muted' },
  { selector: '.arena-x__z', state: '', property: 'color', variable: 'color-base-content', percent: 40, level: 'level-ink-quiet' },
];
const DATA = runtimeData(BUILD, { levels: LEVELS } as unknown as Parameters<typeof runtimeData>[1], null);
const input = (polarity: 'dark' | 'light', base = '#1b1830') => ({
  polarity,
  colors: { ...PALETTE_KEYS_FIXTURE(base), 'base-content': polarity === 'dark' ? '#f3ede5' : '#141010' },
});
const make = (name: string, polarity: 'dark' | 'light' = 'dark', base = '#1b1830') =>
  arenaRuntimePalette(name, input(polarity, base), DATA).palette;
const html = () => document.documentElement;

function runtimeClean() {
  resetArenaTheme();
  clean();
  localStorage.removeItem(RUNTIME_CACHE_KEY);
  html().style.setProperty('--arena-runtime-palettes', '1');
}

afterEach(() => {
  resetArenaTheme();
  clean();
  localStorage.removeItem(RUNTIME_CACHE_KEY);
  document.documentElement.style.removeProperty('--arena-runtime-palettes');
});

test('register then set paints the hook and every property', () => {
  runtimeClean();
  initArenaTheme(THREE);
  const palette = make('rt-paint');
  assert.equal(registerArenaPalette(palette), 'rt-paint');
  assert.deepEqual(arenaPalettes().slice(-1), [{ name: 'rt-paint', polarity: 'dark' }]);
  setArenaTheme('rt-paint');
  assert.ok(html().classList.contains('arena-polarity-dark'));
  assert.equal(html().classList.contains('arena-rt-paint'), false, 'a registered palette has no class of its own');
  for (const [key, value] of Object.entries(palette.properties)) {
    assert.equal(html().style.getPropertyValue(key), value, key);
  }
  assert.equal(html().style.getPropertyValue('--arena-palette'), 'rt-paint');
  assert.equal(JSON.parse(localStorage.getItem(RUNTIME_CACHE_KEY) ?? 'null').name, 'rt-paint');
  assert.equal(localStorage.getItem('arena-theme'), 'rt-paint');
  runtimeClean();
});

test('re-registering with the other polarity flips the hook and leaves no old property', () => {
  runtimeClean();
  initArenaTheme(THREE);
  registerArenaPalette({ ...make('rt-flip'), properties: { ...make('rt-flip').properties, '--color-extra-one': '#010203' } });
  setArenaTheme('rt-flip');
  assert.equal(html().style.getPropertyValue('--color-extra-one'), '#010203');
  registerArenaPalette(make('rt-flip', 'light', '#fafafa'));
  assert.ok(html().classList.contains('arena-polarity-light'));
  assert.equal(html().classList.contains('arena-polarity-dark'), false);
  assert.equal(html().style.getPropertyValue('--color-extra-one'), '', 'the old property is gone');
  assert.equal(html().style.getPropertyValue('--color-base-100'), '#fafafa');
  const lighter = make('rt-flip', 'light', '#fafafa');
  assert.ok(Object.keys(lighter.properties).some((key) => key.startsWith('--level-')), 'the fixture carries levels');
  for (const [key, value] of Object.entries(lighter.properties)) assert.equal(html().style.getPropertyValue(key), value, key);
  assert.equal(JSON.parse(localStorage.getItem(RUNTIME_CACHE_KEY) ?? 'null').polarity, 'light', 'the cache follows the re-registration');
  runtimeClean();
});

test('setting a declared palette removes every runtime property, the hook and the cache', () => {
  runtimeClean();
  initArenaTheme(THREE);
  const leaving = make('rt-leave');
  registerArenaPalette(leaving);
  setArenaTheme('rt-leave');
  assert.ok(Object.keys(leaving.properties).some((key) => key.startsWith('--level-')), 'the fixture carries levels');
  for (const [key, value] of Object.entries(leaving.properties)) assert.equal(html().style.getPropertyValue(key), value, key);
  setArenaTheme('light');
  assert.equal(html().classList.contains('arena-polarity-dark'), false);
  for (const key of Object.keys(leaving.properties)) assert.equal(html().style.getPropertyValue(key), '', key);
  assert.equal(html().style.getPropertyValue('--arena-runtime-palettes'), '1', 'only the properties it set are removed');
  assert.equal(localStorage.getItem(RUNTIME_CACHE_KEY), null);
  runtimeClean();
});

test('a stored cache restores the palette on first read', () => {
  runtimeClean();
  const palette = make('rt-restore', 'light');
  localStorage.setItem('arena-theme', 'rt-restore');
  localStorage.setItem(RUNTIME_CACHE_KEY, JSON.stringify(palette));
  html().style.removeProperty('--arena-runtime-palettes');
  assert.equal(initArenaTheme(THREE), 'rt-restore', 'no marker check: the stylesheet may not be loaded yet');
  assert.ok(html().classList.contains('arena-polarity-light'));
  assert.equal(html().style.getPropertyValue('--color-base-100'), palette.properties['--color-base-100']);
  assert.ok(arenaPalettes().some((p) => p.name === 'rt-restore'));
  runtimeClean();
});

test('a cache naming a declared palette, malformed JSON, or a foreign property is ignored', () => {
  const good = make('rt-ignored');
  const cases: Array<[string, string, string]> = [
    ['declared', 'rt-gone', JSON.stringify({ ...good, name: 'light' })],
    ['malformed', 'rt-ignored', '{not json'],
    ['foreign property', 'rt-ignored', JSON.stringify({ ...good, properties: { ...good.properties, '--evil': 'url(x)' } })],
    ['bad colour', 'rt-ignored', JSON.stringify({ ...good, properties: { ...good.properties, '--color-base-100': 'red' } })],
    ['another name', 'rt-ignored', JSON.stringify({ ...good, name: 'rt-other' })],
    ['an array value', 'rt-ignored', JSON.stringify({ ...good, properties: { ...good.properties, '--color-base-100': ['#1b1830'] } })],
    ['no --arena-palette', 'rt-ignored', JSON.stringify({ ...good, properties: { '--color-base-100': '#1b1830' } })],
  ];
  for (const [label, stored, cache] of cases) {
    runtimeClean();
    localStorage.setItem('arena-theme', stored);
    localStorage.setItem(RUNTIME_CACHE_KEY, cache);
    initArenaTheme(THREE);
    assert.equal(arenaPalettes().some((p) => p.name === 'rt-ignored'), false, label);
    assert.equal(html().style.getPropertyValue('--evil'), '', label);
    assert.ok(THREE.palettes.some((p) => p.name === getArenaTheme()), `${label}: the page follows a declared palette`);
  }
  runtimeClean();
});

test('register without the root marker throws naming runtimePalettes', () => {
  runtimeClean();
  html().style.removeProperty('--arena-runtime-palettes');
  initArenaTheme(THREE);
  assert.throws(() => registerArenaPalette(make('rt-nomarker')), /"runtimePalettes": true in arena\.config\.json/);
  runtimeClean();
});

test('register refuses a declared name, a foreign property, a bad value and a mismatched --arena-palette', () => {
  runtimeClean();
  initArenaTheme(THREE);
  const good = make('rt-refuse');
  assert.throws(() => registerArenaPalette({ ...good, name: 'light' }), /registerArenaPalette: .*"light".*declared/);
  const withProp = (key: string, value: string) => ({ ...good, properties: { ...good.properties, [key]: value } });
  assert.throws(() => registerArenaPalette(withProp('--font-body', 'x')), /"--font-body" is not a property a palette carries/);
  assert.throws(() => registerArenaPalette(withProp('--color-base-100', 'red')), /--color-base-100 is "red", not a #rrggbb colour/);
  assert.throws(() => registerArenaPalette(withProp('--level-base-100', '12px')), /--level-base-100 is "12px"/);
  assert.throws(() => registerArenaPalette(withProp('--arena-palette', 'other')), /--arena-palette is "other"/);
  assert.throws(() => registerArenaPalette(withProp('--color-base-100', ['#1b1830'] as unknown as string)), /--color-base-100 is not a string/);
  const { '--arena-palette': _name, ...unnamed } = good.properties;
  assert.throws(() => registerArenaPalette({ ...good, properties: unnamed }),
    (e: Error) => e.message === 'registerArenaPalette: --arena-palette is missing; a runtime palette carries its own name');
  assert.equal(arenaPalettes().some((p) => p.name === 'rt-refuse'), false);
  runtimeClean();
});

function hydrated(element: React.ReactElement, markup: string) {
  const box = document.createElement('div');
  box.innerHTML = markup;
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
  return { box, logged, recovered, unmount: () => { act(() => { root?.unmount(); }); box.remove(); } };
}

test('server snapshot is the fallback, and hydrating logs no mismatch', () => {
  runtimeClean();
  initArenaTheme(THREE);
  registerArenaPalette(make('rt-ssr'));
  setArenaTheme('rt-ssr');
  const Label = () => React.createElement('span', { id: 'name' }, useArenaTheme()[0]);
  const server = renderToString(React.createElement(Label));
  assert.equal(server, '<span id="name">dark</span>', 'the server answers the fallback while localStorage holds another name');
  const run = hydrated(React.createElement(Label), server);
  assert.deepEqual(run.logged, [], 'no hydration mismatch is logged');
  assert.deepEqual(run.recovered, [], 'and none is recovered from');
  assert.equal(run.box.querySelector('#name')?.textContent, 'rt-ssr', 'the client then moves to the stored palette');
  run.unmount();
});

test('a list from useArenaPalettes hydrates against the declared palettes, then grows', () => {
  runtimeClean();
  initArenaTheme(THREE);
  registerArenaPalette(make('rt-list'));
  const List = () => React.createElement('b', { id: 'list' }, useArenaPalettes().map((p) => p.name).join(','));
  const server = renderToString(React.createElement(List));
  assert.equal(server, '<b id="list">dark,light,high-contrast</b>');
  const run = hydrated(React.createElement(List), server);
  assert.deepEqual(run.logged, []);
  assert.deepEqual(run.recovered, []);
  assert.equal(run.box.querySelector('#list')?.textContent, 'dark,light,high-contrast,rt-list');
  run.unmount();
});

test('toggle cycles the declared palettes, then the registered ones, and wraps', () => {
  runtimeClean();
  initArenaTheme(THREE);
  registerArenaPalette(make('rt-tog-a'));
  registerArenaPalette(make('rt-tog-b'));
  setArenaTheme('high-contrast');
  assert.equal(toggleArenaTheme(), 'rt-tog-a');
  assert.equal(toggleArenaTheme(), 'rt-tog-b');
  assert.equal(toggleArenaTheme(), 'dark');
});

test('an unknown name names the registered palettes only when some are registered', () => {
  runtimeClean();
  initArenaTheme(THREE);
  assert.throws(() => setArenaTheme('nope'), (e: Error) => e.message === 'setArenaTheme: no palette named "nope"; the declared palettes are dark, light, high-contrast');
  registerArenaPalette(make('rt-named'));
  assert.throws(() => setArenaTheme('nope'), /high-contrast; the registered palettes are rt-named$/);
});

test('registering the stored name before any read applies it', () => {
  runtimeClean();
  localStorage.setItem('arena-theme', 'rt-first');
  registerArenaPalette(make('rt-first', 'light'));
  assert.equal(getArenaTheme(), 'rt-first');
  assert.ok(html().classList.contains('arena-polarity-light'));
  assert.equal(html().style.getPropertyValue('--arena-palette'), 'rt-first');
});

test('a name that is not kebab case is refused at register and ignored in the cache', () => {
  runtimeClean();
  initArenaTheme(THREE);
  assert.throws(() => registerArenaPalette({ ...make('rt-kebab'), name: 'My Palette' }), /registerArenaPalette: "My Palette" is not a kebab-case name/);
  const odd = { ...make('rt-kebab'), name: '9dusk', properties: { ...make('rt-kebab').properties, '--arena-palette': '9dusk' } };
  localStorage.setItem('arena-theme', '9dusk');
  localStorage.setItem(RUNTIME_CACHE_KEY, JSON.stringify(odd));
  initArenaTheme(THREE);
  assert.equal(arenaPalettes().some((p) => p.name === '9dusk'), false);
  assert.ok(THREE.palettes.some((p) => p.name === getArenaTheme()));
  runtimeClean();
});

test('a name registered before init that the new config declares is dropped with one warning', () => {
  runtimeClean();
  forgetArenaWarnings();
  registerArenaPalette(make('high-contrast'));
  assert.ok(arenaPalettes().some((p) => p.name === 'high-contrast'), 'registration before init is accepted');
  const warned: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { warned.push(args.map(String).join(' ')); };
  try {
    initArenaTheme(THREE);
    initArenaTheme(THREE);
  } finally {
    console.warn = original;
  }
  assert.deepEqual(arenaPalettes().filter((p) => p.name === 'high-contrast'), [{ name: 'high-contrast', polarity: 'light' }], 'only the declared one stays');
  assert.equal(warned.length, 1);
  assert.match(warned[0] ?? '', /"high-contrast" is dropped, because the theme config declares it/);
  runtimeClean();
});

function inlinePalette(): boolean {
  const style = html().style;
  for (let i = 0; i < style.length; i += 1) {
    const key = style.item(i);
    if (key.startsWith('--color-') || key.startsWith('--level-') || key === '--arena-palette') return true;
  }
  return false;
}

function observed(unknown: string[]): RemovalObserved {
  let cached: string | null = null;
  const copy = localStorage.getItem(RUNTIME_CACHE_KEY);
  if (copy !== null) cached = (JSON.parse(copy) as { name: string }).name;
  const polarity = (['dark', 'light'] as const).find((p) => html().classList.contains(`arena-polarity-${p}`)) ?? null;
  return {
    listed: arenaPalettes().map((p) => p.name),
    current: getArenaTheme(),
    stored: localStorage.getItem('arena-theme'),
    cached,
    inline: inlinePalette(),
    polarity,
    unknown,
  };
}

for (const removal of REMOVAL_CASES) {
  test(`unregisterArenaPalette: ${removal.title} (${removal.key})`, () => {
    runtimeClean();
    forgetArenaWarnings();
    withPrefers(removal.prefersLight, () => {
      if (removal.seed) {
        localStorage.setItem('arena-theme', removal.seed.stored);
        localStorage.setItem(RUNTIME_CACHE_KEY, JSON.stringify(removalPalette(removal.seed.cached, removal.seed.polarity)));
      }
      if (!removal.unread) initArenaTheme(REMOVAL_CONFIGS[removal.config]);
      for (const step of removal.steps) removalStep(step);
      assert.deepEqual(observed(removal.expect.unknown), removal.expect);
      for (const name of removal.expect.unknown) assert.throws(() => setArenaTheme(name), /no palette named/);
    });
  });
}

test('unregisterArenaPalette: mounted readers re-render to the preferred name and the shorter list', () => {
  runtimeClean();
  initArenaTheme(REMOVAL_CONFIGS.three);
  function Readers() {
    const [theme] = useArenaTheme();
    const palettes = useArenaPalettes();
    return <i data-readers="">{theme}|{palettes.map((p) => p.name).join(',')}</i>;
  }
  const root = mount(<Readers />);
  const read = () => root.querySelector('[data-readers]')?.textContent;
  act(() => { registerArenaPalette(removalPalette('a', 'dark')); setArenaTheme('a'); });
  assert.equal(read(), 'a|dark,light,high-contrast,a');
  withPrefers(false, () => { act(() => { unregisterArenaPalette('a'); }); });
  assert.equal(read(), 'dark|dark,light,high-contrast');
  cleanup();
});
