/* State written onto the shared document outlives the file that wrote it, so every test
 * here clears the root element's classes and the storage key it touched. */

import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import {
  ArenaThemeService, provideArenaThemes, arenaThemeClass, ARENA_DEFAULT_THEMES, ArenaThemeConfig, RUNTIME_CACHE_KEY,
  type ArenaRuntimePalette,
} from './ArenaThemeService';
import { markRuntimePalettes, runtimePalette } from '../test/RuntimePalette';

const THREE: ArenaThemeConfig = {
  palettes: [
    { name: 'dark', polarity: 'dark' },
    { name: 'light', polarity: 'light' },
    { name: 'high-contrast', polarity: 'light' },
  ],
  default: 'dark',
};

function service(config?: ArenaThemeConfig): ArenaThemeService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: config ? [provideArenaThemes(config)] : [] });
  return TestBed.inject(ArenaThemeService);
}

function clean(): void {
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
  localStorage.removeItem('arena-theme');
  localStorage.removeItem(RUNTIME_CACHE_KEY);
}

const root = document.documentElement;
const hooks = () => ['arena-polarity-dark', 'arena-polarity-light'].filter((name) => root.classList.contains(name));
const propertiesOf = (palette: ArenaRuntimePalette) => Object.keys(palette.properties);


test('with no configuration the layer still answers dark and light', () => {
  clean();
  const theme = service();
  assert.deepEqual(theme.palettes.map((p) => p.name), ['dark', 'light']);
  assert.equal(theme.fallback, 'dark');
  clean();
});

test('the default palette wears no class, because it is the one on :root', () => {
  clean();
  const theme = service(THREE);
  theme.set('dark');
  TestBed.tick();
  assert.equal(document.documentElement.className.trim(), '');
  clean();
});

test('any other palette wears arena-<name>, and only one at a time', () => {
  clean();
  const theme = service(THREE);

  theme.set('high-contrast');
  TestBed.tick();
  assert.ok(document.documentElement.classList.contains(arenaThemeClass('high-contrast')));
  assert.equal(document.documentElement.classList.contains(arenaThemeClass('light')), false);

  theme.set('light');
  TestBed.tick();
  assert.ok(document.documentElement.classList.contains(arenaThemeClass('light')));
  assert.equal(document.documentElement.classList.contains(arenaThemeClass('high-contrast')), false,
    'the previous palette is removed, or two skins fight over the same custom property');
  clean();
});

test('a name no palette declares is refused by name rather than applied silently', () => {
  clean();
  localStorage.setItem('arena-theme', 'dark');
  const theme = service(THREE);
  assert.throws(() => theme.set('midnight'), /no palette named "midnight"/);
  assert.equal(theme.theme(), 'dark', 'a refused name leaves the current one standing');
  clean();
});

test('toggle walks the declared palettes in order and wraps', () => {
  clean();
  const theme = service(THREE);
  theme.set('dark');
  theme.toggle();
  assert.equal(theme.theme(), 'light');
  theme.toggle();
  assert.equal(theme.theme(), 'high-contrast');
  theme.toggle();
  assert.equal(theme.theme(), 'dark');
  clean();
});

test('with the two default palettes toggle is the dark and light switch it always was', () => {
  clean();
  const theme = service();
  theme.set('dark');
  theme.toggle();
  assert.equal(theme.theme(), 'light');
  TestBed.tick();
  assert.ok(document.documentElement.classList.contains('arena-light'));
  clean();
});

test('a stored choice is honoured, and one naming a removed palette is not', () => {
  clean();
  localStorage.setItem('arena-theme', 'high-contrast');
  assert.equal(service(THREE).theme(), 'high-contrast');

  localStorage.setItem('arena-theme', 'midnight');
  const recovered = service(THREE).theme();
  assert.notEqual(recovered, 'midnight', 'a palette that no longer exists is never applied');
  assert.ok(THREE.palettes.some((p) => p.name === recovered), 'and what replaces it is a declared palette');
  clean();
});

test('with nothing stored, the first palette of the preferred polarity wins', () => {
  clean();
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = service(THREE);
  assert.equal(theme.polarityOf(theme.theme()), prefersLight ? 'light' : 'dark');
  assert.equal(theme.theme(), prefersLight ? 'light' : 'dark',
    'of the two light palettes it is the first declared, never the last');
  clean();
});

test('injecting the service stores nothing, so a first visit keeps following the system', () => {
  clean();
  service(THREE);
  TestBed.tick();
  assert.equal(localStorage.getItem('arena-theme'), null);
  clean();
});

test('set stores the choice under arena-theme', () => {
  clean();
  const theme = service(THREE);
  theme.set('light');
  TestBed.tick();
  assert.equal(localStorage.getItem('arena-theme'), 'light');
  clean();
});

test('toggle stores the choice under arena-theme', () => {
  clean();
  const theme = service(THREE);
  theme.set('dark');
  theme.toggle();
  TestBed.tick();
  assert.equal(localStorage.getItem('arena-theme'), 'light');
  clean();
});

test('polarity is what a palette answers prefers-color-scheme with', () => {
  clean();
  const theme = service(THREE);
  assert.equal(theme.polarityOf('high-contrast'), 'light');
  assert.equal(theme.polarityOf('dark'), 'dark');
  assert.equal(theme.polarityOf('midnight'), null);
  clean();
});

test('the shipped default is two palettes, which is what the package carries', () => {
  assert.deepEqual(ARENA_DEFAULT_THEMES.palettes, [
    { name: 'dark', polarity: 'dark' },
    { name: 'light', polarity: 'light' },
  ]);
  assert.equal(ARENA_DEFAULT_THEMES.default, 'dark');
});

test('register then set paints the hook and every property, and no declared class', () => {
  clean();
  const unmark = markRuntimePalettes();
  const theme = service(THREE);
  const dusk = runtimePalette('dusk', 'dark');
  theme.register(dusk);
  theme.set('dusk');
  TestBed.tick();
  assert.deepEqual(hooks(), ['arena-polarity-dark']);
  assert.equal(root.classList.contains('arena-dusk'), false, 'a runtime palette has no class of its own');
  for (const [name, value] of Object.entries(dusk.properties)) assert.equal(root.style.getPropertyValue(name), value, name);
  assert.equal(theme.polarityOf('dusk'), 'dark');
  assert.equal(theme.runtimePalette('dusk')?.name, 'dusk');
  assert.equal(theme.runtimePalette('midnight'), null);
  assert.equal(localStorage.getItem('arena-theme'), 'dusk');
  assert.deepEqual(JSON.parse(localStorage.getItem(RUNTIME_CACHE_KEY)!), dusk);
  unmark();
  clean();
});

test('re-registering with the other polarity flips the hook and leaves no old property', () => {
  clean();
  const unmark = markRuntimePalettes();
  const theme = service(THREE);
  theme.register(runtimePalette('dusk', 'dark'));
  theme.set('dusk');
  TestBed.tick();
  const lighter: ArenaRuntimePalette = { name: 'dusk', polarity: 'light', properties: { '--color-base-100': '#fafafa', '--arena-palette': 'dusk' } };
  theme.register(lighter);
  TestBed.tick();
  assert.deepEqual(hooks(), ['arena-polarity-light']);
  assert.equal(root.style.getPropertyValue('--color-base-100'), '#fafafa');
  for (const stale of ['--color-base-200', '--color-base-content', '--level-2']) {
    assert.equal(root.style.getPropertyValue(stale), '', `${stale} outlived the palette that set it`);
  }
  assert.equal(JSON.parse(localStorage.getItem(RUNTIME_CACHE_KEY)!).polarity, 'light', 'the cache follows the registration');
  unmark();
  clean();
});

test('setting a declared palette removes every runtime property, the hook and the cache', () => {
  clean();
  const unmark = markRuntimePalettes();
  const theme = service(THREE);
  const dusk = runtimePalette('dusk', 'dark');
  theme.register(dusk);
  theme.set('dusk');
  TestBed.tick();
  theme.set('light');
  TestBed.tick();
  assert.deepEqual(hooks(), []);
  for (const name of propertiesOf(dusk)) assert.equal(root.style.getPropertyValue(name), '', name);
  assert.ok(root.classList.contains('arena-light'));
  assert.equal(localStorage.getItem(RUNTIME_CACHE_KEY), null);
  unmark();
  clean();
});

test('toggle cycles the declared palettes, then the registered ones, and wraps', () => {
  clean();
  const unmark = markRuntimePalettes();
  const theme = service();
  theme.register(runtimePalette('dusk', 'dark'));
  theme.set('dark');
  theme.toggle();
  assert.equal(theme.theme(), 'light');
  theme.toggle();
  assert.equal(theme.theme(), 'dusk');
  theme.toggle();
  assert.equal(theme.theme(), 'dark');
  assert.deepEqual(theme.palettes.map((p) => p.name), ['dark', 'light'], 'palettes stays the declared list');
  unmark();
  clean();
});

test('set refuses an unknown name and lists the declared and the registered palettes', () => {
  clean();
  const unmark = markRuntimePalettes();
  const theme = service(THREE);
  theme.register(runtimePalette('dusk', 'dark'));
  assert.throws(() => theme.set('midnight'), /no palette named "midnight"; the declared palettes are dark, light, high-contrast; the registered palettes are dusk/);
  unmark();
  clean();
});

test('a stored cache restores the palette on first read, before the stylesheet is checked', () => {
  clean();
  const dusk = runtimePalette('dusk', 'dark');
  localStorage.setItem('arena-theme', 'dusk');
  localStorage.setItem(RUNTIME_CACHE_KEY, JSON.stringify(dusk));
  const theme = service(THREE);
  assert.equal(theme.theme(), 'dusk');
  assert.deepEqual(theme.runtimePalette('dusk'), dusk);
  TestBed.tick();
  assert.deepEqual(hooks(), ['arena-polarity-dark']);
  assert.equal(root.style.getPropertyValue('--color-base-100'), dusk.properties['--color-base-100']);
  clean();
});

test('a cache naming a declared palette, malformed JSON, a foreign property or another name is ignored', () => {
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const followsDevice = (theme: ArenaThemeService) => {
    assert.equal(theme.theme(), prefersLight ? 'light' : 'dark');
    assert.equal(theme.runtimePalette('dusk'), null);
    clean();
  };
  const cases: [string, string][] = [
    ['a declared name', JSON.stringify(runtimePalette('light', 'light'))],
    ['malformed JSON', '{not json'],
    ['a foreign property', JSON.stringify({ ...runtimePalette('dusk', 'dark'), properties: { '--evil': 'url(x)', '--arena-palette': 'dusk' } })],
    ['a colour that is not #rrggbb', JSON.stringify({ ...runtimePalette('dusk', 'dark'), properties: { '--color-base-100': 'red', '--arena-palette': 'dusk' } })],
    ['another name', JSON.stringify(runtimePalette('other', 'dark'))],
  ];
  for (const [label, cache] of cases) {
    clean();
    localStorage.setItem('arena-theme', label === 'a declared name' ? 'light' : 'dusk');
    localStorage.setItem(RUNTIME_CACHE_KEY, cache);
    const theme = service(THREE);
    if (label === 'a declared name') {
      assert.equal(theme.theme(), 'light');
      assert.equal(theme.runtimePalette('light'), null, 'a declared name is never registered from the cache');
      clean();
    } else {
      followsDevice(theme);
    }
  }
});

test('register without the root marker throws naming runtimePalettes, and registers nothing', () => {
  clean();
  const theme = service(THREE);
  assert.throws(() => theme.register(runtimePalette('dusk', 'dark')), /"runtimePalettes": true in arena\.config\.json/);
  assert.equal(theme.runtimePalette('dusk'), null);
  clean();
});

test('register refuses a declared name, and a palette that breaks the property rules', () => {
  clean();
  const unmark = markRuntimePalettes();
  const theme = service(THREE);
  assert.throws(() => theme.register(runtimePalette('light', 'light')), /"light" is a palette the theme config declares/);
  const broken = (properties: Record<string, string>) => () => theme.register({ name: 'dusk', polarity: 'dark', properties });
  assert.throws(broken({ '--evil': '1' }), /--evil is not a --color-\*/);
  assert.throws(broken({ '--color-base-100': 'red' }), /not #rrggbb/);
  assert.throws(broken({ '--level-2': '8px' }), /not a percentage/);
  assert.throws(broken({ '--arena-palette': 'other' }), /--arena-palette is "other"/);
  assert.equal(theme.runtimePalette('dusk'), null);
  unmark();
  clean();
});
