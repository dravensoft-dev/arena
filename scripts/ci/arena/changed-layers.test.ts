import test from 'node:test';
import assert from 'node:assert/strict';
import { LAYER_INPUTS, SHARED, domainsOf, layersChanged, renderOutputs, unroutedLayers } from './changed-layers.ts';
import { LAYERS } from '../../lib/arena/layers.ts';
import { DOMAINS } from '../../lib/arena/domains.ts';

test('a change confined to one layer routes to that layer alone', () => {
  assert.deepEqual(
    layersChanged(['frameworks/react/components/forms/arena-button/ArenaButton.tsx']),
    { react: true, angular: false, tailwind: false },
  );
});

test('a Tailwind change routes to both other layers, because both compile what it emits', () => {
  assert.deepEqual(
    layersChanged(['frameworks/tailwind/components/forms/arena-button/ArenaButton.manifest.json']),
    { react: true, angular: true, tailwind: true },
  );
});

test('a change to anything shared routes to every layer', () => {
  for (const shared of ['contracts/api/components/ArenaButton.json', 'scripts/check/arena/check-api.ts',
    'package.json', 'bun.lock', '.github/workflows/pr.yml']) {
    assert.deepEqual(
      layersChanged([shared]),
      { react: true, angular: true, tailwind: true },
      `${shared} did not route everywhere`,
    );
  }
});

test('a shared entry naming a file matches that file and not a directory it prefixes', () => {
  assert.deepEqual(
    layersChanged(['package.json.bak']),
    { react: false, angular: false, tailwind: false },
  );
});

test('a path outside every input routes nowhere', () => {
  assert.deepEqual(
    layersChanged(['README.md', 'DOUBTS.md', 'intro/guidelines/type.html', 'docs/superpowers/specs/x.md']),
    { react: false, angular: false, tailwind: false },
  );
});

test('an empty diff routes nowhere, so a run with nothing to do says so', () => {
  assert.deepEqual(layersChanged([]), { react: false, angular: false, tailwind: false });
});

test('every layer is routed, so a new one cannot land with no entry', () => {
  assert.deepEqual(unroutedLayers(), []);
  assert.deepEqual(unroutedLayers({ react: {}, angular: {} }, LAYERS), ['tailwind']);
});

test('the output is the shape a workflow step appends to GITHUB_OUTPUT', () => {
  assert.equal(
    renderOutputs(layersChanged(['frameworks/react/a.tsx'])),
    'angular=false\nreact=true\ntailwind=false\ndomains=core,react,arena',
  );
});

test('the domains verify.yml runs are every domain that is no layer, and each layer the diff reaches', () => {
  assert.deepEqual(domainsOf(layersChanged([])), ['core', 'arena'],
    'core and arena run on every change, which is why the gates job always has something to do');
  assert.deepEqual(domainsOf(layersChanged(['frameworks/angular/a.ts'])), ['core', 'angular', 'arena']);
  assert.deepEqual(domainsOf(layersChanged(['frameworks/tailwind/a.css'])), DOMAINS,
    'a Tailwind edit reaches every layer, so it selects every domain');
  assert.deepEqual(domainsOf(layersChanged(['scripts/check/arena/check-api.ts'])), DOMAINS);
});

test('a domain no layer names is never dropped, and a layer is selected only by a diff that reaches it', () => {
  assert.deepEqual(domainsOf({ react: true }, ['core', 'react', 'extra'], ['react', 'angular']), ['core', 'react', 'extra']);
  assert.deepEqual(domainsOf({ react: false }, ['core', 'react'], ['react']), ['core']);
  for (const layer of LAYERS) {
    assert.ok(DOMAINS.includes(layer), `${layer} is a layer and no domain, so no diff could select its gates`);
  }
});

test('every entry carries a reason, because a routing rule with none cannot be judged stale', () => {
  const entries = [...Object.entries(SHARED), ...Object.values(LAYER_INPUTS).flatMap((m) => Object.entries(m))];
  assert.ok(entries.length > 0);
  for (const [prefix, reason] of entries) {
    assert.equal(typeof reason, 'string', `${prefix} has no reason`);
    assert.ok(reason.length > 10, `${prefix}'s reason says nothing: "${reason}"`);
  }
});
