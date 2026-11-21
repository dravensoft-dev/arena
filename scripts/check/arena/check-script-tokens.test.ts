import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import {
  cssCounterpart, importedNames, catSlotEnumProblems, breakpointEnumProblems, zeroGeneratedCssProblems, cssDiscoveryProblems,
  shadowedTokenProblems, staleShadowExemptions, sourceFiles,
} from './check-script-tokens.ts';
import { buildScriptModules } from '../../generate/arena/generate-tokens.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import type { LayerConstants } from './check-script-tokens.ts';

test('cssCounterpart reads a bare number, with or without its unit, and refuses anything else', () => {
  const rows: [string, number | null][] = [
    ['280px', 280], ['4200ms', 4200], ['18%', 18], ['0', 0], ['1300', 1300],
    ['rgb(1,2,3)', null], ['cubic-bezier(.2,.7,.3,1)', null],
  ];
  for (const [input, expected] of rows) assert.equal(cssCounterpart(input), expected, input);
});

test('importedNames reads a braced or multi-line import from the generated module and ignores any other module', () => {
  const rows: { name: string; source: string; expected: string[] }[] = [
    { name: 'a braced import from the generated module', source: "import { chartHeight, chartPadLeft } from '../../Tokens.generated.js';", expected: ['chartHeight', 'chartPadLeft'] },
    { name: 'a multi-line import', source: ['import {', '  chartHeight,', '  chartBarRadius,', "} from '../../Tokens.generated.js';"].join('\n'), expected: ['chartBarRadius', 'chartHeight'] },
    { name: 'an import from anything else', source: "import { arenaCatColor } from './chart-internals.js';", expected: [] },
  ];
  for (const row of rows) assert.deepEqual([...importedNames(row.source)].sort(), row.expected, row.name);
});

test('the generator emits catSlots and heatSteps at the pinned counts of the ramp and the heat ladder', async () => {
  const modules = await buildScriptModules();
  const body = modules.get('frameworks/react/Tokens.generated.js');
  const rows: [string, number][] = [['catSlots', 8], ['heatSteps', 5]];
  for (const [exportName, literal] of rows) {
    assert.match(body ?? '', new RegExp(`^export const ${exportName} = ${literal};$`, 'm'), `${exportName} is pinned at ${literal}`);
  }
});

test('catSlotEnumProblems accepts 1..N in order and refuses a set the ramp outgrew, a longer set, a disordered set and a non-array', () => {
  const rows: { name: string; slots: number; values: unknown; count: number; pattern?: RegExp }[] = [
    { name: 'accepts 1..N in order', slots: 8, values: [1, 2, 3, 4, 5, 6, 7, 8], count: 0 },
    { name: 'rejects a set the ramp has outgrown', slots: 9, values: [1, 2, 3, 4, 5, 6, 7, 8], count: 1, pattern: /has 9 slot\(s\)/ },
    { name: 'rejects a set longer than the ramp', slots: 8, values: [1, 2, 3, 4, 5, 6, 7, 8, 9], count: 1 },
    { name: 'rejects the right values out of order', slots: 3, values: [1, 3, 2], count: 1 },
    { name: 'rejects a non-array', slots: 8, values: undefined, count: 1 },
  ];
  for (const row of rows) {
    const problems = catSlotEnumProblems(row.slots, row.values);
    assert.equal(problems.length, row.count, `${row.name}: finding count`);
    if (row.pattern) assert.match(problems[0] ?? '', row.pattern, row.name);
  }
});

test('the committed ArenaCatSlot matches the ramp the tokens are built from', async () => {
  const modules = await buildScriptModules();
  const body = modules.get('frameworks/react/Tokens.generated.js');
  const catSlots = Number(/^export const catSlots = (\d+);$/m.exec(body ?? '')?.[1]);
  const catSlot = readJson(join(root, 'contracts/api/types/arena-cat-slot.json'));
  assert.deepEqual(catSlotEnumProblems(catSlots, catSlot.values), []);
});

test('zeroGeneratedCssProblems names zero files as one failure, and a populated directory has none', () => {
  const rows: { name: string; count: number; expectedLength: number; patterns: RegExp[] }[] = [
    { name: 'zero generated CSS files is one named failure, not a 21-line cascade', count: 0, expectedLength: 1, patterns: [/0 /, /design-generated/] },
    { name: 'a populated design-generated directory has no zero problem', count: 5, expectedLength: 0, patterns: [] },
  ];
  for (const row of rows) {
    const problems = zeroGeneratedCssProblems(row.count);
    assert.equal(problems.length, row.expectedLength, `${row.name}: finding count`);
    for (const pattern of row.patterns) assert.match(problems[0] ?? '', pattern, `${row.name}: ${pattern}`);
  }
});

test('cssDiscoveryProblems reports a prior finding and an empty directory together, and continues past a prior finding when the directory is populated', () => {
  const drift = 'frameworks/react/Tokens.generated.js: stale — run bun run generate:tokens';
  const empty = 'found 0 .css files in contracts/design-generated — an empty result set is a failure, not a clean pass; check the discovery path';
  const rows: { name: string; prior: string[]; count: number; expected: string[] }[] = [
    { name: 'no prior problems, populated directory -- continue', prior: [], count: 5, expected: [] },
    { name: 'a prior drift problem, populated directory -- still continue, not gated by an unrelated finding', prior: [drift], count: 5, expected: [] },
    { name: 'no prior problems, empty directory -- the CSS-discovery line alone', prior: [], count: 0, expected: [empty] },
    { name: 'a prior drift problem AND an empty directory -- both are reported, not just the CSS-discovery line', prior: [drift], count: 0, expected: [drift, empty] },
  ];
  for (const row of rows) assert.deepEqual(cssDiscoveryProblems(row.prior, row.count), row.expected, row.name);
});

const sp2 = { jsName: 'sp2', value: '8' };
const layerWith = (layer: string, imported: string[],
  constants: LayerConstants['constants']): LayerConstants =>
  ({ layer, imported: new Set(imported), constants });

test('a layer that imports the token holds no shadow of it, a layer that declares its value without importing it does, and a different or non-numeric value is none', () => {
  const rows: { name: string; layers: LayerConstants[]; count: number; patterns?: RegExp[] }[] = [
    { name: 'a layer that imports the token holds no copy', count: 0,
      layers: [layerWith('react', ['sp2'], [{ name: 'GAP', value: '8', path: 'a.jsx' }])] },
    { name: 'a layer that does NOT import the token and declares its value is the hole the orphan rule leaves', count: 1,
      layers: [layerWith('react', [], [{ name: 'GAP', value: '8', path: 'a.jsx' }])],
      patterns: [/GAP is 8, which is the value of the script-readable token sp2/, /the react layer does not import it/] },
    { name: 'one layer importing the token does not excuse the other, which is the whole point of per-layer collection', count: 1,
      layers: [layerWith('angular', ['sp2'], []), layerWith('react', [], [{ name: 'GAP', value: '8', path: 'a.jsx' }])] },
    { name: 'a different number is not a shadow, and neither is a non-numeric constant', count: 0,
      layers: [layerWith('react', [], [
        { name: 'OTHER', value: '9', path: 'a.jsx' },
        { name: 'ARENA_PAD', value: '{t:8,r:8}', path: 'b.jsx' },
      ])] },
  ];
  for (const row of rows) {
    const problems = shadowedTokenProblems([sp2], row.layers);
    assert.equal(problems.length, row.count, `${row.name}: finding count`);
    for (const pattern of row.patterns ?? []) assert.match(problems[0] ?? '', pattern, `${row.name}: ${pattern}`);
  }
});

test('a SHADOW_EXEMPT key no layer declares is stale, and a declared one is not', () => {
  const exempt = new Map([['react:GAP', 'why']]);
  const gone = [layerWith('react', [], [{ name: 'OTHER', value: '8', path: 'a.jsx' }])];
  const stale = staleShadowExemptions(gone, exempt);
  assert.equal(stale.length, 1, 'the key names a constant the layer does not declare');
  assert.match(stale[0] ?? '', /react:GAP/);
  const kept = [layerWith('react', [], [{ name: 'GAP', value: '8', path: 'a.jsx' }])];
  assert.deepEqual(staleShadowExemptions(kept, exempt), []);
});

test('a dist tree is assembled output, so the gate never reads its copy of a layer', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-script-tokens-'));
  mkdirSync(join(root, 'angular', 'dist'), { recursive: true });
  writeFileSync(join(root, 'angular', 'Widget.ts'), 'export const gap = 8;\n');
  writeFileSync(join(root, 'angular', 'dist', 'Widget.ts'), 'export const gap = 8;\n');
  assert.deepEqual([...sourceFiles(root)], [join(root, 'angular', 'Widget.ts')]);
  rmSync(root, { recursive: true });
});

test('ArenaBreakpoint restates the bp group, in order, and a fourth breakpoint fails until it follows', () => {
  assert.deepEqual(breakpointEnumProblems(['sm', 'md', 'lg'], ['sm', 'md', 'lg']), []);
  assert.match(breakpointEnumProblems(['sm', 'md', 'lg', 'xl'], ['sm', 'md', 'lg']).join('\n'), /arena-breakpoint\.json.*\[sm, md, lg, xl\]/);
  assert.match(breakpointEnumProblems(['sm', 'md', 'lg'], ['md', 'sm', 'lg']).join('\n'), /arena-breakpoint\.json/);
});
