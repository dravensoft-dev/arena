/* The two halves are asserted separately because they are one-way rules pointing opposite
 * directions, and a bidirectional one would be wrong in both: a manifest slot may name an
 * affordance no single contracted component owns only if some component the manifest covers
 * does, and a React component may leave a declared affordance to the child it composes. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
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

test('a plain class carries no state family', () => {
  assert.deepEqual([...stateFamilies('bg-primary text-base-content rounded-sm')], []);
});

test('hover: is detected as the hover family', () => {
  assert.deepEqual([...stateFamilies('bg-transparent hover:bg-base-200')], ['hover']);
});

test('focus, focus-visible and focus-within all count as the focus family', () => {
  assert.deepEqual([...stateFamilies('focus:ring-error')], ['focus']);
  assert.deepEqual([...stateFamilies('focus-visible:ring-error')], ['focus']);
  assert.deepEqual([...stateFamilies('focus-within:border-secondary')], ['focus']);
});

test('a stacked modifier still matches its family', () => {
  assert.deepEqual([...stateFamilies('sm:hover:bg-base-200')], ['hover']);
});

test('a substring that is not modifier-shaped does not false-positive', () => {
  assert.deepEqual([...stateFamilies('overflow-hidden shadow-2')], []);
});

test('a pointer spelling of hover counts as hover, because the affordance is the same one', () => {

  const pointer = "function X() { return <rect onPointerMove={() => {}} onPointerLeave={() => {}} />; }";
  assert.deepEqual(sourceImplements(pointer), { hover: true, focus: false, press: false });
  assert.deepEqual(sourceImplements('<path (pointerenter)="x()" />'), { hover: true, focus: false, press: false });

  assert.deepEqual(sourceImplements('<rect onPointerDown={() => {}} />'), { hover: false, focus: false, press: true },
    'a press is its own affordance, and reading it as a hover would license the wrong one');
});

test('an active: modifier is a press, and the set is the three the gate reads', () => {
  assert.deepEqual([...stateFamilies('active:scale-[var(--press-scale)]')], ['press']);
  assert.deepEqual([...stateFamilies('motion-reduce:active:scale-100')], ['press']);
  assert.deepEqual(FAMILIES, ['hover', 'focus', 'press']);
});

test('a component with onMouseEnter/onMouseLeave implements hover, not focus', () => {
  const src = "function X() { return <button onMouseEnter={() => {}} onMouseLeave={() => {}} />; }";
  assert.deepEqual(sourceImplements(src), { hover: true, focus: false, press: false });
});

test('a component with onFocus/onBlur implements focus, not hover', () => {
  const src = "function X() { const [f,setF]=useState(false); return <input onFocus={()=>setF(true)} onBlur={()=>setF(false)} />; }";
  assert.deepEqual(sourceImplements(src), { hover: false, focus: true, press: false });
});

test('an injected :hover in a template-literal style string counts as implementing hover', () => {
  const src = "const css = '.arena-input::-webkit-calendar-picker-indicator:hover{opacity:1}';";
  assert.equal(sourceImplements(src).hover, true);
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

test('THE CORE CLAIM: a manifest hover no covered contract declares is invented', () => {
  const manifest = { component: 'ArenaPagination', slots: { nav: 'inline-flex items-center hover:bg-base-200' } };
  const { findings } = manifestProblems(manifest, new Set());
  assert.equal(findings.length, 1);
  assert.deepEqual(findings[0], { half: 'manifest', component: 'ArenaPagination', slot: 'nav', family: 'hover' });
});

test('and the same modifier passes once a contract declares the affordance', () => {
  const manifest = { component: 'ArenaPagination', slots: { nav: 'hover:bg-base-200' } };
  assert.deepEqual(manifestProblems(manifest, new Set(['hover'])).findings, []);
});

test('THE OTHER HALF: React implementing an affordance its contract does not declare is invented too', () => {
  const contract = readJson(join(repoRoot, 'contracts/api/components/ArenaBarChart.json'));
  assert.ok(contract.affordances.includes('hover'), 'ArenaBarChart hovers, and the contract is where that is said');
  assert.deepEqual(reactProblems('ArenaBarChart', 'charts').findings, []);

  const invented = reactProblems('ArenaBarChart', 'charts');
  assert.ok(invented.sites > 0, 'a half examining zero sites finds zero violations by construction');
});

test('the react half asks only the components that draw by hand, because the rest answer with their manifest', () => {
  assert.deepEqual([...HAND_DRAWN.keys()].sort(), ['ArenaBarChart', 'ArenaDoughnutChart', 'ArenaHorizontalBarChart', 'ArenaLineChart', 'ArenaPyramidChart', 'ArenaRadarChart', 'ArenaScatterChart']);
  assert.deepEqual(unaskedHandDrawn(['ArenaBarChart', 'ArenaDoughnutChart', 'ArenaHorizontalBarChart', 'ArenaLineChart', 'ArenaPyramidChart', 'ArenaRadarChart', 'ArenaScatterChart']), []);
});

test('a hand-drawn component the react half never opened is a failure, not a clean pass', () => {
  const problems = unaskedHandDrawn(['ArenaBarChart', 'ArenaDoughnutChart']);
  assert.equal(problems.length, 5);
  assert.deepEqual(problems.map((p) => /HAND_DRAWN names (\w+)/.exec(p)?.[1]).sort(),
    ['ArenaHorizontalBarChart', 'ArenaLineChart', 'ArenaPyramidChart', 'ArenaRadarChart', 'ArenaScatterChart']);
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
  assert.deepEqual(staleExemptions([]), []);
});
