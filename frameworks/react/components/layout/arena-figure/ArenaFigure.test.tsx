/* The shape is computed from a member and stays inline, so it is read through the style
 * attribute; everything else the figure decides is which element it opens and which slot it
 * draws. What each utility MEANS is asserted once beside the manifest. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaFigure } from './ArenaFigure.tsx';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

function declarations(html: string): Record<string, string> {
  const style = /style="([^"]*)"/.exec(html)?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const part of style.split(';')) {
    const at = part.indexOf(':');
    if (at > 0) out[part.slice(0, at).trim()] = part.slice(at + 1).trim();
  }
  return out;
}

test('the figure is a real figure element, and the caption a real figcaption inside it', () => {
  const html = render(<ArenaFigure caption="Kochere, 2050 m" />);
  assert.match(html, /^<figure/);
  assert.match(html, /<figcaption[^>]*>Kochere, 2050 m<\/figcaption><\/figure>$/,
    'a figcaption outside a figure is associated with nothing');
});

test('no caption renders no caption element at all, rather than an empty one', () => {
  assert.doesNotMatch(render(<ArenaFigure />), /figcaption/);
});

test('the shape defaults to the role, so a style plugin answers every figure at once', () => {
  assert.equal(declarations(render(<ArenaFigure />))['aspect-ratio'], 'var(--aspect-media)');
  assert.equal(declarations(render(<ArenaFigure ratio="16 / 9" />))['aspect-ratio'], '16 / 9');
});

test('the fallback draws only when there is no media, because it is a state and not an error', () => {
  const empty = render(<ArenaFigure fallback={<i id="glyph" />} />);
  assert.match(empty, /id="glyph"/);

  const filled = render(<ArenaFigure media={<img id="pic" alt="" />} fallback={<i id="glyph" />} />);
  assert.match(filled, /id="pic"/);
  assert.doesNotMatch(filled, /id="glyph"/,
    'a fallback drawn under a picture is a second thing in the frame nobody asked for');
});

test('with neither media nor fallback the frame is an empty box of the right shape', () => {
  const html = render(<ArenaFigure />);
  assert.match(html, /^<figure class="[^"]*"[^>]*><div class="[^"]*"[^>]*style="aspect-ratio:var\(--aspect-media\)"><\/div><\/figure>$/);
});

test('the overlay is inside the frame and the caption is under it', () => {
  const html = render(<ArenaFigure overlay={<span id="mark" />} caption="Kochere" />);
  assert.match(html, /id="mark"[\s\S]*<\/div><figcaption/,
    'the overlay belongs in the frame and the caption under it, which is the whole difference');
});

test('ArenaFigure drops a consumer style object and a consumer attribute', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const styled = render(<ArenaFigure style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(styled, /#ff00ff/, 'a consumer style reached the rendered root');
  const spread = render(<ArenaFigure data-stray="x" />);
  assert.doesNotMatch(spread, /data-stray/, 'a consumer attribute reached the rendered root');
});
