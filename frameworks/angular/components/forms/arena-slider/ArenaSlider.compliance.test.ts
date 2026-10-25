/* slider binds to each thumb, an element Arena draws and moves itself: every key the pattern requires
 * is pressed and its result read back, and the conditional states are rendered both ways. A vertical
 * thumb says so and a horizontal one does not, and a range thumb's bounds move with the other thumb. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaSliderOrientation } from '../../../Api.generated';
import { ArenaSlider } from './ArenaSlider';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-slider/ArenaSlider.behaviour.json');

@Component({
  selector: 'slider-compliance-host',
  standalone: true,
  imports: [ArenaSlider],
  template: `<arena-slider label="Volume" valueSuffix="%" [range]="range()" [orientation]="orientation()"
                           [value]="value()" [valueEnd]="valueEnd()" (valueChange)="value.set($event)" (valueEndChange)="valueEnd.set($event)" />`,
})
class Host {
  readonly range = signal(false);
  readonly orientation = signal<ArenaSliderOrientation>('horizontal');
  readonly value = signal<number | undefined>(50);
  readonly valueEnd = signal<number | undefined>(undefined);
}

function render(patch: { range?: boolean; orientation?: ArenaSliderOrientation; value?: number; valueEnd?: number } = {}) {
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  if (patch.range !== undefined) host.range.set(patch.range);
  if (patch.orientation !== undefined) host.orientation.set(patch.orientation);
  if ('value' in patch) host.value.set(patch.value);
  if ('valueEnd' in patch) host.valueEnd.set(patch.valueEnd);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const thumbs = [...root.querySelectorAll('[role="slider"]')] as HTMLElement[];
  const press = (key: string, thumb = thumbs[0]!) => {
    thumb.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const now = (thumb = thumbs[0]!) => thumb.getAttribute('aria-valuenow');
  return { fixture, root, thumbs, press, now };
}

test('a vertical thumb says so, and a horizontal one carries no orientation', () => {
  const down = render({ orientation: 'vertical' });
  try { assert.equal(down.thumbs[0]!.getAttribute('aria-orientation'), 'vertical'); } finally { down.fixture.destroy(); }
  const across = render();
  try { assert.equal(across.thumbs[0]!.getAttribute('aria-orientation'), null); } finally { across.fixture.destroy(); }
});

test('each thumb of a range is a slider whose bounds are the other thumb', () => {
  const { fixture, thumbs } = render({ range: true, value: 30, valueEnd: 70 });
  try {
    assert.deepEqual(thumbs.map((one) => [one.getAttribute('aria-valuemin'), one.getAttribute('aria-valuemax')]), [['0', '70'], ['30', '100']]);
  } finally { fixture.destroy(); }
});

test('the host clears the name it takes as a member', () => {
  const { fixture, root } = render();
  try { assert.equal((root.querySelector('arena-slider') as HTMLElement).getAttribute('name'), null); } finally { fixture.destroy(); }
});

test('ArenaSlider meets the slider pattern on its thumb', () => {
  const { fixture, root, thumbs, press, now } = render();
  try {
    const thumb = thumbs[0]!;
    press('ArrowRight');
    const right = now() === '51';
    press('ArrowUp');
    const up = now() === '52';
    press('ArrowLeft');
    const left = now() === '51';
    press('ArrowDown');
    const down = now() === '50';
    press('Home');
    const home = now() === '0';
    press('End');
    const end = now() === '100';
    assertPattern({
      root,
      bindingPath: BINDING,
      subjects: { default: thumb },
      behavioural: {
        'keyboard.ArrowRight': right,
        'keyboard.ArrowUp': up,
        'keyboard.ArrowLeft': left,
        'keyboard.ArrowDown': down,
        'keyboard.Home': home,
        'keyboard.End': end,
        'states.valuenow': now() === '100',
        'states.valuemin': thumb.getAttribute('aria-valuemin') === '0',
        'states.valuemax': thumb.getAttribute('aria-valuemax') === '100',
        'states.valuetext': thumb.getAttribute('aria-valuetext') === '100%',
        'states.orientation': thumb.getAttribute('aria-orientation') === null,
      },
    });
  } finally { fixture.destroy(); }
});
