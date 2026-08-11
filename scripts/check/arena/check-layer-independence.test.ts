/* FORBIDDEN is asserted by literal value because it IS the rule -- a layer quietly dropped
 * from another's foreign set would leave the gate green over the coupling it exists to catch.
 * The lowercase cases matter as much: check:angular, test:react and build:tailwind are script
 * names every layer may write, and a case-insensitive token would have failed all three. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED,
  ALLOWED_SPECIFIERS,
  EXEMPT,
  FORBIDDEN,
  LAYER_TOKENS,
  collect,
  escapingSpecifiers,
  staleLayerTokens,
  foreignTokens,
  isAllowedSpecifier,
  staleExemptions,
  staleSpecifierAllowances,
  textualHits,
} from './check-layer-independence.ts';
import { LAYERS } from '../../lib/arena/layers.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

test('the rule is the matrix: angular may name tailwind, and nothing else names anything', () => {
  assert.deepEqual(FORBIDDEN, {
    react: ['angular', 'tailwind'],
    angular: ['react'],
    tailwind: ['react', 'angular'],
  });
  assert.deepEqual(Object.keys(FORBIDDEN).sort(), [...LAYERS].sort());
  assert.deepEqual(Object.keys(LAYER_TOKENS).sort(), [...LAYERS].sort());
});

test('no layer reads another layer\'s SOURCE; the one authorised edge is a link, not a read', () => {
  assert.deepEqual([...ALLOWED.keys()], [],
    'a layer stands on contracts/ alone; the one edge that used to exist was Angular reaching for '
    + 'a Tailwind manifest, and it went when a component started composing its own class names');
});

test('no reference across layers is authorised, and asking about one answers no', () => {
  assert.deepEqual([...ALLOWED_SPECIFIERS.keys()], [],
    'every page that links the compiled CSS is emitted, and an emitted file is outside what this '
    + 'gate scans, so the pattern that used to authorise the edge authorises nothing and went');
  for (const reason of ALLOWED_SPECIFIERS.values()) assert.ok(reason.trim().length > 0, 'a reason is the whole entry');
  assert.equal(isAllowedSpecifier('frameworks/tailwind/consume/Components.generated.css'), false);
  assert.equal(isAllowedSpecifier('frameworks/tailwind/components/display/arena-tag/ArenaTag.manifest.generated'), false);
  assert.equal(isAllowedSpecifier('frameworks/tailwind/Tv'), false);
  assert.equal(isAllowedSpecifier('frameworks/react/components/forms/arena-button/ArenaButton.jsx'), false);
});

test('a stylesheet link is judged by where it lands, so a relative path cannot slip past the tokens', () => {
  const file = `${repoRoot}/frameworks/react/kitchen-sink/editorial/index.generated.html`;
  const link = (href: string) => `<link rel="stylesheet" href="${href}">`;
  assert.deepEqual(
    escapingSpecifiers(link('../../../tailwind/consume/Components.generated.css'), file, 'react'),
    ['frameworks/tailwind/consume/Components.generated.css'],
    'the string names no layer, and the resolved path names tailwind, which is the only question worth asking',
  );
  assert.deepEqual(escapingSpecifiers(link('../../../../intro/styles.css'), file, 'react'), []);
  assert.deepEqual(
    escapingSpecifiers(link('../../../angular/theme/arena-cdk.css'), file, 'react').map(isAllowedSpecifier),
    [false],
  );
});

test('ALLOWED_SPECIFIERS is answerable to the real tree: a pattern nothing references is stale', () => {
  const { allowedHits } = collect();
  assert.deepEqual(staleSpecifierAllowances(allowedHits), [],
    'a pattern authorising an edge nobody takes is a stale allowance');
  assert.equal(staleSpecifierAllowances([]).length, ALLOWED_SPECIFIERS.size);
});

test('a citation of another layer is a hit, and a script name of any layer is not', () => {
  const tokens = foreignTokens('angular');
  assert.deepEqual(textualHits('bun run check:angular && bun run test:react', tokens), []);
  assert.equal(textualHits('matching React exactly', tokens).length, 1);
  assert.equal(textualHits('the same values ArenaCheckbox.tsx reads', tokens)[0]?.token, '.tsx');
});

test('tailwind may name neither sibling, and react may name neither either', () => {
  assert.equal(textualHits('an Angular primitive consumes this', foreignTokens('tailwind')).length, 1);
  assert.equal(textualHits('a PORT of frameworks/angular/FocusTrap.ts', foreignTokens('react')).length, 2);
});

test('an import is judged by where it LANDS, so the shared evaluator under scripts/ is not a hit', () => {
  const file = '/frameworks/react/test/AssertPattern.jsx';
  assert.deepEqual(escapingSpecifiers("import x from '../../../scripts/lib/core/behaviour-compliance.ts';", file, 'react'), []);
  assert.deepEqual(escapingSpecifiers("import React from 'react';", file, 'react'), []);
});

test('EXEMPT is answerable to the real tree: every key it holds is matched, and none is dead', () => {
  assert.deepEqual(staleExemptions([...EXEMPT.keys()]), []);
  assert.deepEqual(staleExemptions([]).sort(), [...EXEMPT.keys()].sort());
  const { matchedKeys } = collect();
  assert.deepEqual(staleExemptions(matchedKeys), [],
    'an EXEMPT entry naming a file or token the tree no longer carries is a stale allowance');
});

test('every LAYER_TOKENS entry still identifies its own layer, or it forbids nothing', () => {
  assert.deepEqual(staleLayerTokens(), [],
    'a token matching nothing in the layer it names cannot catch another layer citing that layer');
});
