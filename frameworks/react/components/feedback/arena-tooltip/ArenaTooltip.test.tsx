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

test('a missing label throws rather than drawing an unnamed bubble', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaTooltip><button type="button">Hover</button></ArenaTooltip>),
    /ArenaTooltip: `label` is required/,
    'an ArenaTooltip with no label rendered instead of failing hard',
  );
});

test('ArenaTooltip drops a consumer style object -- the ...style escape is gone', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaTooltip label="Details" style={{ color: '#ff00ff' }}><button type="button">Hover</button></ArenaTooltip>,
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaTooltip drops a consumer attribute -- no {...rest} spread reaches the root', () => {
  const html = renderToStaticMarkup(
    <ArenaTooltip label="Details" data-stray="x"><button type="button">Hover</button></ArenaTooltip>,
  );
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- a {...rest} escape is back');
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
