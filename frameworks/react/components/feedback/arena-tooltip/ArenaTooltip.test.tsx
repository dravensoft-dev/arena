import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaTooltip } from './ArenaTooltip.tsx';
import { ArenaButton } from '../../forms/arena-button/ArenaButton.tsx';

test('the trigger renders -- children are the projected element, not the bubble', () => {
  const html = renderToStaticMarkup(<ArenaTooltip label="Details"><button type="button">Hover</button></ArenaTooltip>);
  assert.match(html, /<button type="button">Hover<\/button>/, 'the trigger did not render');

  assert.doesNotMatch(html, /role="tooltip"/, 'the bubble rendered without pointer intent');
  assert.doesNotMatch(html, /Details/, 'the label rendered into the static markup with no pointer to reveal it');
});

test('a child that cannot carry aria-describedby throws rather than describing nothing', () => {
  assert.throws(
    () => renderToStaticMarkup(<ArenaTooltip label="Copy"><>Copy</></ArenaTooltip>),
    /ArenaTooltip: `children` must be a single element/,
    'a fragment passes isValidElement and swallows the clone -- the silent half of this hole',
  );
  assert.throws(
    () => renderToStaticMarkup(<ArenaTooltip label="Copy">Copy</ArenaTooltip>),
    /ArenaTooltip: `children` must be a single element/,
  );
});

test('a closed tooltip around an ArenaButton keeps the description the consumer gave it', () => {
  const html = renderToStaticMarkup(
    <ArenaTooltip label="Details"><ArenaButton aria-describedby="hint">Hover</ArenaButton></ArenaTooltip>,
  );
  assert.match(html.match(/<button\b[^>]*>/)?.[0] ?? '', /aria-describedby="hint"/);
});
