/* The per-case suite this component's binding requires, because the cases declare the
 * same two cases and a divergence between them would be a defect rather than a
 * layer difference. `roles.article` is QUANTIFIED, so its subject is an array and
 * every element is judged; the four keyboard requirements are asserted by acting on
 * the tree, and the verdicts below are what those assertions reached. Control+End and
 * Control+Home need focusable elements OUTSIDE the feed, so the fixture puts one on
 * each side of it in the document -- the requirement is about leaving the feed, and a
 * feed alone in a document has nowhere to leave to. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { ArenaActivityFeed } from './ArenaActivityFeed';
import { assertPatternCases, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'display/arena-activity-feed/ArenaActivityFeed.behaviour.json');

const LABEL = 'Deployment activity';
const ITEMS = [
  { id: '1', actor: 'Ada', action: 'deployed', target: 'checkout-api', time: '09:12', tone: 'success' },
  { id: '2', actor: 'Grace', action: 'rolled back', target: 'billing-worker', time: '09:40', tone: 'danger' },
  { id: '3', actor: 'Alan', action: 'approved', target: 'release-482', time: '10:03' },
];

function press(el: Element, key: string, ctrlKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, ctrlKey, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

test('arena-activity-feed meets the feed pattern in both of its declared states', () => {
  const fixtures: ReturnType<typeof TestBed.createComponent<ArenaActivityFeed>>[] = [];
  const before = document.createElement('button');
  const after = document.createElement('button');
  document.body.append(before);
  const anchor = document.createElement('div');
  document.body.append(anchor, after);
  const render = (busy: boolean) => {
    const fixture = TestBed.createComponent(ArenaActivityFeed);
    fixtures.push(fixture);
    anchor.append(fixture.nativeElement as Element);
    fixture.componentRef.setInput('label', LABEL);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.componentRef.setInput('busy', busy);
    fixture.detectChanges();
    const host = fixture.nativeElement as Element;
    return {
      host,
      feed: host.querySelector('[role="feed"]') as HTMLElement,
      articles: Array.from(host.querySelectorAll<HTMLElement>('[role="article"]')),
    };
  };

  try {
    assertPatternCases({
      bindingPath: BINDING,
      cases: {

        settled: () => {
          const { host, feed, articles } = render(false);
          assert.equal(articles.length, ITEMS.length, 'one article per event');
          assert.equal(feed.getAttribute('aria-busy'), 'false',
            'a settled feed must say so rather than omit the state');

          articles.forEach((el, i) => {
            assert.equal(el.getAttribute('aria-posinset'), String(i + 1), `article ${i} is misnumbered`);
            assert.equal(el.getAttribute('aria-setsize'), String(ITEMS.length),
              'every article must report the same total');
            assert.equal(el.getAttribute('tabindex'), '0', 'an article a user cannot reach cannot be navigated to');
          });

          articles[0].focus();
          const down = press(articles[0], 'PageDown');
          assertSameNode(document.activeElement, articles[1], 'PageDown did not move to the next article');
          assert.equal(down.defaultPrevented, true, 'PageDown was not claimed, so the page scrolls as well');

          press(articles[1], 'PageDown');
          press(articles[2], 'PageDown');
          assertSameNode(document.activeElement, articles[2],
            'PageDown past the last article moved focus -- it must stop rather than wrap');

          const up = press(articles[2], 'PageUp');
          assertSameNode(document.activeElement, articles[1], 'PageUp did not move to the previous article');
          assert.equal(up.defaultPrevented, true, 'PageUp was not claimed');
          press(articles[1], 'PageUp');
          press(articles[0], 'PageUp');
          assertSameNode(document.activeElement, articles[0],
            'PageUp past the first article moved focus -- it must stop rather than wrap');

          const end = press(articles[0], 'End', true);
          assertSameNode(document.activeElement, after,
            'Control+End must leave the feed for the first focusable element after it');
          assert.equal(end.defaultPrevented, true, 'Control+End was not claimed');

          articles[1].focus();
          const home = press(articles[1], 'Home', true);
          assertSameNode(document.activeElement, before,
            'Control+Home must leave the feed for the first focusable element before it');
          assert.equal(home.defaultPrevented, true, 'Control+Home was not claimed');

          return {
            root: host,
            subjects: { default: feed, 'roles.article': articles },
            behavioural: {
              'states.posinset': true, 'states.busy': true,
              'keyboard.PageDown': true, 'keyboard.PageUp': true,
              'keyboard.ControlEnd': true, 'keyboard.ControlHome': true,
            },
          };
        },

        busy: () => {
          const { host, feed, articles } = render(true);
          assert.equal(feed.getAttribute('aria-busy'), 'true',
            'a feed mid-update must announce it, or a reader hears every intermediate state');
          return {
            root: host,
            subjects: { default: feed, 'roles.article': articles },
            behavioural: {
              'states.posinset': true, 'states.busy': true,
              'keyboard.PageDown': true, 'keyboard.PageUp': true,
              'keyboard.ControlEnd': true, 'keyboard.ControlHome': true,
            },
          };
        },
      },
    });
  } finally {
    for (const fixture of fixtures) fixture.destroy();
    before.remove();
    anchor.remove();
    after.remove();
  }
});

test('a label bound to nothing throws, because input.required only proves it was bound', () => {
  const fixture = TestBed.createComponent(ArenaActivityFeed);
  fixture.componentRef.setInput('label', ' ');
  fixture.componentRef.setInput('items', ITEMS);
  try {
    assert.throws(() => fixture.detectChanges(), /ArenaActivityFeed: .label. is required/,
      'a feed is a landmark a reader navigates BY, and a whitespace name leaves it unnavigable');
  } finally {
    try {
      fixture.destroy();
    } catch {
      return;
    }
  }
});

test('dateTime turns the row time into a real <time> a machine can read', () => {
  const fixture = TestBed.createComponent(ArenaActivityFeed);
  fixture.componentRef.setInput('label', 'Deployment activity');
  fixture.componentRef.setInput('items', [
    { id: '1', actor: 'ana@', action: 'approved the release', time: '2h ago', dateTime: '2026-08-16T09:12:00Z' },
  ]);
  fixture.detectChanges();

  const time = (fixture.nativeElement as Element).querySelector('time');
  assert.ok(time, 'the row draws a real <time>, not a span, once it has a stamp to carry');
  assert.equal(time.getAttribute('datetime'), '2026-08-16T09:12:00Z');
  assert.equal(time.textContent, '2h ago',
    'two fields rather than one: the reader keeps "2h ago", which no parser resolves to a date, '
    + 'and the machine gets the stamp beside it');
});

test('without dateTime the row time is drawn exactly as it was', () => {
  const fixture = TestBed.createComponent(ArenaActivityFeed);
  fixture.componentRef.setInput('label', 'Deployment activity');
  fixture.componentRef.setInput('items', [{ id: '1', actor: 'ana@', action: 'shipped', time: '2h ago' }]);
  fixture.detectChanges();

  const host = fixture.nativeElement as Element;
  assertNoNode(host.querySelector('time'), 'a <time> with no datetime says nothing a span does not');
  assert.equal(host.querySelector('[data-arena-part="activity-feed.time"]')?.tagName, 'SPAN');
});

test('Arena emits the element itself, which is what keeps the projection convention intact', () => {
  const fixture = TestBed.createComponent(ArenaActivityFeed);
  fixture.componentRef.setInput('label', 'Deployment activity');
  fixture.componentRef.setInput('items', [
    { id: '1', actor: 'ana@', action: 'shipped', time: '<b>now</b>', dateTime: '2026-08-16T09:12:00Z' },
  ]);
  fixture.detectChanges();

  const host = fixture.nativeElement as Element;
  assert.equal(host.querySelectorAll('b').length, 1,
    'the one <b> is the actor, which Arena draws. A field inside an array of predefined objects '
    + 'can only be a primitive, so a consumer cannot place markup inside one row of a list Arena '
    + 'renders, and the pair of fields exists precisely so that convention did not have to be '
    + 'lifted to get a machine-readable date.');
  assert.equal(host.querySelector('time')?.textContent, '<b>now</b>');
});
