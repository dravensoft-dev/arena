import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import {
  renderIndex, renderLayerIndex, renderTarget, renderRow, renderLayerRow, renderPatterns,
  memberList, escapeCell, promptPath, layersFor, layerTarget, categoryTarget,
  renderCategoryIndex, layerCategories, skillTargets, INDEX_TARGET, CONSUMER_LAYERS,
} from './generate-skills.ts';

test('a required member is starred and an optional one is not', () => {
  const members = memberList({ api: { label: { required: true }, dim: {} } });
  assert.deepEqual(members, ['label*', 'dim']);
});

test('memberList keeps contract order, because the contract orders by what a reader needs first', () => {
  const members = memberList({ api: { content: {}, variant: {}, size: {} } });
  assert.deepEqual(members, ['content', 'variant', 'size']);
});

test('a layer index names each member as that layer binds it, which is why the second level exists', () => {
  const contract = { api: { content: { form: 'slot' }, click: { form: 'event' }, tone: { form: 'enum' } } };
  assert.deepEqual(memberList(contract, 'react'), ['children', 'onClick', 'tone']);
  assert.deepEqual(memberList(contract, 'angular'), ['content', 'click', 'tone']);
  assert.deepEqual(memberList(contract), ['content', 'click', 'tone']);
});

test('a pattern every layer binds is named once, unqualified', () => {
  const found = new Map([['button', new Set(['angular', 'react'])]]);
  assert.equal(renderPatterns(found, ['angular', 'react']), 'button');
});

test('a pattern only one layer binds is qualified by that layer, so a divergence is visible', () => {
  const found = new Map([['button', new Set(['react'])]]);
  assert.equal(renderPatterns(found, ['angular', 'react']), 'button (react)');
});

test('a cased binding contributes every distinct pattern, sorted', () => {
  const found = new Map([
    ['none', new Set(['angular', 'react'])],
    ['button', new Set(['angular', 'react'])],
  ]);
  assert.equal(renderPatterns(found, ['angular', 'react']), 'button, none');
});

test('a pipe in a description is escaped, so one cannot split a table row', () => {
  assert.equal(escapeCell('a | b'), 'a \\| b');
});

test('a newline in a description becomes a space, because a table cell is one line', () => {
  assert.equal(escapeCell('a\nb'), 'a b');
});

test('a prompt path is relative to the category index, which is where the link sits', () => {
  assert.equal(promptPath('forms', 'ArenaButton'), './arena-button/ArenaButton.prompt.md');
});

test('the tailwind layer holds no index: it ships manifests, not components', () => {
  assert.ok(!CONSUMER_LAYERS.includes('tailwind'));
  assert.deepEqual([...CONSUMER_LAYERS].sort(), ['angular', 'react']);
  const targets = skillTargets();
  assert.ok(!targets.some((one) => one.includes('/tailwind/')));
  assert.equal(targets[0], INDEX_TARGET);
  for (const layer of CONSUMER_LAYERS) {
    assert.ok(targets.includes(layerTarget(layer)));
    for (const category of layerCategories(layer))
      assert.ok(targets.includes(categoryTarget(layer, category)));
  }
});

test('layersFor reports only the layers that actually hold the directory', () => {
  assert.deepEqual(layersFor('forms', 'ArenaButton').sort(), ['angular', 'react']);
  assert.deepEqual(layersFor('forms', 'NoSuchComponent'), []);
});

test('a row names the component, its members, its pattern and the layers that ship it', () => {
  const row = renderRow({
    component: 'ArenaBadge', description: 'Status label.', layers: ['angular', 'react'],
    members: ['tone', 'dot'], patterns: 'none',
  });
  assert.equal(row, '| `ArenaBadge` | Status label. | `tone` `dot` | none | angular, react |');
});

test('a component with no binding reads as undeclared rather than as the pattern named none', () => {
  const row = renderRow({
    component: 'X', description: 'd', layers: [], members: [], patterns: '',
  });
  assert.match(row, /\| \(no members\) \| \(undeclared\) \| \(no layer\) \|$/);
});

test('a layer row links the prompt beside the component rather than naming a pattern', () => {
  const row = renderLayerRow({
    component: 'ArenaBadge', category: 'display', description: 'Status label.', layers: ['react'],
    contract: { api: { content: { form: 'slot' }, dot: {} } },
  }, 'react');
  assert.equal(
    row,
    '| `ArenaBadge` | Status label. | `children` `dot` | '
    + '[`ArenaBadge.prompt.md`](./arena-badge/ArenaBadge.prompt.md) |',
  );
});

test('every emitted index is what is committed, so a reader of the tag reads the truth', () => {
  for (const target of skillTargets()) {
    assert.equal(renderTarget(target), readFileSync(join(repoRoot, target), 'utf8'), `${target} is stale`);
  }
});

test('the index names every component and stays clear of the punctuation rule', () => {
  const out = renderIndex();
  const declared = readJson(join(repoRoot, 'frameworks/Components.json'));
  for (const names of Object.values(declared) as string[][]) {
    for (const name of names) assert.ok(out.includes(`\`${name}\``), `the index omits ${name}`);
  }
  assert.ok(!out.includes('—'), 'the index carries an em dash, which check:docs bans in a document');
});

test("a layer index names no other layer, because no layer is another layer's authority", () => {
  for (const layer of CONSUMER_LAYERS) {
    const pages = [
      renderLayerIndex(layer),
      ...layerCategories(layer).map((category) => renderCategoryIndex(layer, category)),
    ];
    for (const out of pages) {
      for (const other of CONSUMER_LAYERS.filter((one) => one !== layer)) {
        assert.ok(!out.includes(other), `a ${layer} page names ${other}`);
      }
      assert.ok(!out.includes('—'), `a ${layer} page carries an em dash`);
    }
  }
});

test('the directory names every component the layer ships, so no category has to be guessed', () => {
  for (const layer of CONSUMER_LAYERS) {
    const roof = renderLayerIndex(layer);
    for (const category of layerCategories(layer)) {
      assert.ok(roof.includes(`components/${category}/SKILL.md`), `the roof drops ${category}`);
      for (const row of renderCategoryIndex(layer, category).split('\n')) {
        const named = /^\| `(Arena[A-Za-z0-9]*)` \|/.exec(row);
        if (named) assert.ok(roof.includes(`\`${named[1]}\``), `${named[1]} is in no roof row`);
      }
    }
  }
});

test('no index is an entry point, so every one names the router above it', () => {
  assert.ok(
    renderIndex().includes('](../SKILL.md)'),
    'the layer-neutral index does not name the router, so a reader landing here has no path to the '
      + 'voice or the rules',
  );
  for (const layer of CONSUMER_LAYERS) {
    assert.ok(
      renderLayerIndex(layer).includes('](../../SKILL.md)'),
      `the ${layer} index does not name the router`,
    );
  }
});

test('a target nothing emits is an error rather than an empty page', () => {
  assert.throws(() => renderTarget('frameworks/tailwind/SKILL.md'), /nothing emits/);
  assert.equal(layerTarget('react'), 'frameworks/react/SKILL.md');
});
