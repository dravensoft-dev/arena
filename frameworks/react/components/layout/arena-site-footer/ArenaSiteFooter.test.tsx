/* The track list and the page width are computed and stay inline, so both are read through the
 * style attribute rather than searched for as a "name: value" string, which would itself be a
 * bare dimension literal under frameworks/. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaSiteFooter } from './ArenaSiteFooter.tsx';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

test('the footer is the contentinfo landmark, which the element names rather than a role', () => {
  const html = render(<ArenaSiteFooter><div /></ArenaSiteFooter>);
  assert.match(html, /^<footer/);
  assert.doesNotMatch(html, /role=/);
});

test('the column count comes from the room, off the same role a grid reads', () => {
  const html = render(<ArenaSiteFooter><div /><div /></ArenaSiteFooter>);
  assert.match(html, /grid-template-columns:repeat\(auto-fit, ?minmax\(min\(var\(--grid-min\), ?100%\), ?1fr\)\)/,
    'a voice that widens a card must widen a footer column with it');
});

test('the band stops at the page width while the footer spans', () => {
  const html = render(<ArenaSiteFooter><div /></ArenaSiteFooter>);
  assert.match(html, /max-width:var\(--container-max\)/);
});

test('every child is one column exactly as written, and nothing is wrapped', () => {
  const html = render(<ArenaSiteFooter><span id="a" /><span id="b" /></ArenaSiteFooter>);
  assert.match(html, /<span id="a"><\/span><span id="b"><\/span>/);
});

test('the note is drawn only when given, and no columns are drawn without children', () => {
  const bare = render(<ArenaSiteFooter />);
  assert.doesNotMatch(bare, /<p/);
  assert.doesNotMatch(bare, /grid-template-columns/);
  assert.match(render(<ArenaSiteFooter note="Roasted in Bilbao." />), /Roasted in Bilbao\./);
});

test('ArenaSiteFooter drops a consumer style object and a consumer attribute', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const styled = render(<ArenaSiteFooter style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(styled, /#ff00ff/, 'a consumer style reached the rendered root');
  const spread = render(<ArenaSiteFooter data-stray="x" />);
  assert.doesNotMatch(spread, /data-stray/, 'a consumer attribute reached the rendered root');
});
