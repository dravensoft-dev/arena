/* `DropsProps` below is the load-bearing fixture, and the hole it covers was live
 * on the Feedback card: Arena's own <ArenaButton> drops every prop it does not
 * declare, so cloneElement's aria-describedby reached nothing and the bubble
 * named nothing. Every other assertion here uses a raw <button>, the one shape
 * the clone works for. Timings come from --delay-open, never from a literal. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { join } from 'node:path';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaTooltip } from './ArenaTooltip.tsx';
import { ArenaPopover } from '../arena-popover/ArenaPopover.tsx';
import { delayOpen } from '../../../Tokens.generated.js';

afterEach(cleanup);

const MARGIN = 120;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const wait = (ms: number) => act(async () => { await sleep(ms); });

const one = () => (
  <ArenaTooltip label="Rebuilds the index">
    <button type="button">Reindex</button>
  </ArenaTooltip>
);

const trigger = (root: ParentNode): HTMLElement => root.querySelector<HTMLElement>('button')!;
const bubble = (root: ParentNode): HTMLElement => root.querySelector<HTMLElement>('[role="tooltip"]')!;
const focusIn = (root: ParentNode) => act(() => {
  trigger(root).dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
});
const focusOut = (root: ParentNode) => act(() => {
  trigger(root).dispatchEvent(new window.FocusEvent('focusout', { bubbles: true }));
});
const press = (root: ParentNode, key: string) => {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => { trigger(root).dispatchEvent(ev); });
  return ev;
};

const pressElsewhere = (key: string) => {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => { document.body.dispatchEvent(ev); });
  return ev;
};

const hover = (root: ParentNode) => act(() => {
  root!.firstElementChild!.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
});

test('focus reveals the tooltip immediately, with no delay to wait out', () => {
  const root = mount(one());
  assert.equal(bubble(root), null);
  focusIn(root);
  assert.notEqual(bubble(root), null, 'focus did not reveal the tooltip, or routed it through --delay-open');
});

test('blur withdraws it immediately too -- a blur is a decision, not a pointer leaving a hit box', () => {
  const root = mount(one());
  focusIn(root);
  focusOut(root);
  assert.equal(bubble(root), null);
});

test('while shown, the trigger describes itself with the bubble', () => {
  const root = mount(one());
  focusIn(root);
  const id = bubble(root).getAttribute('id');
  assert.ok(id, 'the bubble has no id for the trigger to reference');
  assert.equal(trigger(root).getAttribute('aria-describedby'), id);
});

test('while hidden, the trigger references nothing -- a dangling IDREF is worse than none', () => {
  const root = mount(one());
  assert.equal(trigger(root).getAttribute('aria-describedby'), null);
});

test('Escape dismisses it', () => {
  const root = mount(one());
  focusIn(root);
  press(root, 'Escape');
  assert.equal(bubble(root), null);
});

test('Escape dismisses a hover-revealed tooltip when the keydown lands outside the wrapper', async () => {
  const root = mount(one());
  hover(root);
  await wait(delayOpen + MARGIN);
  assert.notEqual(bubble(root), null, 'the hover never revealed it -- the test proves nothing');
  pressElsewhere('Escape');
  assert.equal(bubble(root), null,
    'a hover-revealed tooltip could not be dismissed from outside its wrapper');
});

test('the document listener is gone once the tooltip is hidden', () => {
  const root = mount(one());
  focusIn(root);
  press(root, 'Escape');
  assert.equal(bubble(root), null);

  pressElsewhere('Escape');
  assert.equal(bubble(root), null);
});

test('a consumer\'s own aria-describedby survives while the tooltip is hidden', () => {
  const root = mount(
    <ArenaTooltip label="Rebuilds the index">
      <button type="button" aria-describedby="password-rules">Reindex</button>
    </ArenaTooltip>,
  );
  assert.equal(trigger(root).getAttribute('aria-describedby'), 'password-rules',
    'the consumer\'s own description was destroyed by a tooltip that is not even showing');
});

test('a consumer\'s own aria-describedby survives while the tooltip is shown, beside the bubble', () => {
  const root = mount(
    <ArenaTooltip label="Rebuilds the index">
      <button type="button" aria-describedby="password-rules">Reindex</button>
    </ArenaTooltip>,
  );
  focusIn(root);
  const ids = (trigger(root).getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  assert.ok(ids.includes('password-rules'), 'the consumer\'s own description was overwritten by the bubble');
  assert.ok(ids.includes(bubble(root)!.getAttribute('id')!), 'the bubble does not describe the trigger');
});

test('a key ArenaTooltip does not handle is left alone', () => {
  const root = mount(one());
  focusIn(root);
  const ev = press(root, 'a');
  assert.equal(ev.defaultPrevented, false);
  assert.notEqual(bubble(root), null);
});

test('the tooltip itself never takes the tab sequence', () => {
  const root = mount(one());
  focusIn(root);
  assert.equal(bubble(root).hasAttribute('tabindex'), false);
});

test('the binding is honest: every `tooltip` requirement, in both directions', () => {
  const root = mount(one());
  focusIn(root);
  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'feedback', 'arena-tooltip', 'ArenaTooltip.behaviour.json'),
    subjects: {
      default: root.querySelector<HTMLElement>('[role="tooltip"]')!,

      'roles.describedby': root.querySelector<HTMLElement>('button')!,
    },
    behavioural: {
      'keyboard.Escape': true,
      'focus.never': true,
    },
  });
});

function DropsProps({ children }: { children?: React.ReactNode }) {
  return <button type="button">{children}</button>;
}

test('the description reaches a child that drops every prop it is handed', () => {
  const root = mount(
    <ArenaTooltip label="Roll back to the previous release"><DropsProps>Hover here</DropsProps></ArenaTooltip>,
  );
  assert.equal(trigger(root).hasAttribute('aria-describedby'), false,
    'nothing is described while the bubble is closed');

  focusIn(root);
  const open = bubble(root);
  assert.ok(open, 'the bubble did not open on focus');
  assert.equal(trigger(root).getAttribute('aria-describedby'), open.getAttribute('id'),
    'a prop-dropping child left the description nowhere, which is what the demo page did');

  focusOut(root);
  assert.equal(trigger(root).hasAttribute('aria-describedby'), false,
    'the reference outlived the bubble it named');
});

test('the bubble takes the shared fade utility rather than a keyframe of its own', () => {
  const root = mount(one());
  focusIn(root);
  assert.match(bubble(root).getAttribute('class') ?? '', /\barena-tooltip__bubble\b/);
  assert.equal(document.querySelector('style[data-arena-tooltip]'), null,
    'nothing injects keyframes any more; the compiled sheet carries arena-fade');
});

test('the bubble is a manual popover, shown and placed by script', () => {
  const root = mount(one());
  focusIn(root);
  assert.equal(bubble(root).getAttribute('popover'), 'manual');
  assert.equal(bubble(root).style.position, 'fixed', 'the bubble was left in flow, where an overflow: hidden ancestor clips it');
});

test('a tooltip inside a popover is the topmost panel, so Escape closes it and leaves the popover', () => {
  function Host() {
    const [shown, setShown] = useState(false);
    return (
      <ArenaPopover label="Filters" open={shown} onOpenChange={setShown} trigger={<button type="button">Filters</button>}>
        <ArenaTooltip label="Rebuilds the index"><button type="button">Reindex</button></ArenaTooltip>
      </ArenaPopover>
    );
  }
  const root = mount(<Host />);
  act(() => { root.querySelector<HTMLElement>('button')!.click(); });
  const dialog = () => document.querySelector('[role="dialog"]');
  const inner = dialog()!.querySelector<HTMLElement>('button')!;
  act(() => { inner.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true })); });
  assert.ok(document.querySelector('[role="tooltip"]'), 'focus did not reveal the tooltip');
  act(() => { inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
  assert.equal(document.querySelector('[role="tooltip"]'), null, 'Escape did not close the tooltip');
  assert.ok(dialog(), 'Escape closed the popover under the tooltip as well');
});
