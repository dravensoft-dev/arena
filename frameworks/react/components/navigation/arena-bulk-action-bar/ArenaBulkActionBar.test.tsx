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

test('an absent required member throws rather than rendering', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderIcons(<ArenaBulkActionBar actions={[]} />), /`count` is required/);
});

test('a consumer style prop is dropped, not spread onto the root', () => {
  const html = renderIcons(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaBulkActionBar count={1} actions={[]} style={{ color: 'rgb(255, 0, 0)' }} />,
  );
  assert.ok(!html.includes('rgb(255, 0, 0)'), 'a consumer style never reaches the root (R4)');
});
