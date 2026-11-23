import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { validateStructure, zeroLayerProblems } from './check-structure.ts';
import { LAYERS, NON_LAYERS } from '../../lib/arena/layers.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const categories = { display: ['ArenaBadge', 'ArenaTag'], forms: ['ArenaButton'] };

test('validateStructure names a component in the wrong category, a directory no category declares, a name that is not kebab-case, a name declared twice and, once every layer is in, a component missing from all', () => {
  const rows: {
    name: string; categories?: Record<string, string[]>; layers: Record<string, Record<string, string[]>>; complete?: boolean;
    count?: number; patterns?: RegExp[]; some?: RegExp[]; why?: string;
  }[] = [
    { name: 'a tree that matches the declaration has no problems', count: 0,
      layers: { tailwind: { display: ['arena-badge', 'arena-tag'], forms: ['arena-button'] } } },
    { name: 'a component in the wrong category is named, with both categories', count: 1, patterns: [/ArenaBadge/, /forms/, /display/],
      layers: { tailwind: { forms: ['arena-badge'] } } },
    { name: 'a directory no category declares is a problem', count: 1, patterns: [/sparkline/],
      layers: { tailwind: { display: ['arena-badge', 'sparkline'] } } },
    { name: 'a layer carrying only some categories is fine -- Angular has no forms/', count: 0, layers: { angular: { display: ['arena-tag'] } } },
    { name: 'a declared component missing from every layer is a problem once every layer is in', count: 1, patterns: [/ArenaButton/], complete: true,
      layers: { tailwind: { display: ['arena-badge', 'arena-tag'] } } },
    { name: 'the same tree is clean when the caller passed only SOME of the layers', count: 0, layers: { tailwind: { display: ['arena-badge', 'arena-tag'] } },
      why: 'a component absent from a partial set of layers may simply live in one that was not passed' },
    { name: 'a directory that is not kebab-case is a problem, even in the right category', layers: { tailwind: { display: ['ArenaBadge'] } }, some: [/ArenaBadge/, /kebab/] },
    { name: 'a component name declared in two categories is a problem, naming both -- and no layer tree is needed to find it', count: 1,
      categories: { display: ['ArenaBadge', 'ArenaTag'], forms: ['ArenaButton', 'ArenaTag'] }, layers: {}, patterns: [/ArenaTag/, /display/, /forms/] },
  ];
  for (const row of rows) {
    const problems = validateStructure({ categories: row.categories ?? categories, layers: row.layers, ...(row.complete ? { complete: true } : {}) });
    if (row.count !== undefined) assert.equal(problems.length, row.count, `${row.name}: finding count${row.why ? ` (${row.why})` : ''}`);
    for (const pattern of row.patterns ?? []) assert.match(problems[0] ?? '', pattern, `${row.name}: ${pattern}`);
    if (row.some) assert.ok(problems.some((p) => row.some!.every((pattern) => pattern.test(p))), `${row.name}: one problem matches ${row.some}`);
  }
});

test('LAYERS names every framework layer, all of them migrated', () => {
  assert.deepEqual([...LAYERS].sort(), ['angular', 'react', 'tailwind']);
});

test('every directory under frameworks/ is a declared layer or a declared non-layer', () => {
  const onDisk = readdirSync(join(repoRoot, 'frameworks'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  assert.deepEqual([...LAYERS, ...NON_LAYERS.keys()].sort(), onDisk,
    'a directory under frameworks/ is neither a layer LAYERS names nor a non-layer NON_LAYERS explains -- '
    + 'check:structure would skip it entirely, and nothing would say so');
});

test('every non-layer carries a reason, so the escape hatch cannot be used silently', () => {
  for (const [name, reason] of NON_LAYERS) {
    assert.ok(reason.length > 20, `${name} is declared a non-layer with no reason worth reading`);
    assert.ok(!LAYERS.includes(name), `${name} is declared both a layer and a non-layer`);
  }
});

test('zeroLayerProblems fails a layer with zero component directories, and is silent about a non-empty layer and a layer with no entry', () => {
  const rows: { name: string; layers: Record<string, Record<string, string[]>>; count: number; patterns?: RegExp[] }[] = [
    { name: 'a layer with zero component directories is a failure, not a clean pass', layers: { tailwind: {} }, count: 1, patterns: [/0 component director/, /tailwind/] },
    { name: 'a category with no component directories still counts as zero for its layer', layers: { tailwind: { display: [] } }, count: 1, patterns: [/0 component director/] },
    { name: 'a non-empty layer has no zero-directory problem', layers: { tailwind: { display: ['arena-tag'] } }, count: 0 },
    { name: 'a layer with no entry at all is silent -- LAYERS, not this function, decides which layers are in scope', layers: {}, count: 0 },
  ];
  for (const row of rows) {
    const problems = zeroLayerProblems(row.layers);
    assert.equal(problems.length, row.count, `${row.name}: finding count`);
    for (const pattern of row.patterns ?? []) assert.match(problems[0] ?? '', pattern, `${row.name}: ${pattern}`);
  }
});
