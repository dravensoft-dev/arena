/* One file for the family, because neither half is testable without the other: the bar injects
 * the active id and the reporting channel, and the item is what draws them. The two cases the
 * item declares are driven by assertPatternCases, which compares the key set against the binding
 * before anything mounts. `states.disabled` is BEHAVIOURAL, so its verdict is earned by clicking
 * a disabled destination and reading what did not move. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { join } from 'node:path';

import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, assertPatternCases, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaBottomNav } from './ArenaBottomNav.tsx';
import { ArenaBottomNavItem } from '../arena-bottom-nav-item/ArenaBottomNavItem.tsx';

afterEach(cleanup);

const BAR_BINDING = join(REACT_COMPONENTS, 'navigation/arena-bottom-nav/ArenaBottomNav.behaviour.json');
const ITEM_BINDING = join(REACT_COMPONENTS, 'navigation/arena-bottom-nav-item/ArenaBottomNavItem.behaviour.json');

const bar = (onNav?: (id: string) => void, active = 'home') => (
  <ArenaBottomNav ariaLabel="Primary" active={active} onNav={onNav}>
    <ArenaBottomNavItem id="home" icon="ph-bold ph-house" label="Home" href="/home" />
    <ArenaBottomNavItem id="more" icon="ph-bold ph-dots-three" label="More" />
    <ArenaBottomNavItem id="locked" icon="ph-bold ph-lock" label="Locked" disabled />
  </ArenaBottomNav>
);

test('ArenaBottomNav is a named navigation landmark, which is the whole of what it binds', () => {
  const root = mount(bar());
  const nav = root.querySelector('nav')!;
  assert.equal(nav.getAttribute('aria-label'), 'Primary');
  assert.equal(nav.getAttribute('tabindex'), null, 'the landmark must not be a tab stop');
  assertPattern({ root, bindingPath: BAR_BINDING, subjects: { default: nav } });
});

test('ArenaBottomNavItem meets both of the shapes href chooses between', () => {
  const reported: string[] = [];
  const root = mount(bar((id) => reported.push(id)));

  assertPatternCases({
    bindingPath: ITEM_BINDING,
    cases: {
      link: () => {
        const el = root.querySelector('a')!;
        assert.equal(el.getAttribute('href'), '/home');
        assert.equal(el.hasAttribute('role'), false,
          'an <a href> is already a link -- a role here would restate the platform or contradict it');
        assert.equal(el.hasAttribute('tabindex'), false,
          'and it is already focusable, so a tabindex would be a second opinion about the tab order');
        assert.equal(el.getAttribute('aria-current'), 'page');
        return { root: el, subjects: { default: el } };
      },

      button: () => {
        const buttons = root.querySelectorAll('button');
        const el = buttons[0] as HTMLElement;
        assert.equal(el.getAttribute('type'), 'button',
          'without type="button" it submits any form it happens to sit in');
        assert.match(el.textContent ?? '', /More/);
        assert.equal(el.hasAttribute('aria-current'), false);

        const off = buttons[1] as HTMLElement;
        assert.equal(off.getAttribute('aria-disabled'), 'true',
          'an unavailable destination must announce itself rather than vanish');
        const before = reported.length;
        act(() => { off.click(); });
        assert.equal(reported.length, before, 'a disabled destination reported anyway');

        return {
          root: el,
          subjects: { default: el },
          behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true, 'states.disabled': true },
        };
      },
    },
  });
});

test('the active destination is filled and it is the only one, whatever weight the string carried', () => {
  const root = mount(bar());
  const glyphs = Array.from(root.querySelectorAll('i')).map((i) => i.className);
  assert.equal(glyphs.filter((c) => c.includes('ph-fill')).length, 1,
    'exactly one destination is the current one, so exactly one glyph is filled');
  assert.deepEqual(glyphs.slice(0, 2), ['ph-fill ph-house', 'ph-bold ph-dots-three'],
    'the active glyph swaps the weight it was given rather than adding a second one, and an '
    + 'inactive destination keeps the weight it was given');
  assert.equal(root.querySelectorAll('[aria-current="page"]').length, 1);
});

test('a primary click reports once and cancels the anchor; a modified or middle click reports nothing', () => {
  const reported: string[] = [];
  const root = mount(bar((id) => reported.push(id)));
  const anchor = root.querySelector('a')!;

  const fire = (init: MouseEventInit) => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
    act(() => { anchor.dispatchEvent(event); });
    return event;
  };

  assert.equal(fire({ button: 0 }).defaultPrevented, true,
    'a primary click must cancel the anchor, or the router competes with a page load');
  assert.deepEqual(reported, ['home'], 'and must report exactly once');

  for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const) {
    assert.equal(fire({ button: 0, [modifier]: true }).defaultPrevented, false,
      `${modifier}+click must stay the browser's`);
  }
  assert.equal(fire({ button: 1 }).defaultPrevented, false, 'a middle click must stay the browser\'s');

  assert.deepEqual(reported, ['home'],
    'a reader who asked for a new tab or for the address must get that, and no in-app route');
});

test('the badge draws nothing at zero, caps at 99+, and is announced rather than hidden', () => {
  const root = mount(
    <ArenaBottomNav ariaLabel="Primary">
      <ArenaBottomNavItem id="a" icon="ph-bold ph-house" label="None" badge={0} />
      <ArenaBottomNavItem id="b" icon="ph-bold ph-receipt" label="Some" badge={12} />
      <ArenaBottomNavItem id="c" icon="ph-bold ph-bell" label="Many" badge={4821} />
    </ArenaBottomNav>);
  const texts = Array.from(root.querySelectorAll('button')).map((b) => b.textContent?.trim());
  assert.deepEqual(texts, ['None', '12Some', '99+Many'],
    'zero draws no mark, and a four-digit count reads 99+ so it cannot widen the column');
  for (const marked of root.querySelectorAll('[aria-hidden="true"]')) {
    assert.equal(marked.tagName, 'I',
      'only the glyph is hidden -- a count nobody can hear is a count that is not there');
  }
});

test('the bar and its destinations refuse a blank required name rather than drawing one', () => {
  assert.throws(() => mount(<ArenaBottomNav ariaLabel="   " />), /ariaLabel/);
  const blanks: [string, React.ReactElement][] = [
    ['id', <ArenaBottomNavItem id="" icon="ph-bold ph-house" label="Home" />],
    ['label', <ArenaBottomNavItem id="home" icon="ph-bold ph-house" label="" />],
    ['icon', <ArenaBottomNavItem id="home" icon="" label="Home" />],
  ];
  for (const [name, element] of blanks) {
    assert.throws(() => mount(<ArenaBottomNav ariaLabel="Primary">{element}</ArenaBottomNav>), new RegExp(name),
      `a blank \`${name}\` rendered instead of throwing`);
    cleanup();
  }
});

test('the bar adds the safe-area inset to its height rather than eating into it', () => {
  const root = mount(
    <ArenaBottomNav ariaLabel="Sections" active="home">
      <ArenaBottomNavItem id="home" label="Home" icon="ph-bold ph-house" />
    </ArenaBottomNav>,
  );
  const bar = root.querySelector('nav')!.getAttribute('class') ?? '';
  assert.match(bar, /\barena-bottom-nav__root\b/);
  assert.match(bar, /arena-bottom-nav__root/);
  assert.match(bar, /\barena-bottom-nav__root\b/,
    'under border-box the device inset would come out of the row rather than below it, '
    + 'so the bar would stand shorter on a phone than on a desktop');
});

test('the active column takes the accent from the variant, and its badge from the same recipe', () => {
  const root = mount(
    <ArenaBottomNav ariaLabel="Sections" active="inbox">
      <ArenaBottomNavItem id="home" label="Home" icon="ph-bold ph-house" />
      <ArenaBottomNavItem id="inbox" label="Inbox" icon="ph-bold ph-tray" badge={4} />
    </ArenaBottomNav>,
  );
  const columns = [...root.querySelectorAll('nav > *')].map((c) => c.getAttribute('class') ?? '');
  assert.equal(columns.filter((c) => /\barena-bottom-nav__item--current-true\b/.test(c)).length, 1,
    'exactly the current column is accented');
  assert.match(columns[0]!, /arena-bottom-nav__item/, 'and every column lifts through a modifier');
  assert.match(root.querySelector('nav')!.innerHTML, /\barena-bottom-nav__badge\b/, 'the badge is the accent chip');
});
