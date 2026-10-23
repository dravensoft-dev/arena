import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaIcon } from './ArenaIcon.tsx';
import { ArenaIconsProvider } from '../../../ArenaIcons.ts';
import manifest from './ArenaIcon.classes.generated.ts';

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
