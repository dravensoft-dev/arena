/* `states.busy` is why this binding has cases at all: aria-busy is true DURING an
 * update and false once it settles, so no single render decides it and both have
 * to be mounted. `roles.article` is QUANTIFIED -- its subject must be an array
 * and every element is checked, because a feed whose third row lost its role is
 * unmet however correct the first is. The four keyboard requirements are asserted
 * by acting on the tree; the verdicts below are what those assertions reached.
 * Control+End and Control+Home need focusable elements OUTSIDE the feed, so the
 * fixture puts one on each side of it -- the requirement is about leaving the feed,
 * and a feed alone in a document has nowhere to leave to. */
import type { ArenaActivityItem } from '../../../Api.generated';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPatternCases, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaActivityFeed } from './ArenaActivityFeed.tsx';

let before: HTMLElement | undefined;
let after: HTMLElement | undefined;

afterEach(() => {
  cleanup();
  before?.remove();
  after?.remove();
  before = undefined;
  after = undefined;
});

const BINDING = join(REACT_COMPONENTS, 'display/arena-activity-feed/ArenaActivityFeed.behaviour.json');

const LABEL = 'Deployment activity';
const ITEMS: ArenaActivityItem[] = [
  { id: '1', actor: 'Ada', action: 'deployed', target: 'checkout-api', time: '09:12', tone: 'success' },
  { id: '2', actor: 'Grace', action: 'rolled back', target: 'billing-worker', time: '09:40', tone: 'danger' },
  { id: '3', actor: 'Alan', action: 'approved', target: 'release-482', time: '10:03' },
];

function press(el: Element, key: string, ctrlKey = false) {
  const event = new KeyboardEvent('keydown', { key, ctrlKey, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(event); });
  return event;
}

function render(busy: boolean) {
  before = document.createElement('button');
  document.body.prepend(before);
  const root = mount(<ArenaActivityFeed label={LABEL} items={ITEMS} busy={busy} />);
  after = document.createElement('button');
  document.body.append(after);
  const feed = root.querySelector<HTMLElement>('[role="feed"]');
  const articles = [...root.querySelectorAll<HTMLElement>('[role="article"]')];
  return { root, feed, articles };
}

test('ArenaActivityFeed meets the feed pattern in both of its declared states', () => {
  assertPatternCases({
    bindingPath: BINDING,
    cases: {

      settled: () => {
        const { root, feed, articles } = render(false);
        assert.equal(articles.length, ITEMS.length, 'one article per event');
        assert.equal(feed!.getAttribute('aria-busy'), 'false',
          'a settled feed must say so rather than omit the state, or a reader cannot tell it settled');

        articles.forEach((el, i) => {
          assert.equal(el.getAttribute('aria-posinset'), String(i + 1), `article ${i} is misnumbered`);
          assert.equal(el.getAttribute('aria-setsize'), String(ITEMS.length),
            'every article must report the same total');
          assert.equal(el.getAttribute('tabindex'), '0', 'an article a user cannot reach cannot be navigated to');
        });

        act(() => { articles[0]!.focus(); });
        const down = press(articles[0]!, 'PageDown');
        assert.equal(document.activeElement, articles[1], 'PageDown did not move to the next article');
        assert.equal(down.defaultPrevented, true, 'PageDown was not claimed, so the page scrolls as well');

        press(articles[1]!, 'PageDown');
        assert.equal(document.activeElement, articles[2], 'PageDown did not keep advancing');
        press(articles[2]!, 'PageDown');
        assert.equal(document.activeElement, articles[2],
          'PageDown past the last article moved focus somewhere -- it must stop rather than wrap');

        const up = press(articles[2]!, 'PageUp');
        assert.equal(document.activeElement, articles[1], 'PageUp did not move to the previous article');
        assert.equal(up.defaultPrevented, true, 'PageUp was not claimed');
        press(articles[1]!, 'PageUp');
        press(articles[0]!, 'PageUp');
        assert.equal(document.activeElement, articles[0],
          'PageUp past the first article moved focus somewhere -- it must stop rather than wrap');

        const end = press(articles[0]!, 'End', true);
        assert.equal(document.activeElement, after,
          'Control+End must leave the feed for the first focusable element after it');
        assert.equal(end.defaultPrevented, true, 'Control+End was not claimed');

        articles[1]!.focus();
        const home = press(articles[1]!, 'Home', true);
        assert.equal(document.activeElement, before,
          'Control+Home must leave the feed for the first focusable element before it');
        assert.equal(home.defaultPrevented, true, 'Control+Home was not claimed');

        return {
          root,
          subjects: { default: feed, 'roles.article': articles },
          behavioural: { 'states.posinset': true, 'states.busy': true, 'keyboard.PageDown': true, 'keyboard.PageUp': true, 'keyboard.ControlEnd': true, 'keyboard.ControlHome': true },
        };
      },

      busy: () => {
        const { root, feed, articles } = render(true);
        assert.equal(feed!.getAttribute('aria-busy'), 'true',
          'a feed mid-update must announce it, or a reader hears every intermediate state');
        return {
          root,
          subjects: { default: feed, 'roles.article': articles },
          behavioural: { 'states.posinset': true, 'states.busy': true, 'keyboard.PageDown': true, 'keyboard.PageUp': true, 'keyboard.ControlEnd': true, 'keyboard.ControlHome': true },
        };
      },
    },
  });
});

test('dateTime reaches a parsed document as a lowercase datetime attribute', () => {
  const items: ArenaActivityItem[] = [
    { id: '1', actor: 'ana@', action: 'approved the release', time: '2h ago', dateTime: '2026-08-16T09:12:00Z' },
  ];
  const time = mount(<ArenaActivityFeed label="Deployment activity" items={items} />).querySelector('time');

  assert.ok(time, 'the row draws a real <time>, not a span, once it has a stamp to carry');
  assert.equal(time.getAttribute('datetime'), '2026-08-16T09:12:00Z',
    'the contract asks for a machine-readable stamp on the row, and an attribute name is what a '
    + 'parser lowercases rather than what a source file spelled. So the subject here is the parsed '
    + 'document rather than the markup a layer serialises, which is where an idiom may differ and '
    + 'the result may not.');
  assert.equal(time.textContent, '2h ago', 'and the reader still gets the preformatted text');
});
