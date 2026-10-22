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

function marked(body: () => void): () => void {
  return () => {
    clean();
    const unmark = markRuntimePalettes();
    try { body(); } finally { unmark(); clean(); }
  };
}

function unmarked(body: () => void): () => void {
  return () => {
    clean();
    try { body(); } finally { clean(); }
  };
}
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

test('register then set paints the hook and every property, and no declared class', marked(() => {
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
}));

test('re-registering with the other polarity flips the hook and leaves no old property', marked(() => {
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
}));

test('setting a declared palette removes every runtime property, the hook and the cache', marked(() => {
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
}));

test('toggle cycles the declared palettes, then the registered ones in registration order, and wraps', marked(() => {
  const theme = service();
  theme.register(runtimePalette('dusk', 'dark'));
  theme.register(runtimePalette('dawn', 'light', '#fafafa'));
  theme.set('dark');
  for (const next of ['light', 'dusk', 'dawn', 'dark']) {
    theme.toggle();
    assert.equal(theme.theme(), next);
  }
  assert.deepEqual(theme.palettes.map((p) => p.name), ['dark', 'light'], 'palettes stays the declared list');
}));

test('re-registering a name keeps its place in the toggle order', marked(() => {
  const theme = service();
  theme.register(runtimePalette('dusk', 'dark'));
  theme.register(runtimePalette('dawn', 'light', '#fafafa'));
  theme.register(runtimePalette('dusk', 'light', '#fafafa'));
  assert.deepEqual(theme.runtimePalettes().map((p) => p.name), ['dusk', 'dawn']);
  assert.equal(theme.runtimePalette('dusk')?.polarity, 'light', 'and the new palette replaces the old');
  theme.set('light');
  for (const next of ['dusk', 'dawn', 'dark']) {
    theme.toggle();
    assert.equal(theme.theme(), next);
  }
}));

test('set refuses an unknown name, and lists the registered palettes only when there are some', marked(() => {
  const theme = service(THREE);
  assert.throws(() => theme.set('midnight'), (error: Error) =>
    error.message === 'ArenaThemeService: no palette named "midnight"; the declared palettes are dark, light, high-contrast');
  theme.register(runtimePalette('dusk', 'dark'));
  assert.throws(() => theme.set('midnight'), /no palette named "midnight"; the declared palettes are dark, light, high-contrast; the registered palettes are dusk$/);
}));

test('a stored cache restores the palette on first read, before the stylesheet is checked', unmarked(() => {
  const dusk = runtimePalette('dusk', 'dark');
  localStorage.setItem('arena-theme', 'dusk');
  localStorage.setItem(RUNTIME_CACHE_KEY, JSON.stringify(dusk));
  const theme = service(THREE);
  assert.equal(theme.theme(), 'dusk');
  assert.deepEqual(theme.runtimePalette('dusk'), dusk);
  TestBed.tick();
  assert.deepEqual(hooks(), ['arena-polarity-dark']);
  assert.equal(root.style.getPropertyValue('--color-base-100'), dusk.properties['--color-base-100']);
}));

test('a cache naming a declared palette, malformed JSON, a foreign property, a bad colour or another name is ignored', unmarked(() => {
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const dusk = runtimePalette('dusk', 'dark');
  const cases: [string, string][] = [
    ['a declared name', JSON.stringify(runtimePalette('light', 'light'))],
    ['malformed JSON', '{not json'],
    ['a foreign property', JSON.stringify({ ...dusk, properties: { '--evil': 'url(x)', '--arena-palette': 'dusk' } })],
    ['a colour that is not lower-case #rrggbb', JSON.stringify({ ...dusk, properties: { '--color-base-100': '#1B1830', '--arena-palette': 'dusk' } })],
    ['another name', JSON.stringify(runtimePalette('other', 'dark'))],
    ['no --arena-palette', JSON.stringify({ ...dusk, properties: { '--color-base-100': '#1b1830' } })],
  ];
  for (const [label, cache] of cases) {
    clean();
    localStorage.setItem('arena-theme', 'dusk');
    localStorage.setItem(RUNTIME_CACHE_KEY, cache);
    const theme = service(THREE);
    assert.equal(theme.theme(), prefersLight ? 'light' : 'dark', `${label}: the page follows the device`);
    assert.equal(theme.runtimePalette('dusk'), null, label);
    assert.equal(theme.runtimePalette('light'), null, `${label}: a declared name is never registered from the cache`);
  }
}));

test('register without the root marker throws naming runtimePalettes, and registers nothing', unmarked(() => {
  const theme = service(THREE);
  assert.throws(() => theme.register(runtimePalette('dusk', 'dark')), (error: Error) =>
    error.message === 'ArenaThemeService.register: this page\'s stylesheet was built without "runtimePalettes": true in arena.config.json, so no runtime palette can paint here');
  assert.equal(theme.runtimePalette('dusk'), null);
}));

test('register refuses a declared name before it looks at the marker', unmarked(() => {
  const theme = service(THREE);
  assert.throws(() => theme.register(runtimePalette('light', 'light')), (error: Error) =>
    error.message === 'ArenaThemeService.register: no palette named "light" can be registered, because the theme config declares it; the declared palettes are dark, light, high-contrast');
}));

test('register refuses a palette that breaks the shape rules, with the canonical texts', marked(() => {
  const theme = service(THREE);
  const fails = (palette: ArenaRuntimePalette, text: string) =>
    assert.throws(() => theme.register(palette), (error: Error) => error.message === `ArenaThemeService.register: ${text}`);
  const props = (properties: Record<string, string>): ArenaRuntimePalette => ({ name: 'dusk', polarity: 'dark', properties });
  fails({ name: 'dusk', polarity: 'dim' as 'dark', properties: {} }, 'polarity "dim" is neither dark nor light');
  fails(props({ '--evil': '1' }), '"--evil" is not a property a palette carries; only --color-*, --level-* and --arena-palette are');
  fails(props({ '--color-base-100': 'red' }), '--color-base-100 is "red", not a #rrggbb colour');
  fails(props({ '--color-base-100': '#AABBCC' }), '--color-base-100 is "#AABBCC", not a #rrggbb colour');
  fails(props({ '--level-2': '8px' }), '--level-2 is "8px", not a percentage such as 40%');
  fails(props({ '--arena-palette': 'other' }), '--arena-palette is "other" and the palette is named "dusk"');
  fails(props({ '--color-base-100': '#aabbcc' }), '--arena-palette is missing; a runtime palette carries its own name');
  fails(props({}), '--arena-palette is missing; a runtime palette carries its own name');
  assert.equal(theme.runtimePalette('dusk'), null);
}));

test('a name that is not kebab case, or an array of properties, is refused at register', marked(() => {
  const theme = service(THREE);
  assert.throws(() => theme.register(runtimePalette('My Palette', 'dark')), (error: Error) =>
    error.message === 'ArenaThemeService.register: "My Palette" is not a kebab-case name');
  assert.throws(() => theme.register({ ...runtimePalette('dusk', 'dark'), properties: [] as never }), /properties is not an object/);
  assert.equal(theme.runtimePalette('My Palette'), null);
}));

test('a cache named with a leading digit is ignored when stored as the current name', unmarked(() => {
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  localStorage.setItem('arena-theme', '9dusk');
  localStorage.setItem(RUNTIME_CACHE_KEY, JSON.stringify(runtimePalette('9dusk', 'dark')));
  const theme = service(THREE);
  assert.equal(theme.theme(), prefersLight ? 'light' : 'dark');
  assert.equal(theme.runtimePalette('9dusk'), null);
}));
