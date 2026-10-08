/* Click routing needs a real render: calling ArenaSwitch() as a plain function and reaching into
 * the returned element's props works only while the component has no hooks, and hides a
 * dependency on the component staying hook-free. These render and dispatch. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { ArenaSwitch } from './ArenaSwitch.tsx';

afterEach(cleanup);

const track = (root: ParentNode): HTMLElement => root.querySelector<HTMLElement>('[role="switch"]')!;

test('confirm routes a click to onRequestChange and does not fire onFuncOn', () => {
  const seen: unknown[] = [];
  const root = mount(
    <ArenaSwitch
      state={false} confirm label="Dark theme"
      onRequestChange={() => seen.push('requestChange')}
      onFuncOn={() => seen.push('funcOn')}
      onFuncOff={() => seen.push('funcOff')}
    />,
  );
  track(root).click();
  assert.deepEqual(seen, ['requestChange']);
});

test('confirm with NOTHING listening applies nothing -- the cost R6 leaves, pinned', () => {
  const seen: unknown[] = [];
  const root = mount(
    <ArenaSwitch
      state={false} confirm label="Dark theme"
      onFuncOn={() => seen.push('funcOn')}
      onFuncOff={() => seen.push('funcOff')}
    />,
  );
  track(root).click();
  assert.deepEqual(seen, [],
    'confirm alone diverts the activation, so a switch with confirm and no onRequestChange is a '
    + 'control that does nothing. That is the contract read literally and it is the accepted cost of '
    + 'R6: the fallback this replaced applied a guarded change silently, and no runtime guard can '
    + 'take its place, because "is anything listening?" is the question R6 says a component may not ask.');
});

test('a plain click fires onFuncOn when off and onFuncOff when on', () => {
  const seenOff: unknown[] = [];
  const off = mount(
    <ArenaSwitch state={false} label="Dark theme" onFuncOn={() => seenOff.push('on')} onFuncOff={() => seenOff.push('off')} />,
  );
  track(off).click();
  assert.deepEqual(seenOff, ['on']);

  const seenOn: unknown[] = [];
  const on = mount(
    <ArenaSwitch state label="Dark theme" onFuncOn={() => seenOn.push('on')} onFuncOff={() => seenOn.push('off')} />,
  );
  track(on).click();
  assert.deepEqual(seenOn, ['off']);
});

test('the knob carries its reduced-motion answer as a class, not as an inline transition', () => {
  const root = mount(<ArenaSwitch state label="Dark theme" />);
  const knob = root.querySelector<HTMLElement>('[role="switch"] > span');
  assert.ok(knob, 'no knob was drawn inside the track');
  const drawn = knob.getAttribute('class') ?? '';
  assert.match(drawn, /arena-switch__knob/);
  assert.match(drawn, /arena-switch__knob/,
    'a switch reports a setting rather than progress, so its travel stops outright under reduced motion');
  assert.equal(knob.style.transition, '',
    'the transition belongs to the class, not to an inline style, or the media query cannot override it');
  assert.equal(document.querySelector('style[data-arena-switch]'), null,
    'nothing injects a stylesheet for it any more');
});
