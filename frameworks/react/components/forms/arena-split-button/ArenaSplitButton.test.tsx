/* What a server renders for a split button: a group the label names, holding the primary half
 * and then the caret half, which the menu label names and which carries the popup state. The
 * caret's glyph is Arena's own and the only trailing one. Each required member throws apart. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React, { useContext } from 'react';
import { ArenaSplitButton } from './ArenaSplitButton.tsx';
import { ArenaMenuAnchor } from '../../navigation/arena-menu/MenuAnchor.ts';

const ITEMS = [{ label: 'Deploy to staging' }, { divider: true }, { label: 'Roll back', destructive: true }];

function render(node: React.ReactElement) {
  return renderIcons(node);
}

test('the group is named by the label', () => {
  const html = render(<ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={ITEMS}>Deploy</ArenaSplitButton>);
  assert.match(html, /^<div role="group" aria-label="Deployment"[^>]*data-arena-part="split-button"/);
});

test('two buttons, the primary half and then the caret half', () => {
  const html = render(<ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={ITEMS}>Deploy</ArenaSplitButton>);
  const parts = [...html.matchAll(/<button[^>]*data-arena-part="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(parts, ['split-button.primary', 'split-button.caret']);
  assert.match(html, /data-arena-part="split-button.primary"[^>]*>Deploy<\/button>/);
});

test('the caret is named by the menu label and carries the closed popup state', () => {
  const html = render(<ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={ITEMS}>Deploy</ArenaSplitButton>);
  const caret = html.match(/<button[^>]*data-arena-part="split-button.caret"[^>]*>/)![0];
  assert.match(caret, /aria-label="More deploy options"/);
  assert.match(caret, /aria-haspopup="menu"/);
  assert.match(caret, /aria-expanded="false"/);
  assert.match(caret, /type="button"/);
});

test('the caret glyph is the only trailing glyph, hidden from assistive technology', () => {
  const html = render(<ArenaSplitButton label="Deployment" menuLabel="More deploy options" icon="ph-bold ph-rocket-launch" items={ITEMS}>Deploy</ArenaSplitButton>);
  assert.deepEqual(symbols(html), ['bold-rocket-launch', 'bold-caret-down']);
  assert.equal((html.match(/<svg[^>]*aria-hidden="true"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /iconright/i);
});

test('loading draws the spinner on the primary half and blocks it alone', () => {
  const html = render(<ArenaSplitButton label="Deployment" menuLabel="More deploy options" icon="ph-bold ph-rocket-launch" items={ITEMS} loading>Deploy</ArenaSplitButton>);
  assert.match(html.match(/<button[^>]*data-arena-part="split-button.primary"[^>]*>/)![0], /disabled=""/);
  assert.match(html, /data-arena-part="split-button.spinner"/);
  assert.deepEqual(symbols(html), ['bold-caret-down'], 'the spinner replaces the leading glyph and the caret stays');
  assert.doesNotMatch(html.match(/<button[^>]*data-arena-part="split-button.caret"[^>]*>/)![0], /disabled/);
});

test('disabled blocks both halves', () => {
  const html = render(<ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={ITEMS} disabled>Deploy</ArenaSplitButton>);
  assert.equal([...html.matchAll(/<button[^>]*disabled=""/g)].length, 2);
});

test('the primary half defaults its native type to button and honours an override', () => {
  const submit = render(<ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={ITEMS} type="submit">Deploy</ArenaSplitButton>);
  assert.match(submit, /<button type="submit"[^>]*data-arena-part="split-button.primary"/);
  const plain = render(<ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={ITEMS}>Deploy</ArenaSplitButton>);
  assert.match(plain, /<button type="button"[^>]*data-arena-part="split-button.primary"/);
});

test('destructive marks both halves', () => {
  const html = render(<ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={ITEMS} destructive>Roll back</ArenaSplitButton>);
  assert.match(html, /data-arena-part="split-button.primary"[^>]*data-arena-destructive=""/);
  assert.match(html, /data-arena-part="split-button.caret"[^>]*data-arena-destructive=""/);
});

test('the inner menu takes arena-fit beside its own classes, so a fill on the split stops at its halves', () => {
  const html = render(<ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={ITEMS}>Deploy</ArenaSplitButton>);
  const menu = html.match(/<div[^>]*data-arena-part="menu"[^>]*>/)![0];
  const classes = (menu.match(/class="([^"]*)"/)?.[1] ?? '').split(' ');
  assert.ok(classes.includes('arena-fit'), 'the inner menu dropped arena-fit');
  assert.ok(classes.includes('arena-menu__root'), 'the inner menu lost its own root class');
});

function AnchorProbe() {
  return <>{useContext(ArenaMenuAnchor) === null ? 'Deploy' : 'anchored'}</>;
}

test('the primary half\'s content sees no menu anchor, so a menu nested in it anchors to its own root', () => {
  const html = render(<ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={ITEMS}><AnchorProbe /></ArenaSplitButton>);
  assert.match(html, /data-arena-part="split-button.primary"[^>]*>Deploy<\/button>/, 'the content was given the split as a menu anchor');
});

test('a blank label throws', () => {
  assert.throws(() => render(<ArenaSplitButton label="  " menuLabel="More deploy options" items={ITEMS}>Deploy</ArenaSplitButton>),
    /ArenaSplitButton: `label` is required/);
});

test('a blank menu label throws', () => {
  assert.throws(() => render(<ArenaSplitButton label="Deployment" menuLabel="  " items={ITEMS}>Deploy</ArenaSplitButton>),
    /ArenaSplitButton: `menuLabel` is required/);
});

test('missing items throw', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => render(<ArenaSplitButton label="Deployment" menuLabel="More deploy options">Deploy</ArenaSplitButton>),
    /ArenaSplitButton: `items` is required/);
});

test('missing content throws', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => render(<ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={ITEMS} />),
    /ArenaSplitButton: `children` is required/);
});
