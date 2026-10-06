import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaSideNav } from './ArenaSideNav.tsx';
import { ArenaSideNavItem } from '../arena-side-nav-item/ArenaSideNavItem.tsx';
import { arenaIndentDepth } from './SideNavInject.tsx';

const TREE = [
  <ArenaSideNavItem key="dashboard" id="dashboard" icon="ph-bold ph-squares-four" label="Projects" href="/projects" />,
  <ArenaSideNavItem key="settings" id="settings" label="Settings" />,
];

test('an item with href is an anchor, one without is a button', () => {
  const html = renderToStaticMarkup(<ArenaSideNav ariaLabel="Primary" active="dashboard">{TREE}</ArenaSideNav>);
  assert.match(html, /<a [^>]*href="\/projects"/);
  assert.match(html, /<button /);
});

test('the active item carries aria-current="page" and nothing else does', () => {
  const html = renderToStaticMarkup(<ArenaSideNav ariaLabel="Primary" active="dashboard">{TREE}</ArenaSideNav>);
  assert.equal(html.match(/aria-current="page"/g)!.length, 1);
});

test('the nav is labelled', () => {
  const html = renderToStaticMarkup(<ArenaSideNav ariaLabel="Primary">{TREE}</ArenaSideNav>);
  assert.match(html, /<nav [^>]*aria-label="Primary"/);
});

test('active and inactive items differ in weight and colour', () => {
  const html = renderToStaticMarkup(<ArenaSideNav ariaLabel="Primary" active="dashboard">{TREE}</ArenaSideNav>);
  assert.match(html, /\barena-side-nav__item--active-true\b/);
  assert.match(html, /\barena-side-nav__item--active-true\b/);
  assert.match(html, /\barena-side-nav__item--active-true\b/);
  assert.match(html, /\b(?:arena-side-nav__trigger|arena-side-nav__item--active-false)\b/);
  assert.match(html, /\b(?:arena-side-nav__trigger|arena-side-nav__item--active-false)\b/);
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
  const html = renderToStaticMarkup(<ArenaSideNav ariaLabel="Primary">{TREE}</ArenaSideNav>);
  assert.match(html, /<i class="ph-bold ph-squares-four [^"]*"[^>]*aria-hidden="true"/,
    "the Phosphor class the consumer named leads, and the manifest's icon slot sizes it");
  assert.doesNotMatch(html, />ph-bold ph-squares-four</, 'the class name was drawn as text');
});

test('ArenaSideNav drops a consumer style object -- the ...style escape is gone', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaSideNav ariaLabel="Primary" style={{ color: '#ff00ff' }} />,
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaSideNav drops a consumer attribute -- no {...rest} spread reaches the root', () => {
  const html = renderToStaticMarkup(
    <ArenaSideNav ariaLabel="Primary" data-stray="x" />,
  );
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- a {...rest} escape is back');
});

test('ariaLabel is required and its absence throws', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaSideNav>{TREE}</ArenaSideNav>),
    /ArenaSideNav: `ariaLabel` is required/,
  );
});

test('an empty ariaLabel throws too -- a present-but-blank name is the defect, not just an absent one', () => {
  assert.throws(
    () => renderToStaticMarkup(<ArenaSideNav ariaLabel="">{TREE}</ArenaSideNav>),
    /ArenaSideNav: `ariaLabel` is required/,
  );
});

test('an ArenaSideNav with no children renders an empty landmark rather than throwing', () => {
  const html = renderToStaticMarkup(<ArenaSideNav ariaLabel="Primary" />);
  assert.match(html, /<nav[^>]*aria-label="Primary"/);
  assert.doesNotMatch(html, /<a|<button/);
});

test('the item text re-densifies with the control scale', () => {
  const html = renderToStaticMarkup(<ArenaSideNav ariaLabel="Primary">{TREE}</ArenaSideNav>);
  assert.match(html, /\b(?:arena-side-nav__item|arena-side-nav__trigger)\b/,
    'the control text step is what .arena-compact re-densifies, and the row reads it as a utility');
});

test('arenaIndentDepth returns the unitless step count at every depth', () => {
  assert.equal(arenaIndentDepth(3, 0), 0);
  assert.equal(arenaIndentDepth(3, 2), 6);
});

test('ArenaSideNavItem: `id` is required and a blank one throws too', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaSideNavItem label="Home" />), /ArenaSideNavItem: `id` is required/);
  assert.throws(() => renderToStaticMarkup(<ArenaSideNavItem id="" label="Home" />), /ArenaSideNavItem: `id` is required/);
});

test('ArenaSideNavItem: `label` is required and a blank one throws too', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaSideNavItem id="home" />), /ArenaSideNavItem: `label` is required/);
  assert.throws(() => renderToStaticMarkup(<ArenaSideNavItem id="home" label="" />), /ArenaSideNavItem: `label` is required/);
});

test('ArenaSideNavItem drops a consumer style object', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = renderToStaticMarkup(<ArenaSideNavItem id="a" label="A" style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaSideNavItem drops a consumer attribute -- no {...rest} spread reaches the root', () => {
  const html = renderToStaticMarkup(<ArenaSideNavItem id="a" label="A" data-stray="x" />);
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root');
});
