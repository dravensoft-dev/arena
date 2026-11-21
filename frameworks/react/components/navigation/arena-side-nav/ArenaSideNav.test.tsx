import test from 'node:test';
import { readFileSync } from 'node:fs';
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

test('active and inactive items differ in weight and colour', () => {
  const html = renderIcons(<ArenaSideNav ariaLabel="Primary" active="dashboard">{TREE}</ArenaSideNav>);
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
  const event = {
    button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
    preventDefault() { this.defaultPrevented = true; }, defaultPrevented: false,
  };
  assert.doesNotThrow(() => anchor.props.onClick(event),
    'clicking an item in a nav with no onNav threw -- ArenaSideNavItem lost its `onActivate &&` guard');
  assert.equal(event.defaultPrevented, true,
    'the primary click did not pass isArenaPrimaryActivation, so the onActivate guard was never reached');
  assert.doesNotThrow(() => button.props.onClick({}),
    'clicking an item in a nav with no onNav threw -- ArenaSideNavItem lost its `onActivate &&` guard');
});

test('an icon is a class name Arena draws, never markup the caller passes', () => {
  const html = renderIcons(<ArenaSideNav ariaLabel="Primary">{TREE}</ArenaSideNav>);
  assert.deepEqual(symbols(html), ['bold-squares-four'], 'the Phosphor class the consumer named is drawn as its sprite symbol');
  assert.match(html, /data-arena-part="side-nav.icon"[^>]*><svg[^>]*aria-hidden="true"/, "inside the manifest's icon slot, which sizes it");
  assert.doesNotMatch(html, />ph-bold ph-squares-four</, 'the class name was drawn as text');
});

test('an ArenaSideNav with no children renders an empty landmark rather than throwing', () => {
  const html = renderIcons(<ArenaSideNav ariaLabel="Primary" />);
  assert.match(html, /<nav[^>]*aria-label="Primary"/);
  assert.doesNotMatch(html, /<a|<button/);
});

test('an item and a trigger draw their slot class', () => {
  const html = renderIcons(<ArenaSideNav ariaLabel="Primary">{TREE}</ArenaSideNav>);
  assert.match(html, /\b(?:arena-side-nav__item|arena-side-nav__trigger)\b/, 'no item or trigger drew its slot class');
});

test('arenaIndentDepth returns the depth itself at every depth', () => {
  assert.equal(arenaIndentDepth(0), 0);
  assert.equal(arenaIndentDepth(2), 2);
});

test('a disabled item that is not current paints its disabled slots under hover and press, after the rules that would lift it', () => {
  const css = readFileSync(new URL('../../../../tailwind/consume/components/navigation/arena-side-nav/ArenaSideNav.styles.generated.css', import.meta.url), 'utf8');
  const start = css.indexOf('.arena-side-nav__item:where(:not([data-arena-current])) {');
  assert.ok(start >= 0, 'the sheet has no rule for an item that is not current');
  const block = css.slice(start, css.indexOf('\n  }\n', start));
  for (const state of ['hover', 'active'])
    for (const paint of ['border-color: var(--navigation-item-edge-disabled', 'background-color: var(--navigation-item-fill-disabled', ' color: var(--navigation-item-ink-disabled', '--arena-icon-ink: var(--navigation-item-icon-disabled'])
      assert.match(block, new RegExp(`\\[aria-disabled="true"\\] \\{\\s*&:${state} \\{(?:(?!\\n    &)[^])*?${paint.replace(/[()]/g, '\\$&')}`), `a disabled item under ${state} does not paint ${paint}`);
});
