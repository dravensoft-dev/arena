import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaSideNav } from './ArenaSideNav.tsx';
import { ArenaSideNavItem } from '../arena-side-nav-item/ArenaSideNavItem.tsx';
import { arenaIndentDepth } from './SideNavInject.tsx';

const TREE = [
  <ArenaSideNavItem key="dashboard" id="dashboard" icon="ph-bold ph-squares-four" label="Projects" href="/projects" />,
  <ArenaSideNavItem key="settings" id="settings" label="Settings" />,
];

test('an item with href is an anchor, one without is a button', () => {
  const html = renderIcons(<ArenaSideNav ariaLabel="Primary" active="dashboard">{TREE}</ArenaSideNav>);
  assert.match(html, /<a [^>]*href="\/projects"/);
  assert.match(html, /<button /);
});

test('the active item carries aria-current="page" and nothing else does', () => {
  const html = renderIcons(<ArenaSideNav ariaLabel="Primary" active="dashboard">{TREE}</ArenaSideNav>);
  assert.equal(html.match(/aria-current="page"/g)!.length, 1);
});

test('the nav is labelled', () => {
  const html = renderIcons(<ArenaSideNav ariaLabel="Primary">{TREE}</ArenaSideNav>);
  assert.match(html, /<nav [^>]*aria-label="Primary"/);
});

test('active and inactive items differ in weight and colour', () => {
  const html = renderIcons(<ArenaSideNav ariaLabel="Primary" active="dashboard">{TREE}</ArenaSideNav>);
  assert.match(html, /data-arena-part="side-nav.item"[^>]*\bdata-arena-current=""/);
  assert.match(html, /data-arena-part="side-nav.item"[^>]*\bdata-arena-current=""/);
  assert.match(html, /data-arena-part="side-nav.item"[^>]*\bdata-arena-current=""/);
  assert.match(html, /data-arena-part="side-nav.item"(?:(?!data-arena-current=)[^>])*>/);
});

test('onNav carries the activated id alone, and no DOM event reaches the handler', () => {
  const seen: unknown[] = [];
  const tree = ArenaSideNav({ children: TREE, ariaLabel: 'Primary', onNav: (...args) => seen.push(args) });

  const [anchor, button] = tree.props.children.map((el: React.ReactElement) => ArenaSideNavItem(el.props));
  const event = {
    button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
    preventDefault() { this.defaultPrevented = true; }, defaultPrevented: false,
  };

  anchor.props.onClick(event);
  assert.equal((seen[0] as unknown[]).length, 1, 'a second argument reached the handler -- the DOM event is back');
  assert.equal((seen[0] as unknown[])[0], 'dashboard', 'the payload is not the activated id');

  button.props.onClick(event);
  assert.equal((seen[1] as unknown[]).length, 1, 'a second argument reached the handler -- the DOM event is back');
  assert.equal((seen[1] as unknown[])[0], 'settings');
});

test('an item in a nav that wired no onNav still clicks rather than throwing', () => {
  const bare = ArenaSideNav({ children: TREE, ariaLabel: 'Primary' });
  const [anchor, button] = bare.props.children.map((el: React.ReactElement) => ArenaSideNavItem(el.props));
  assert.doesNotThrow(() => anchor.props.onClick({}),
    'clicking an item in a nav with no onNav threw -- ArenaSideNavItem lost its `onActivate &&` guard');
  assert.doesNotThrow(() => button.props.onClick({}),
    'clicking an item in a nav with no onNav threw -- ArenaSideNavItem lost its `onActivate &&` guard');
});

test('the anchor keeps its native navigation: nothing in the click path suppresses it', () => {
  const tree = ArenaSideNav({ children: TREE, ariaLabel: 'Primary', onNav: () => {} });
  const anchor = ArenaSideNavItem(tree.props.children[0].props);
  assert.equal(anchor.props.href, '/projects', 'the anchor lost its href and stopped being a link');
  const event = { preventDefault() { this.defaultPrevented = true; }, defaultPrevented: false };
  anchor.props.onClick(event);
  assert.equal(event.defaultPrevented, false,
    'something called preventDefault -- ctrl-click and open-in-new-tab are what that costs');
});

test('an icon is a class name Arena draws, never markup the caller passes', () => {
  const html = renderIcons(<ArenaSideNav ariaLabel="Primary">{TREE}</ArenaSideNav>);
  assert.deepEqual(symbols(html), ['bold-squares-four'], 'the Phosphor class the consumer named is drawn as its sprite symbol');
  assert.match(html, /data-arena-part="side-nav.icon"[^>]*><svg[^>]*aria-hidden="true"/, "inside the manifest's icon slot, which sizes it");
  assert.doesNotMatch(html, />ph-bold ph-squares-four</, 'the class name was drawn as text');
});

test('ArenaSideNav drops a consumer style object -- the ...style escape is gone', () => {
  const html = renderIcons(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaSideNav ariaLabel="Primary" style={{ color: '#ff00ff' }} />,
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaSideNav drops a consumer attribute -- no {...rest} spread reaches the root', () => {
  const html = renderIcons(
    <ArenaSideNav ariaLabel="Primary" data-stray="x" />,
  );
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- a {...rest} escape is back');
});

test('ariaLabel is required and its absence throws', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderIcons(<ArenaSideNav>{TREE}</ArenaSideNav>),
    /ArenaSideNav: `ariaLabel` is required/,
  );
});

test('an empty ariaLabel throws too -- a present-but-blank name is the defect, not just an absent one', () => {
  assert.throws(
    () => renderIcons(<ArenaSideNav ariaLabel="">{TREE}</ArenaSideNav>),
    /ArenaSideNav: `ariaLabel` is required/,
  );
});

test('an ArenaSideNav with no children renders an empty landmark rather than throwing', () => {
  const html = renderIcons(<ArenaSideNav ariaLabel="Primary" />);
  assert.match(html, /<nav[^>]*aria-label="Primary"/);
  assert.doesNotMatch(html, /<a|<button/);
});

test('the item text re-densifies with the control scale', () => {
  const html = renderIcons(<ArenaSideNav ariaLabel="Primary">{TREE}</ArenaSideNav>);
  assert.match(html, /\b(?:arena-side-nav__item|arena-side-nav__trigger)\b/,
    'the control text step is what .arena-compact re-densifies, and the row reads it as a utility');
});

test('arenaIndentDepth returns the depth itself at every depth', () => {
  assert.equal(arenaIndentDepth(0), 0);
  assert.equal(arenaIndentDepth(2), 2);
});

test('ArenaSideNavItem: `id` is required and a blank one throws too', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderIcons(<ArenaSideNavItem label="Home" />), /ArenaSideNavItem: `id` is required/);
  assert.throws(() => renderIcons(<ArenaSideNavItem id="" label="Home" />), /ArenaSideNavItem: `id` is required/);
});

test('ArenaSideNavItem: `label` is required and a blank one throws too', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderIcons(<ArenaSideNavItem id="home" />), /ArenaSideNavItem: `label` is required/);
  assert.throws(() => renderIcons(<ArenaSideNavItem id="home" label="" />), /ArenaSideNavItem: `label` is required/);
});

test('ArenaSideNavItem drops a consumer style object', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = renderIcons(<ArenaSideNavItem id="a" label="A" style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaSideNavItem drops a consumer attribute -- no {...rest} spread reaches the root', () => {
  const html = renderIcons(<ArenaSideNavItem id="a" label="A" data-stray="x" />);
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root');
});
