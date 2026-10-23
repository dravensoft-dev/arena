import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaIcon } from './ArenaIcon.tsx';
import { ArenaIconsProvider } from '../../../ArenaIcons.ts';
import manifest from './ArenaIcon.classes.generated.ts';
import { ArenaAlert } from '../../feedback/arena-alert/ArenaAlert.tsx';
import { repoRoot } from '../../../../../scripts/lib/arena/repo-root.ts';

afterEach(cleanup);

const symbol = (...parts: string[]) => ['ph', ...parts].join('-');

const BINDING = join(REACT_COMPONENTS, 'display/arena-icon/ArenaIcon.behaviour.json');

test('draws a use of the sprite symbol the class list names', () => {
  const root = mount(<ArenaIconsProvider href="/a/icons-1.svg"><ArenaIcon icon="ph-bold ph-plus" /></ArenaIconsProvider>);
  const use = root.querySelector(`svg[aria-hidden="true"][focusable="false"] > use[href="/a/icons-1.svg#${symbol('bold', 'plus')}"]`);
  assert.ok(use, 'no svg holding a use of the bold plus symbol');
});

test('ph alone is the regular weight', () => {
  const root = mount(<ArenaIconsProvider href="/a/icons-1.svg"><ArenaIcon icon="ph ph-bell" /></ArenaIconsProvider>);
  assert.ok(root.querySelector(`use[href="/a/icons-1.svg#${symbol('regular', 'bell')}"]`));
});

test('the part is icon and the root is the manifest\'s', () => {
  const root = mount(<ArenaIconsProvider href="/a/icons-1.svg"><ArenaIcon icon="ph-fill ph-star" /></ArenaIconsProvider>);
  const svg = root.querySelector('svg');
  assert.ok(svg);
  assert.equal(svg.getAttribute('data-arena-part'), 'icon');
  assert.equal(manifest.parts.root, 'icon');
  assert.ok(svg.classList.contains(manifest.slots.root), 'the svg lacks the manifest root class');
  assertPattern({ root, bindingPath: BINDING, subjects: { default: svg } });
});

function iconSelectors(): string {
  const css = readFileSync(join(repoRoot, 'plugin-style-store/complete/plugin.css'), 'utf8');
  const rule = /([^{}]*\[data-arena-part="icon"\][^{}]*)\{/.exec(css);
  assert.ok(rule, 'complete plugin has no rule on the icon part');
  return (rule[1] ?? '').replace(/\.arena-complete\s+/g, '').trim();
}

test('the complete plugin paints a lone ArenaIcon and not the glyph inside a component part', () => {
  const selector = iconSelectors();
  const lone = mount(<ArenaIconsProvider href="/a/icons-1.svg"><div><ArenaIcon icon="ph ph-bell" /></div></ArenaIconsProvider>);
  const inside = mount(<ArenaIconsProvider href="/a/icons-1.svg"><ArenaAlert tone="info">All good</ArenaAlert></ArenaIconsProvider>);
  const own = lone.querySelector('svg');
  const drawn = inside.querySelector('[data-arena-part="alert.icon"] svg');
  assert.ok(own && drawn);
  assert.ok(own.matches(selector), 'a lone ArenaIcon is not painted');
  assert.ok(!drawn.matches(selector), 'a glyph inside alert.icon is painted');
});
