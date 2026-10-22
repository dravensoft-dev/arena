/* A palette scope paints a ground and provides a value, so the suite asks for exactly those two
 * things: the host's classes, and what a reader below it and a reader outside it answer. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaThemeService } from '../../../theme/ArenaThemeService';
import { ArenaPaletteScope, injectArenaPalette } from './ArenaPaletteScope';
import { markRuntimePalettes, runtimePalette } from '../../../test/RuntimePalette';

afterEach(() => {
  TestBed.inject(ArenaThemeService).set('dark');
  TestBed.tick();
  try { window.localStorage?.removeItem('arena-theme'); } catch { void 0; }
});

@Component({ selector: 'palette-reader', standalone: true, template: '{{ palette() }}' })
class Reader { readonly palette = injectArenaPalette(); }

@Component({
  selector: 'palette-test-host',
  standalone: true,
  imports: [ArenaPaletteScope, Reader],
  template: `
    <palette-reader id="bare" />
    <div id="outer" arenaPalette="dark" class="mine">
      <palette-reader id="outer-reader" />
      <section id="inner" [arenaPalette]="inner()"><palette-reader id="inner-reader" /></section>
    </div>`,
})
class Host { readonly inner = signal('light'); }

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return fixture;
}
const pick = (fixture: { nativeElement: HTMLElement }, id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;

@Component({ selector: 'scope-only-host', standalone: true, imports: [ArenaPaletteScope], template: `<div arenaPalette="light"><div arenaPalette="dark"></div></div>` })
class ScopeOnly {}

test("paints the island's ground", () => {
  const fixture = render();
  const inner = pick(fixture, 'inner');
  assert.ok(inner.classList.contains('arena-light'));
  assert.ok(inner.classList.contains('arena-palette-scope__root'));
  assert.equal(inner.getAttribute('data-arena-part'), 'palette-scope');
  assert.ok(pick(fixture, 'outer').classList.contains('mine'), "the adopter's own class stays");
});

test('a palette change on the same host removes the previous class', () => {
  const fixture = render();
  fixture.componentInstance.inner.set('dark');
  fixture.detectChanges();
  const inner = pick(fixture, 'inner');
  assert.ok(inner.classList.contains('arena-dark'));
  assert.equal(inner.classList.contains('arena-light'), false);
  assert.ok(pick(fixture, 'outer').classList.contains('mine'), "the adopter's own class stays after the change");
});

test('the default palette is an island too', () => {
  const fixture = render();
  fixture.componentInstance.inner.set('dark');
  fixture.detectChanges();
  TestBed.inject(ArenaThemeService).set('light');
  fixture.detectChanges();
  assert.ok(pick(fixture, 'inner').classList.contains('arena-dark'));
});

test("provides the nearest scope's palette", () => {
  const fixture = render();
  assert.equal(pick(fixture, 'inner-reader').textContent, 'light');
  assert.equal(pick(fixture, 'outer-reader').textContent, 'dark');
});

test('answers the page theme outside any scope', () => {
  const fixture = render();
  const service = TestBed.inject(ArenaThemeService);
  service.set('light');
  fixture.detectChanges();
  assert.equal(pick(fixture, 'bare').textContent, 'light');
  service.set('dark');
  fixture.detectChanges();
  assert.equal(pick(fixture, 'bare').textContent, 'dark');
});

test('refuses a palette the theme config does not declare', () => {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.inner.set('sepia');
  assert.throws(() => fixture.detectChanges(), /ArenaPaletteScope: no palette named "sepia"; the declared palettes are dark, light/);
});

test('a scope naming a registered palette wears the hook and the properties', () => {
  TestBed.resetTestingModule();
  const unmark = markRuntimePalettes();
  try {
    const dusk = runtimePalette('dusk', 'dark');
    TestBed.inject(ArenaThemeService).register(dusk);
    const fixture = render();
    fixture.componentInstance.inner.set('dusk');
    fixture.detectChanges();
    const inner = pick(fixture, 'inner');
    assert.ok(inner.classList.contains('arena-polarity-dark'));
    assert.equal(inner.classList.contains('arena-dusk'), false);
    assert.ok(inner.classList.contains('arena-palette-scope__root'));
    for (const [name, value] of Object.entries(dusk.properties)) assert.equal(inner.style.getPropertyValue(name), value, name);
    assert.equal(pick(fixture, 'inner-reader').textContent, 'dusk');
    fixture.componentInstance.inner.set('light');
    fixture.detectChanges();
    assert.equal(inner.classList.contains('arena-polarity-dark'), false, 'leaving the runtime palette drops the hook');
    assert.equal(inner.style.getPropertyValue('--color-base-100'), '', 'and its properties');
  } finally { unmark(); }
});

test('an unknown name throws listing declared and registered', () => {
  TestBed.resetTestingModule();
  const unmark = markRuntimePalettes();
  try {
    TestBed.inject(ArenaThemeService).register(runtimePalette('dusk', 'dark'));
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.inner.set('sepia');
    assert.throws(() => fixture.detectChanges(), /ArenaPaletteScope: no palette named "sepia"; the declared palettes are dark, light; the registered palettes are dusk/);
  } finally { unmark(); }
});

test('a registered palette re-registered while a scope names it updates the host class and style', () => {
  TestBed.resetTestingModule();
  const unmark = markRuntimePalettes();
  try {
    const service = TestBed.inject(ArenaThemeService);
    service.register(runtimePalette('dusk', 'dark'));
    const fixture = render();
    fixture.componentInstance.inner.set('dusk');
    fixture.detectChanges();
    const inner = pick(fixture, 'inner');
    assert.ok(inner.classList.contains('arena-polarity-dark'));
    service.register({ name: 'dusk', polarity: 'light', properties: { '--color-base-100': '#fafafa', '--arena-palette': 'dusk' } });
    fixture.detectChanges();
    assert.ok(inner.classList.contains('arena-polarity-light'));
    assert.equal(inner.classList.contains('arena-polarity-dark'), false);
    assert.equal(inner.style.getPropertyValue('--color-base-100'), '#fafafa');
    assert.equal(inner.style.getPropertyValue('--color-base-200'), '', 'a property the new palette lacks stayed');
  } finally { unmark(); }
});

test('a scope naming a declared palette leaves the page root and the theme service alone', () => {
  TestBed.resetTestingModule();
  window.localStorage?.removeItem('arena-theme');
  const root = document.documentElement;
  const before = root.className;
  const fixture = TestBed.createComponent(ScopeOnly);
  fixture.detectChanges();
  assert.equal(root.className, before, 'the scope did not paint the page root');
  assert.equal(root.hasAttribute('style'), false);
});
