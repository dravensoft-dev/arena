/* Every assertion reads the rendered placement attribute, never a "name: value" string. A test that
 * spelt one out would itself be a bare dimension literal under frameworks/, and
 * check:dimensions reads this file too; the edge names below are placement words, not lengths. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaToastHost } from './ArenaToastHost.tsx';
import { ArenaToast } from '../arena-toast/ArenaToast.tsx';
import type { ArenaToastPlacement } from '../../../Api.generated';

const PLACEMENTS = ['top-start', 'top-end', 'bottom-start', 'bottom-end'] as const;

const BLOCK = ['top', 'bottom'] as const;
const INLINE = ['start', 'end'] as const;

function placementOf(html: string): string {
  return /data-arena-placement="([^"]*)"/.exec(html)?.[1] ?? '';
}

function pinnedOf(placement: ArenaToastPlacement): { block: string[]; inline: string[] } {
  const [block, inline] = placementOf(renderToStaticMarkup(<ArenaToastHost placement={placement} />)).split('-');
  return {
    block: BLOCK.filter((edge) => edge === block),
    inline: INLINE.filter((edge) => edge === inline),
  };
}

test('every placement pins one block edge and one inline edge, and it is the pair its own name states', () => {
  const expected = {
    'top-start': { block: ['top'], inline: ['start'] },
    'top-end': { block: ['top'], inline: ['end'] },
    'bottom-start': { block: ['bottom'], inline: ['start'] },
    'bottom-end': { block: ['bottom'], inline: ['end'] },
  } as const;
  for (const placement of PLACEMENTS) {
    assert.deepEqual(pinnedOf(placement), expected[placement],
      `${placement} pinned the wrong edges, or pinned both ends of an axis, which stretches the stack`);
  }
});

test('the default placement is bottom-end, matching the contract', () => {
  assert.equal(renderToStaticMarkup(<ArenaToastHost />), renderToStaticMarkup(<ArenaToastHost placement="bottom-end" />));
});

test('a bottom placement and a top one each state their own placement', () => {
  assert.equal(placementOf(renderToStaticMarkup(<ArenaToastHost placement="bottom-end" />)), 'bottom-end',
    'a bottom placement takes the branch that clears the bottom inset');
  assert.equal(placementOf(renderToStaticMarkup(<ArenaToastHost placement="top-end" />)), 'top-end',
    'a top placement takes the branch that clears its own inset instead');
});

test('the root states its placement as an attribute beside its part hook', () => {
  const html = renderToStaticMarkup(<ArenaToastHost />);
  assert.match(html, /data-arena-part="toast-host"[^>]*\bdata-arena-placement="bottom-end"/);
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

test('an unknown placement falls back to the default rather than rendering an unpinned box', () => {
  assert.deepEqual(pinnedOf('corner' as ArenaToastPlacement), { block: ['bottom'], inline: ['end'] },
    'a variant key the manifest does not declare resolves to no classes at all, so the guard '
    + 'that answers it is derived from the manifest rather than written out beside it');
});
