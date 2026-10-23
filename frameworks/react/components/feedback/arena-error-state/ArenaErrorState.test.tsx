import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaErrorState } from './ArenaErrorState.tsx';

test('title defaults to "Something went wrong" when omitted', () => {
  const html = renderIcons(<ArenaErrorState />);
  assert.match(html, /Something went wrong/);
});

test('retryLabel renders a retry button with that label; absent renders no retry button', () => {
  const withRetry = renderIcons(
    <ArenaErrorState retryLabel="Try again" onRetry={() => {}} />
  );
  assert.match(withRetry, /<button/);
  assert.match(withRetry, /Try again/);

  const withoutRetry = renderIcons(<ArenaErrorState onRetry={() => {}} />);
  assert.doesNotMatch(withoutRetry, /<button/);
});

test('icon renders as an aria-hidden svg Arena draws', () => {
  const html = renderIcons(<ArenaErrorState icon="ph-fill ph-warning-octagon" />);
  assert.deepEqual(symbols(html), ['fill-warning-octagon']);
  assert.match(html, /<svg[^>]*aria-hidden="true"/);
});

test('secondaryAction renders the projected node', () => {
  const html = renderIcons(<ArenaErrorState secondaryAction={<button>View logs</button>} />);
  assert.match(html, /View logs/);
});

test('the root announces itself -- the failure is heard, not only read', () => {
  const html = renderIcons(<ArenaErrorState title="Failed" />);
  assert.match(html, /^<div role="alert"/);
});
