/* State written onto the shared document outlives the file that wrote it, so every test
 * here clears the root element's classes and the storage key it touched. */

import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaThemeService, provideArenaThemes, arenaThemeClass, ARENA_DEFAULT_THEMES, ArenaThemeConfig } from './ArenaThemeService';

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
  localStorage.removeItem('arena-theme');
}

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
