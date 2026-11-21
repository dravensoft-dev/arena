import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaBulkActionBar } from './ArenaBulkActionBar.tsx';

test('an action renders its icon as a Phosphor class and its label as text', () => {
  const html = renderIcons(
    <ArenaBulkActionBar count={3} actions={[{ id: 'archive', label: 'Archive', icon: 'ph-bold ph-archive' }]} />,
  );
  assert.deepEqual(symbols(html), ['bold-archive'], 'the icon is drawn from the class name');
  assert.ok(html.includes('Archive'), 'the label is rendered');

  assert.match(html, /<b[^>]*>3<\/b> items selected/, 'the count and default noun are rendered');
});

test('a count of zero renders nothing', () => {
  assert.equal(renderIcons(<ArenaBulkActionBar count={0} actions={[]} />), '');
});
