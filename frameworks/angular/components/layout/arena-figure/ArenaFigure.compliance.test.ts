/* `none` requires nothing, so assertPattern alone would pass over a figure that had grown a role
 * or a tab stop. The claims the binding makes are that the figure is inert and that it claims
 * neither `img` nor the chart pattern it looks like a near miss for, and those are what the hand
 * assertions check. The real figure element matters as much: a figcaption outside a figure is
 * associated with nothing, and the host cannot be that figure because it is not one. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaFigure } from './ArenaFigure';
import manifest from './ArenaFigure.classes.generated';
import { ArenaFallback, ArenaMedia, ArenaOverlay } from '../../../ProjectionMarkers';
import { assertPattern, isFocusable, ANGULAR_COMPONENTS, TAILWIND_COMPONENTS, REPO } from '../../../test/Compliance';
import { assertNoNode } from '../../../test/NodeAssert';

const source = JSON.parse(readFileSync(join(TAILWIND_COMPONENTS, 'layout/arena-figure/ArenaFigure.manifest.json'), 'utf8')) as { slots: { frame: string; panel: string } };
const family = JSON.parse(readFileSync(join(REPO, 'frameworks/tailwind/vocabulary/arena-ratio/Ratio.family.json'), 'utf8')) as { axis: string; default: string; variants: Record<string, string> };
const BINDING = join(ANGULAR_COMPONENTS, 'layout/arena-figure/ArenaFigure.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaFigure, ArenaMedia, ArenaFallback, ArenaOverlay],
  template: `
    <arena-figure [caption]="caption">
      @if (withMedia) { <img media src="lot.png" alt="Finca El Injerto" /> }
      <i fallback class="ph-bold ph-coffee-bean" aria-hidden="true"></i>
      @if (withOverlay) { <span overlay>In stock</span> }
    </arena-figure>
  `,
})
class FigureHost {
  caption: string | undefined = 'Kochere, 2050 m';
  withMedia = false;
  withOverlay = false;
}

function render(patch: Partial<FigureHost> = {}) {
  const fixture = TestBed.createComponent(FigureHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture;
}

const figureOf = (fixture: ReturnType<typeof render>) =>
  fixture.nativeElement.querySelector('figure') as HTMLElement;

test('arena-figure is a frame and nothing a user can act on', () => {
  const fixture = render();
  try {
    const figure = figureOf(fixture);
    assert.ok(figure, 'the component renders no figure element at all');
    assert.equal(figure.getAttribute('role'), null,
      'an img role here would claim the frame IS the picture, which it is not');
    for (const el of [figure, ...Array.from(figure.querySelectorAll('*'))]) {
      assert.equal(isFocusable(el as Element), false,
        `<${el.tagName.toLowerCase()}> inside a figure is reachable by keyboard, so a user tabs to something inert`);
    }

    assertPattern({ root: figure, bindingPath: BINDING, subjects: { default: figure } });
  } finally { fixture.destroy(); }
});

test('the caption is a real figcaption inside the real figure', () => {
  const fixture = render();
  try {
    const caption = figureOf(fixture).querySelector('figcaption');
    assert.ok(caption, 'a figcaption outside a figure is associated with nothing');
    assert.equal(caption?.parentElement?.tagName.toLowerCase(), 'figure');
    assert.equal(caption?.textContent?.trim(), 'Kochere, 2050 m');
  } finally { fixture.destroy(); }
});

test('no caption renders no caption element at all, rather than an empty one', () => {
  const fixture = render({ caption: undefined });
  try {
    assertNoNode(figureOf(fixture).querySelector('figcaption'),
      'a caption element with nothing in it is worse than none at all');
  } finally { fixture.destroy(); }
});

test('the fallback draws only when there is no media, because it is a state and not an error', () => {
  const empty = render();
  try {
    assert.ok(figureOf(empty).querySelector('i'), 'the fallback is what an empty frame shows');
  } finally { empty.destroy(); }

  const filled = render({ withMedia: true });
  try {
    const figure = figureOf(filled);
    assert.ok(figure.querySelector('img'));
    assertNoNode(figure.querySelector('i'),
      'a fallback drawn under a picture is a second thing in the frame nobody asked for');
  } finally { filled.destroy(); }
});

test('the frame carries the ratio channel on its class and no inline shape', () => {
  const fixture = render();
  try {
    const frame = figureOf(fixture).firstElementChild as HTMLElement;
    assert.equal(frame.hasAttribute('style'), false);
    assert.ok(frame.classList.contains(manifest.slots.frame));
    const [, channel, value] = /^\[(--[\w-]+):(.+)\]$/.exec(family.variants[family.default]) ?? [];
    assert.ok(channel && value);
    assert.ok(source.slots['frame'].split(' ').includes(`aspect-[var(${channel},var(${family.axis},${value}))]`));
  } finally { fixture.destroy(); }
});

@Component({
  standalone: true,
  imports: [ArenaFigure],
  template: `<arena-figure class="arena-ratio-wide" caption="c"></arena-figure>`,
})
class OptionHost {}

test('an option class written on the host stays on the host, where the frame reads it', () => {
  const fixture = TestBed.createComponent(OptionHost);
  try {
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('arena-figure') as HTMLElement;
    assert.ok(host.classList.contains('arena-ratio-wide'));
    assert.equal((host.querySelector('figure') as HTMLElement).hasAttribute('style'), false);
  } finally { fixture.destroy(); }
});
