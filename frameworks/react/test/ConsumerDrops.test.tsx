/* A consumer style object and a consumer attribute never reach the markup of any component:
 * every demo fixture is rendered with both set, and neither token may appear anywhere in the
 * HTML. A consumer className is dropped the same way. The set is the demo fixtures, so a
 * component joins by having a demo. */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { element } from './FixtureRender.tsx';
import { ArenaIconsProvider } from '../ArenaIcons.ts';
import { loadDemos } from '../../../scripts/generate/arena/generate-kitchen-sink.ts';
import { instanceNode } from '../../../scripts/lib/arena/kitchen-sink-model.ts';

const DEMOS = [...loadDemos()];

test('every demo drops a consumer style, a consumer attribute and a consumer className', () => {
  assert.ok(DEMOS.length > 0, 'found no demo fixture; an empty sweep is a failure, not a clean pass');
  const warn = console.warn;
  console.warn = () => {};
  try {
    for (const [component, fixture] of DEMOS) {
      const seed = { ...(fixture.seed ?? {}), style: { color: '#ff00ff' }, 'data-stray': 'x', className: 'mine' };
      const html = renderToStaticMarkup(
        <ArenaIconsProvider href="/icons.svg">{element(instanceNode({ ...fixture, seed }))}</ArenaIconsProvider>,
      );
      assert.doesNotMatch(html, /#ff00ff/, `${component}: a consumer style reached the rendered markup -- the R4 escape is back`);
      assert.doesNotMatch(html, /data-stray/, `${component}: a consumer attribute reached the rendered markup -- the {...rest} escape is back`);
      assert.doesNotMatch(html, /\bmine\b/, `${component}: a consumer className reached the rendered markup`);
    }
  } finally {
    console.warn = warn;
  }
});
