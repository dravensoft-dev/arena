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

test('with neither a retry nor a secondary action the actions part is not drawn', () => {
  const bare = renderIcons(<ArenaErrorState />);
  assert.doesNotMatch(bare, /error-state\.actions/);

  const falseSecondary = renderIcons(<ArenaErrorState secondaryAction={false} />);
  assert.doesNotMatch(falseSecondary, /error-state\.actions/);

  const nullSecondary = renderIcons(<ArenaErrorState secondaryAction={null} />);
  assert.doesNotMatch(nullSecondary, /error-state\.actions/);

  const emptySecondary = renderIcons(<ArenaErrorState secondaryAction="" />);
  assert.doesNotMatch(emptySecondary, /error-state\.actions/);

  const trueSecondary = renderIcons(<ArenaErrorState secondaryAction={true} />);
  assert.doesNotMatch(trueSecondary, /error-state\.actions/);

  const withRetry = renderIcons(<ArenaErrorState retryLabel="Retry" />);
  assert.match(withRetry, /error-state\.actions/);

  const secondaryOnly = renderIcons(<ArenaErrorState secondaryAction={<a href="/logs">Logs</a>} />);
  assert.match(secondaryOnly, /error-state\.actions/);
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
