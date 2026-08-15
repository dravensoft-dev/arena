/* The two landmarks a page has one of, and the pair is why they sit in one suite: banner and
 * contentinfo are the same claim at the two ends of a page, both named by the element rather
 * than by a role, and both requiring nothing else because a page carries one of each. What a
 * single render cannot show is what the components DO NOT add, which is where the assertions
 * beyond the wrapper go: no anchor the consumer's router would have to fight, and no second
 * landmark either component would then have to name. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup } from '../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../test/AssertPattern.tsx';
import { ArenaAppBar } from './navigation/arena-app-bar/ArenaAppBar.tsx';
import { ArenaSiteFooter } from './layout/arena-site-footer/ArenaSiteFooter.tsx';

afterEach(cleanup);

test('ArenaAppBar is the banner landmark, named by the element and not by a role', () => {
  const root = mount(
    <ArenaAppBar brand={<span>Meridian</span>} nav={<span>Shop</span>} actions={<span>Basket</span>} />,
  );
  const header = root.querySelector<HTMLElement>('header');
  assert.ok(header, 'the bar renders no header at all');
  assert.equal(header?.getAttribute('role'), null,
    'a redundant role on a header is a second statement of the same fact');

  assertPattern({
    root: header as Element,
    bindingPath: join(REACT_COMPONENTS, 'navigation/arena-app-bar/ArenaAppBar.behaviour.json'),
    subjects: { default: header },
  });
});

test('the bar adds no anchor and no navigation landmark, because both are the consumer\'s', () => {
  const root = mount(<ArenaAppBar brand={<span>Meridian</span>} nav={<span>Shop</span>} />);
  const header = root.querySelector<HTMLElement>('header');
  assert.equal(header?.querySelector('a'), null,
    'a router link belongs in the brand slot, never in a component that would have to swallow it');
  assert.equal(header?.querySelector('nav'), null,
    'a page with a side nav has two navigation landmarks, and naming them apart is the consumer\'s');
});

test('ArenaSiteFooter is the contentinfo landmark, named by the element and not by a role', () => {
  const root = mount(<ArenaSiteFooter note="Roasted in Bilbao."><span>Shop</span></ArenaSiteFooter>);
  const footer = root.querySelector<HTMLElement>('footer');
  assert.ok(footer, 'the footer renders no footer element at all');
  assert.equal(footer?.getAttribute('role'), null);

  assertPattern({
    root: footer as Element,
    bindingPath: join(REACT_COMPONENTS, 'layout/arena-site-footer/ArenaSiteFooter.behaviour.json'),
    subjects: { default: footer },
  });
});

test('neither landmark adds a tab stop, because everything reachable came from a slot', () => {
  const bar = mount(<ArenaAppBar brand={<span>Meridian</span>} />);
  assert.equal(bar.querySelectorAll('[tabindex]').length, 0);

  cleanup();

  const footer = mount(<ArenaSiteFooter><span>Shop</span></ArenaSiteFooter>);
  assert.equal(footer.querySelectorAll('[tabindex]').length, 0);
});
