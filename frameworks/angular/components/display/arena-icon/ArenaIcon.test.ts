/* A glyph is one svg in the host that draws a use of a sprite symbol, named by the class list the
 * caller hands in and served from the href the project provides. Without a glyph token, or
 * without a sprite, it draws nothing and says so once. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { forgetArenaWarnings } from '../../../WarnOnce';
import { ARENA_ICONS, provideArenaIcons } from '../../../ArenaIcons';
import { ArenaIcon } from './ArenaIcon';
import manifest from './ArenaIcon.classes.generated';

@Component({
  selector: 'icon-test-host',
  standalone: true,
  imports: [ArenaIcon],
  template: '<arena-icon [icon]="icon" />',
})
class IconHost {
  icon = 'ph-bold ph-plus';
}

const NO_SPRITE = 'ArenaIcon has no sprite: hand the URL of the icons-<hash>.svg arena build writes to ArenaIconsProvider (React) or provideArenaIcons (Angular).';

let warnings: string[] = [];
const warn = console.warn;

beforeEach(() => {
  TestBed.resetTestingModule();
  forgetArenaWarnings();
  warnings = [];
  console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); };
});

afterEach(() => {
  console.warn = warn;
  TestBed.resetTestingModule();
});

function render(icon: string, href: string | null = '/a/icons-1.svg') {
  TestBed.configureTestingModule({ providers: [href === null ? { provide: ARENA_ICONS, useValue: null } : provideArenaIcons(href)] });
  const fixture = TestBed.createComponent(IconHost);
  fixture.componentInstance.icon = icon;
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement.querySelector('arena-icon') as HTMLElement };
}

test('draws a use of the sprite symbol the class list names', () => {
  const { fixture, host } = render('ph-bold ph-plus');
  try {
    const use = host.querySelector('svg[aria-hidden="true"][focusable="false"] > use');
    assert.ok(use, 'no svg > use inside the host');
    assert.equal(use.getAttribute('href'), `/a/icons-1.svg#${['ph', 'bold', 'plus'].join('-')}`);
    assert.equal(host.querySelector('svg')?.namespaceURI, 'http://www.w3.org/2000/svg');
    assert.match(host.getAttribute('style') ?? '', /display:\s*contents/);
    assert.deepEqual(warnings, []);
  } finally {
    fixture.destroy();
  }
});

test('ph alone is the regular weight', () => {
  const { fixture, host } = render('ph ph-bell');
  try {
    assert.equal(host.querySelector('use')?.getAttribute('href'), `/a/icons-1.svg#${['ph', 'regular', 'bell'].join('-')}`);
  } finally {
    fixture.destroy();
  }
});

test('no glyph token renders nothing and warns once', () => {
  const { fixture, host } = render('ph-bold');
  try {
    assert.equal(host.querySelector('svg'), null);
    fixture.detectChanges();
    fixture.componentInstance.icon = 'ph-bold ';
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    assert.equal(warnings.length, 1);
    assert.match(warnings[0] ?? '', /no glyph/);
  } finally {
    fixture.destroy();
  }
});

test('no sprite renders nothing and warns once, with the shared text', () => {
  const { fixture, host } = render('ph-bold ph-plus', null);
  try {
    assert.equal(host.querySelector('svg'), null);
    const second = TestBed.createComponent(IconHost);
    second.detectChanges();
    second.destroy();
    assert.deepEqual(warnings, [`[arena] ${NO_SPRITE}`]);
  } finally {
    fixture.destroy();
  }
});

test('the part is icon and the root is the manifest\'s', () => {
  const { fixture, host } = render('ph-bold ph-plus');
  try {
    const svg = host.querySelector('svg') as Element;
    assert.equal(svg.getAttribute('data-arena-part'), manifest.parts.root);
    assert.equal(manifest.parts.root, 'icon');
    assert.equal(svg.getAttribute('class'), manifest.slots.root);
  } finally {
    fixture.destroy();
  }
});
