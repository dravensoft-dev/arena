/* The two halves are asserted separately because they are one-way rules pointing opposite
 * directions, and a bidirectional one would be wrong in both: a manifest slot may name an
 * affordance no single contracted component owns only if some component the manifest covers
 * does, and a React component may leave a declared affordance to the child it composes. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import {
  stateFamilies,
  sourceImplements,
  classStringsBySlot,
  coveredContracts,
  affordancesFor,
  declaredAffordances,
  manifestProblems,
  reactProblems,
  reactSourceFor,
  missingReactSource,
  zeroReactSourceProblems,
  staleExemptions,
  staleCovers,
  unaskedHandDrawn,
  collect,
  HAND_DRAWN,
  MANIFEST_COVERS,
  FAMILIES,
  EXEMPT,
} from './check-manifest-states.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

test('stateFamilies reads hover, focus and press modifiers and nothing else, and the set is the three the gate reads', () => {
  const rows: [string, string, string[]][] = [
    ['a plain class carries no state family', 'bg-primary text-base-content rounded-sm', []],
    ['hover: is detected as the hover family', 'bg-transparent hover:bg-base-200', ['hover']],
    ['focus: counts as the focus family', 'focus:ring-error', ['focus']],
    ['focus-visible: counts as the focus family', 'focus-visible:ring-error', ['focus']],
    ['focus-within: counts as the focus family', 'focus-within:border-secondary', ['focus']],
    ['a stacked modifier still matches its family', 'sm:hover:bg-base-200', ['hover']],
    ['a substring that is not modifier-shaped does not false-positive', 'overflow-hidden shadow-2', []],
    ['an active: modifier is a press', 'active:scale-[var(--press-scale)]', ['press']],
    ['a stacked active: modifier is a press', 'motion-reduce:active:scale-100', ['press']],
  ];
  for (const [name, classes, expected] of rows) assert.deepEqual([...stateFamilies(classes)], expected, name);
  assert.deepEqual(FAMILIES, ['hover', 'focus', 'press']);
});

test('sourceImplements reads hover, focus and press from the spellings a component uses', () => {
  const rows: { name: string; source: string; expected: Record<string, boolean>; message?: string }[] = [
    { name: 'a pointer move and leave is a hover, because the affordance is the same one',
      source: 'function X() { return <rect onPointerMove={() => {}} onPointerLeave={() => {}} />; }',
      expected: { hover: true, focus: false, press: false } },
    { name: 'a (pointerenter) binding is a hover', source: '<path (pointerenter)="x()" />', expected: { hover: true, focus: false, press: false } },
    { name: 'a press is its own affordance', source: '<rect onPointerDown={() => {}} />', expected: { hover: false, focus: false, press: true },
      message: 'a press is its own affordance, and reading it as a hover would license the wrong one' },
    { name: 'a component with onMouseEnter/onMouseLeave implements hover, not focus',
      source: 'function X() { return <button onMouseEnter={() => {}} onMouseLeave={() => {}} />; }',
      expected: { hover: true, focus: false, press: false } },
    { name: 'a component with onFocus/onBlur implements focus, not hover',
      source: 'function X() { const [f,setF]=useState(false); return <input onFocus={()=>setF(true)} onBlur={()=>setF(false)} />; }',
      expected: { hover: false, focus: true, press: false } },
    { name: 'an injected :hover in a template-literal style string counts as implementing hover',
      source: "const css = '.arena-input::-webkit-calendar-picker-indicator:hover{opacity:1}';", expected: { hover: true } },
  ];
  for (const row of rows) {
    const found = sourceImplements(row.source);
    if (Object.keys(row.expected).length === 3) assert.deepEqual(found, row.expected, `${row.name}${row.message ? ` (${row.message})` : ''}`);
    else for (const [family, value] of Object.entries(row.expected)) assert.equal((found as Record<string, boolean>)[family], value, `${row.name}: ${family}`);
  }
});

test('classStringsBySlot reads both slots and every variant branch, merging same-named slots', () => {
  const manifest = {
    slots: { root: 'flex', nav: 'inline-flex hover:bg-base-200' },
    variants: { variant: { primary: { root: 'bg-primary hover:shadow-2' }, ghost: { root: 'bg-transparent' } } },
  };
  const bySlot = classStringsBySlot(manifest);
  assert.deepEqual(bySlot.get('root'), ['flex', 'bg-primary hover:shadow-2', 'bg-transparent']);
  assert.deepEqual(bySlot.get('nav'), ['inline-flex hover:bg-base-200']);
});

test('a manifest covers its own contract unless MANIFEST_COVERS says it draws a wider surface', () => {
  assert.deepEqual(coveredContracts('ArenaButton'), ['ArenaButton']);
  assert.deepEqual(coveredContracts('ArenaTable'), ['ArenaTable', 'ArenaTableRow', 'ArenaTableCell']);
  assert.deepEqual(coveredContracts('ArenaConfirmDialog'), ['ArenaConfirmDialog', 'ArenaButton']);
  assert.deepEqual(coveredContracts('ArenaRadio'), ['ArenaRadio', 'ArenaRadioGroup']);
  assert.deepEqual(coveredContracts('ArenaCheckbox'), ['ArenaCheckbox', 'ArenaCheckboxGroup']);
  for (const [, { reason }] of MANIFEST_COVERS) assert.ok(reason.length > 40, 'every entry states why');
});

test('every contract MANIFEST_COVERS names exists, so no entry is stale', () => {
  assert.deepEqual(staleCovers(), []);
});

test('the affordance union is what licenses a slot, which is the whole point of covering several', () => {
  assert.deepEqual([...affordancesFor(['ArenaTable', 'ArenaTableRow', 'ArenaTableCell'])].sort(), ['focus', 'hover', 'press']);
  assert.deepEqual([...affordancesFor(['ArenaTableCell'])], ['focus'],
    'one of the covered contracts alone must still be narrower than the union, or this asserts nothing');
  assert.deepEqual([...affordancesFor(['ArenaPageHead'])], []);
  assert.deepEqual([...affordancesFor(['ArenaCard'])].sort(), ['focus', 'hover']);
});

test('a contract with no affordances array throws rather than reading as none', () => {
  assert.throws(() => declaredAffordances({}, 'X'), /declares no `affordances` array/);
  assert.throws(() => declaredAffordances({ affordances: ['drag'] }, 'X'), /unknown affordance/);
  assert.deepEqual([...declaredAffordances({ affordances: [] }, 'X')], []);
});

test('every contract declares the key, and only from the closed set', () => {
  const dir = join(repoRoot, 'contracts/api/components');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  assert.ok(files.length > 40, 'expected the contracted set, not an empty directory');
  for (const f of files) {
    const contract = readJson(join(dir, f));
    assert.ok(Array.isArray(contract.affordances), `${f} declares no affordances array`);
    for (const a of contract.affordances) assert.ok(FAMILIES.includes(a), `${f} declares ${a}`);
  }
});

test('THE CORE CLAIM: a manifest hover no covered contract declares is invented, and the same modifier passes once a contract declares the affordance', () => {
  const rows: { name: string; slot: string; declared: string[]; findings: object[] }[] = [
    { name: 'a hover no covered contract declares is invented', slot: 'inline-flex items-center hover:bg-base-200', declared: [],
      findings: [{ half: 'manifest', component: 'ArenaPagination', slot: 'nav', family: 'hover' }] },
    { name: 'the same modifier passes once a contract declares the affordance', slot: 'hover:bg-base-200', declared: ['hover'], findings: [] },
  ];
  for (const row of rows) {
    const manifest = { component: 'ArenaPagination', slots: { nav: row.slot } };
    const { findings } = manifestProblems(manifest, new Set(row.declared));
    assert.equal(findings.length, row.findings.length, `${row.name}: finding count`);
    assert.deepEqual(findings, row.findings, row.name);
  }
});

test('a source implementing an affordance its contract does not declare is a finding', () => {
  const source = 'export const X = () => <rect onMouseEnter={() => {}} />;';
  const sites = Object.values(sourceImplements(source)).filter(Boolean).length;
  assert.equal(sites, 1, 'the source implements hover and nothing else');
  assert.deepEqual(
    reactProblems('ArenaX', 'forms', { contract: { affordances: ['focus'] }, source }),
    { findings: [{ half: 'react', component: 'ArenaX', family: 'hover' }], sites },
  );
  assert.deepEqual(
    reactProblems('ArenaX', 'forms', { contract: { affordances: ['hover'] }, source }),
    { findings: [], sites },
  );
});

test('the react half asks only the components that draw by hand, because the rest answer with their manifest', () => {
  assert.deepEqual([...HAND_DRAWN.keys()].sort(), ['ArenaBarChart', 'ArenaDoughnutChart', 'ArenaFunnelChart', 'ArenaGaugeChart', 'ArenaHeatmapChart', 'ArenaHorizontalBarChart', 'ArenaLineChart', 'ArenaPyramidChart', 'ArenaRadarChart', 'ArenaScatterChart', 'ArenaSparkline']);
  assert.deepEqual(unaskedHandDrawn([...HAND_DRAWN.keys()]), []);
});

test('a hand-drawn component the react half never opened is a failure, not a clean pass', () => {
  const problems = unaskedHandDrawn(['ArenaBarChart', 'ArenaDoughnutChart']);
  assert.equal(problems.length, 9);
  assert.deepEqual(problems.map((p) => /HAND_DRAWN names (\w+)/.exec(p)?.[1]).sort(),
    ['ArenaFunnelChart', 'ArenaGaugeChart', 'ArenaHeatmapChart', 'ArenaHorizontalBarChart', 'ArenaLineChart', 'ArenaPyramidChart', 'ArenaRadarChart', 'ArenaScatterChart', 'ArenaSparkline']);
  assert.match(problems[0] ?? '', /never opened/);
});

test('an empty HAND_DRAWN retires the react half rather than letting it pass over nothing', () => {
  const problems = unaskedHandDrawn([], new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /no subject at all/);
});

test('a name with no React source is not a finding -- a layer may simply not implement it', () => {
  assert.equal(reactSourceFor('NoSuchComponentAtAll', 'display'), null);
  assert.deepEqual(reactProblems('NoSuchComponentAtAll', 'display'), { findings: [], sites: 0 });
});

test('a component directory holding no source is a finding, not a silent skip', () => {
  assert.equal(missingReactSource('NoSuchComponentAtAll', 'display'), null,
    'an absent directory is check:structure\'s claim, not this one\'s');
  assert.equal(missingReactSource('ArenaButton', 'forms'), null);
  const tmp = mkdtempSync(join(tmpdir(), 'arena-manifest-states-'));
  try {
    mkdirSync(join(tmp, 'forms', 'arena-x'), { recursive: true });
    assert.match(missingReactSource('ArenaX', 'forms', tmp) ?? '',
      /^ArenaX: frameworks\/react\/components\/forms\/arena-x\/ holds no ArenaX\.tsx and no ArenaX\.jsx/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  assert.equal(zeroReactSourceProblems(0).length, 1);
  assert.match(zeroReactSourceProblems(0)[0] ?? '', /checked nothing/);
  assert.deepEqual(zeroReactSourceProblems(1), []);
});

test('running against the real tree today produces no findings and no stale entries', () => {
  const { findings, matchedKeys, sites, missingSources, zeroSources } = collect();
  assert.deepEqual(missingSources, []);
  assert.deepEqual(zeroSources, []);
  if (findings.length) {
    const detail = findings.map((f) => `${f.half} ${f.component}:${'slot' in f ? f.slot : '-'}:${f.family}`).join('\n  ');
    assert.fail(`unexpected undeclared affordance(s):\n  ${detail}`);
  }
  assert.ok(sites > 0, 'a gate examining zero sites finds zero violations by construction');
  assert.deepEqual(staleExemptions(matchedKeys), []);
});

test('EXEMPT is empty, and that is a claim: composition is expressed by MANIFEST_COVERS instead', () => {
  assert.equal(EXEMPT.size, 0);
});

test('an EXEMPT key nothing matched is stale, and a matched one is not', () => {
  const exempt = new Map([['k', 'why']]);
  assert.deepEqual(staleExemptions([], exempt), ['k']);
  assert.deepEqual(staleExemptions(['k'], exempt), []);
});
