/* The anchor convention, as every Arena anchor carries it: the one activation a router owns, a
 * primary click with no modifier, is cancelled and reported, and every other one stays the
 * browser's and reports nothing. What the link adds is that a link a router cannot own, one that
 * opens a tab, a download or another named context, is never cancelled at all. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { ArenaLink } from './ArenaLink.tsx';

afterEach(cleanup);

function press(el: Element, over: Partial<MouseEventInit> = {}): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...over });
  act(() => { el.dispatchEvent(event); });
  return event;
}

function render(props: Partial<React.ComponentProps<typeof ArenaLink>> = {}) {
  const seen = { went: 0 };
  const root = mount(<p>Read <ArenaLink href="/notes" onNavigate={() => { seen.went += 1; }} {...props}>the release notes</ArenaLink> first.</p>);
  return { seen, anchor: root.querySelector('a') as HTMLAnchorElement };
}

test('a primary click is cancelled and reported once, so a router owns it', () => {
  const { seen, anchor } = render();
  const event = press(anchor);
  assert.equal(event.defaultPrevented, true, 'the anchor was left to navigate on its own, so a router never gets the chance to');
  assert.equal(seen.went, 1);
});

test('a primary click is cancelled whether or not anything listens for it', () => {
  const root = mount(<p>Read <ArenaLink href="/notes">the release notes</ArenaLink> first.</p>);
  const event = press(root.querySelector('a') as Element);
  assert.equal(event.defaultPrevented, true, 'a link nobody listens to navigated on its own, so the host router and the browser both moved');
});

test('an ignored _blank target writes none, so the click is a plain one and routes', () => {
  forgetArenaWarnings();
  const warn = console.warn;
  const said: string[] = [];
  console.warn = (...args: unknown[]) => { said.push(args.join(' ')); };
  try {
    const { seen, anchor } = render({ target: '_blank' });
    assert.equal(anchor.hasAttribute('target'), false);
    assert.equal(press(anchor).defaultPrevented, true, 'the ignored target left the anchor to navigate on its own');
    assert.equal(seen.went, 1);
  } finally { console.warn = warn; }
  assert.equal(said.length, 1, 'the ignored target warns once');
});

test('a modified click and a middle click stay the browser\'s, and report nothing', () => {
  const { seen, anchor } = render();
  for (const over of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    const event = press(anchor, over);
    assert.equal(event.defaultPrevented, false,
      `${JSON.stringify(over)} was cancelled -- the reader asked for a new tab or for the address`);
  }
  assert.equal(seen.went, 0, 'a modified activation reported through navigate');
});

test('a link a router cannot own is never cancelled and reports nothing', () => {
  for (const props of [{ external: true }, { download: true }, { target: 'help' }, { target: '_top' }]) {
    const { seen, anchor } = render(props);
    const event = press(anchor);
    assert.equal(event.defaultPrevented, false, `${JSON.stringify(props)} was cancelled, which breaks the tab, the download or the context it opens`);
    assert.equal(seen.went, 0, `${JSON.stringify(props)} reported a navigation a router cannot perform`);
    cleanup();
  }
  const self = render({ target: '_self' });
  assert.equal(press(self.anchor).defaultPrevented, true, '_self is this context, so the router still owns it');
});

test('the link is a tab stop of its own and keeps the projected text inside the anchor', () => {
  const { anchor } = render();
  assert.equal(anchor.hasAttribute('tabindex'), false, 'a native anchor is already in the tab sequence');
  assert.equal(anchor.parentElement?.tagName, 'P', 'the link is inline in the paragraph, with no wrapper of its own');
  assert.equal(anchor.textContent, 'the release notes');
});
