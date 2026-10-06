import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaToastHost } from './ArenaToastHost.tsx';
import { ArenaToast } from '../arena-toast/ArenaToast.tsx';

const PLACEMENTS = ['arena-placement-top-start', 'arena-placement-top-end', 'arena-placement-bottom-start', 'arena-placement-bottom-end'] as const;

test('a placement class reaches the root, and the host carries no placement attribute of its own', () => {
  for (const placement of PLACEMENTS) {
    const html = renderToStaticMarkup(<ArenaToastHost className={placement} />);
    assert.match(html, new RegExp(`\\bclass="[^"]*\\b${placement}\\b[^"]*"[^>]*data-arena-part="toast-host"`));
    assert.doesNotMatch(html, /data-arena-placement/);
  }
});

test('the notices come out in the order they went in, so the reading order is the visual order', () => {
  const html = renderToStaticMarkup(
    <ArenaToastHost>
      <ArenaToast title="First" />
      <ArenaToast title="Second" />
    </ArenaToastHost>);
  assert.ok(html.indexOf('First') < html.indexOf('Second'),
    'the stack reversed its children -- the newest would be read last and shown first');
});

test('ArenaToastHost neither counts its children nor caps them -- the queue that raised them owns that', () => {
  const many = Array.from({ length: 9 }, (_, i) => <ArenaToast key={i} title={`Notice ${i}`} />);
  const html = renderToStaticMarkup(<ArenaToastHost>{many}</ArenaToastHost>);
  for (let i = 0; i < 9; i += 1) {
    assert.ok(html.includes(`Notice ${i}`), `notice ${i} was dropped -- ArenaToastHost applied a ceiling of its own`);
  }
});

test('ArenaToastHost drops a consumer style object and a consumer attribute -- no R4 escape reaches the root', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const styled = renderToStaticMarkup(<ArenaToastHost style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(styled, /#ff00ff/, 'a consumer style reached the rendered root');
  const spread = renderToStaticMarkup(<ArenaToastHost data-stray="x" />);
  assert.doesNotMatch(spread, /data-stray/, 'a consumer attribute reached the rendered root');
});
