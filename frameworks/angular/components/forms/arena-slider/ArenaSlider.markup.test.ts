/* What the slider draws, read from its markup: two thumbs are named by the label and their own
 * word, the readout writes the span, the fill carries both ends, a range posts two hidden inputs
 * under one name, a start above the end is drawn at the end, and a blank label throws. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ArenaSlider } from './ArenaSlider';

function render(inputs: Record<string, unknown> = {}) {
  const fixture: ComponentFixture<ArenaSlider> = TestBed.createComponent(ArenaSlider);
  fixture.componentRef.setInput('label', 'Price');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  try { fixture.detectChanges(); } catch (error) { fixture.destroy(); throw error; }
  const root = fixture.nativeElement as HTMLElement;
  const thumbs = [...root.querySelectorAll('[role="slider"]')] as HTMLElement[];
  return { fixture, root, thumbs };
}

test('two thumbs bound each other, are named by the label and their own word, and read as one span', () => {
  const slider = render({ range: true, value: 20, valueEnd: 75, valuePrefix: '$' });
  try {
    const [start, end] = slider.thumbs;
    assert.deepEqual([start!, end!].map((one) => ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'].map((name) => one.getAttribute(name))), [['20', '0', '75'], ['75', '20', '100']]);
    const label = slider.root.querySelector('[data-arena-part="slider.label"]')!.id;
    const words = [...slider.root.querySelectorAll('[data-arena-part="slider.thumb-label"]')] as HTMLElement[];
    assert.deepEqual(words.map((one) => one.textContent), ['Minimum', 'Maximum']);
    assert.equal(start!.getAttribute('aria-labelledby'), `${label} ${words[0]!.id}`);
    assert.equal(end!.getAttribute('aria-labelledby'), `${label} ${words[1]!.id}`);
    assert.equal(slider.root.querySelector('[data-arena-part="slider.value"]')?.textContent?.trim(), '$20 – $75');
    const track = slider.root.querySelector('[data-arena-part="slider.track"]') as HTMLElement;
    assert.equal(track.style.getPropertyValue('--arena-slider-from'), '0.2');
    assert.equal(track.style.getPropertyValue('--arena-slider-to'), '0.75');
  } finally { slider.fixture.destroy(); }
});

test('in range mode the end starts at the top step and a start above the end is drawn at the end', () => {
  const top = render({ range: true, max: 10, step: 3 });
  try {
    assert.equal(top.thumbs[1]!.getAttribute('aria-valuenow'), '9');
  } finally { top.fixture.destroy(); }
  const crossed = render({ range: true, value: 80, valueEnd: 30 });
  try {
    assert.equal(crossed.thumbs[0]!.getAttribute('aria-valuenow'), '30');
  } finally { crossed.fixture.destroy(); }
});

test('a form receives the number through a hidden input, and a range posts two under one name', () => {
  const pair = render({ name: 'price', range: true, value: 20, valueEnd: 75 });
  try {
    const hidden = [...pair.root.querySelectorAll('input[type="hidden"]')] as HTMLInputElement[];
    assert.deepEqual(hidden.map((one) => [one.getAttribute('name'), one.value]), [['price', '20'], ['price', '75']]);
  } finally { pair.fixture.destroy(); }
});

test('a blank label throws, because nothing can derive what the range measures', () => {
  assert.throws(() => render({ label: ' ' }), /ArenaSlider:/);
});
