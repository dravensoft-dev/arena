import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaEmptyState } from './ArenaEmptyState.tsx';

test('ArenaEmptyState renders the icon as an aria-hidden svg Arena draws, from a Phosphor class name', () => {
  const html = renderIcons(
    <ArenaEmptyState icon="ph-duotone ph-folder-open" title="No projects yet" />
  );
  assert.deepEqual(symbols(html), ['duotone-folder-open']);
  assert.match(html, /<svg[^>]*aria-hidden="true"/);
});

test('ArenaEmptyState with no icon renders no svg at all', () => {
  const html = renderIcons(<ArenaEmptyState title="No projects yet" />);
  assert.doesNotMatch(html, /<svg/);
});

test('ArenaEmptyState renders the title and message text', () => {
  const html = renderIcons(
    <ArenaEmptyState title="No projects yet" message="Create your first project to start deploying." />
  );
  assert.match(html, /No projects yet/);
  assert.match(html, /Create your first project to start deploying\./);
});

test('ArenaEmptyState throws when title is absent -- the fail-hard guard', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderIcons(<ArenaEmptyState />),
    /ArenaEmptyState: `title` is required/,
  );
});
