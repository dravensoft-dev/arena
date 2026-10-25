/* What a slider does under a finger and a key: a press on the track moves the nearest thumb there
 * and drags it, change follows every step and commit the settle, the axis follows the orientation and
 * the reading direction, two thumbs never cross, and a slider with no value bound holds its own.
 * happy-dom lays nothing out, so the track and the thumb are given a box. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { ArenaSlider, type ArenaSliderProps } from './ArenaSlider.tsx';

afterEach(cleanup);

const box = (width: number, height: number) => () => ({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON: () => ({}) }) as DOMRect;

function render(props: Partial<ArenaSliderProps> = {}, wrap?: (node: React.ReactElement) => React.ReactElement) {
  const heard: [string, number][] = [];
  const vertical = props.orientation === 'vertical';
  function Host() {
    const [value, write] = useState(props.value);
    const [valueEnd, writeEnd] = useState(props.valueEnd);
    const bound = { ...('value' in props ? { value } : {}), ...('valueEnd' in props ? { valueEnd } : {}) };
    return (
      <ArenaSlider label="Volume" {...props} {...bound}
        onValueChange={(next) => { heard.push(['change', next]); write(next); }} onCommit={(next) => heard.push(['commit', next])}
        onValueEndChange={(next) => { heard.push(['changeEnd', next]); writeEnd(next); }} onCommitEnd={(next) => heard.push(['commitEnd', next])} />
    );
  }
  const root = mount(wrap ? wrap(<Host />) : <Host />);
  const track = root.querySelector<HTMLElement>('[data-arena-part="slider.track"]')!;
  const thumbs = [...root.querySelectorAll<HTMLElement>('[role="slider"]')];
  track.getBoundingClientRect = vertical ? box(40, 220) : box(220, 40);
  for (const one of thumbs) one.getBoundingClientRect = box(20, 20);
  const pointer = (type: string, at: number, target: HTMLElement = track) => act(() => {
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, button: 0, clientX: vertical ? 20 : at, clientY: vertical ? at : 20 }));
  });
  const key = (name: string, thumb = thumbs[0]!) => act(() => {
    thumb.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  });
  const now = (thumb = thumbs[0]!) => Number(thumb.getAttribute('aria-valuenow'));
  return { root, track, thumbs, heard, pointer, key, now };
}

test('a press on the track moves the thumb there and a drag follows, with change on each step and commit once', () => {
  const slider = render({ value: 0 });
  slider.pointer('pointerdown', 110);
  assert.equal(slider.now(), 50);
  assert.equal(slider.root.ownerDocument.activeElement, slider.thumbs[0]);
  slider.pointer('pointermove', 160);
  slider.pointer('pointermove', 160);
  slider.pointer('pointerup', 160);
  assert.deepEqual(slider.heard, [['change', 50], ['change', 75], ['commit', 75]]);
});

test('a press on the thumb takes it without moving it, and a release where it began commits nothing', () => {
  const slider = render({ value: 40 });
  slider.pointer('pointerdown', 50, slider.thumbs[0]);
  slider.pointer('pointerup', 50, slider.thumbs[0]);
  assert.deepEqual(slider.heard, []);
});

test('a vertical track reads the pointer from the bottom, and right to left reads it from the end', () => {
  const down = render({ value: 0, orientation: 'vertical' });
  down.pointer('pointerdown', 60);
  assert.equal(down.now(), 75);
  cleanup();
  const mirrored = render({ value: 0 }, (node) => <div dir="rtl">{node}</div>);
  mirrored.pointer('pointerdown', 60);
  assert.equal(mirrored.now(), 75);
});

test('the four arrows step one, the page keys ten, Home and End reach the bounds, and each key commits', () => {
  const slider = render({ value: 50 });
  slider.key('ArrowRight');
  slider.key('ArrowUp');
  slider.key('ArrowLeft');
  slider.key('ArrowDown');
  slider.key('PageUp');
  slider.key('PageDown');
  slider.key('End');
  slider.key('End');
  slider.key('Home');
  assert.deepEqual(slider.heard.filter(([kind]) => kind === 'commit').map(([, value]) => value), [51, 52, 51, 50, 60, 50, 100, 0]);
  assert.equal(slider.heard.filter(([kind]) => kind === 'change').length, 8);
});

test('right to left swaps Left and Right across, and a vertical slider keeps them', () => {
  const mirrored = render({ value: 50 }, (node) => <div dir="rtl">{node}</div>);
  mirrored.key('ArrowRight');
  assert.equal(mirrored.now(), 49);
  mirrored.key('ArrowLeft');
  mirrored.key('ArrowLeft');
  assert.equal(mirrored.now(), 51);
  cleanup();
  const down = render({ value: 50, orientation: 'vertical' }, (node) => <div dir="rtl">{node}</div>);
  down.key('ArrowRight');
  assert.equal(down.now(), 51);
});

test('two thumbs never cross: each stops against the other, and its bounds move with it', () => {
  const slider = render({ range: true, value: 40, valueEnd: 45 });
  const [start, end] = slider.thumbs;
  for (let i = 0; i < 8; i += 1) slider.key('ArrowRight', start);
  assert.equal(slider.now(start), 45);
  assert.equal(end!.getAttribute('aria-valuemin'), '45');
  slider.key('Home', end);
  assert.equal(slider.now(end), 45);
  slider.key('End', start);
  assert.deepEqual(slider.heard.filter(([kind]) => kind.startsWith('commit')), [['commit', 41], ['commit', 42], ['commit', 43], ['commit', 44], ['commit', 45]]);
});

test('a press on the track moves the nearer thumb, and the end thumb reports through its own events', () => {
  const slider = render({ range: true, value: 20, valueEnd: 60 });
  slider.pointer('pointerdown', 190);
  slider.pointer('pointerup', 190);
  assert.deepEqual(slider.heard, [['changeEnd', 90], ['commitEnd', 90]]);
  slider.pointer('pointerdown', 30);
  slider.pointer('pointerup', 30);
  assert.deepEqual(slider.heard.slice(2), [['change', 10], ['commit', 10]]);
});

test('thumbs that meet are pulled apart by the side the pointer goes, toward the minimum included', () => {
  const down = render({ range: true, value: 50, valueEnd: 50 });
  down.pointer('pointerdown', 110, down.thumbs[1]);
  down.pointer('pointermove', 110, down.thumbs[1]);
  assert.deepEqual(down.heard, []);
  down.pointer('pointermove', 60);
  down.pointer('pointerup', 60);
  assert.deepEqual(down.heard, [['change', 25], ['commit', 25]]);
  assert.deepEqual(down.thumbs.map((one) => down.now(one)), [25, 50]);
  const up = render({ range: true, value: 50, valueEnd: 50 });
  up.pointer('pointerdown', 110);
  up.pointer('pointermove', 160);
  up.pointer('pointerup', 160);
  assert.deepEqual(up.heard, [['changeEnd', 75], ['commitEnd', 75]]);
  const idle = render({ range: true, value: 50, valueEnd: 50 });
  idle.pointer('pointerdown', 110, idle.thumbs[1]);
  idle.pointer('pointerup', 110, idle.thumbs[1]);
  assert.deepEqual(idle.heard, []);
});

test('with no value bound the slider holds its own number, and with no end its end starts at the top', () => {
  const slider = render({ range: true });
  assert.deepEqual(slider.thumbs.map((one) => slider.now(one)), [0, 100]);
  slider.key('ArrowUp', slider.thumbs[0]);
  assert.equal(slider.now(slider.thumbs[0]), 1);
});

test('a disabled slider ignores the pointer and the keys', () => {
  const slider = render({ value: 40, disabled: true });
  slider.pointer('pointerdown', 200);
  slider.key('ArrowUp');
  assert.deepEqual(slider.heard, []);
});

test('valueEnd without range is ignored and warned once', () => {
  forgetArenaWarnings();
  const saved = console.warn;
  const heard: string[] = [];
  console.warn = (message: string) => { heard.push(message); };
  try {
    const slider = render({ value: 10, valueEnd: 90 });
    assert.equal(slider.thumbs.length, 1);
  } finally { console.warn = saved; }
  assert.equal(heard.length, 1);
  assert.match(heard[0] ?? '', /ArenaSlider: `valueEnd` is set on a slider without `range`/);
});
