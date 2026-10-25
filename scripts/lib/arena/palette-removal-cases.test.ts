/* The table is plain data, so scripts/ asserts what it can without a DOM: the keys are unique,
 * each layer's two suites exist and run the lists, and the declared case names its whole config.
 * Whether each layer answers the table is that layer's own suite. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REMOVAL_CASES, REMOVAL_CONFIGS, SCOPE_REMOVAL_CASES } from './palette-removal-cases.ts';

const REPO = join(import.meta.dirname, '..', '..', '..');

const SUITES: { file: string; list: string }[] = [
  { file: 'frameworks/react/test/Theme.dom.test.tsx', list: 'REMOVAL_CASES' },
  { file: 'frameworks/react/components/layout/arena-palette-scope/ArenaPaletteScope.dom.test.tsx', list: 'SCOPE_REMOVAL_CASES' },
  { file: 'frameworks/angular/theme/ArenaThemeService.test.ts', list: 'REMOVAL_CASES' },
  { file: 'frameworks/angular/components/layout/arena-palette-scope/ArenaPaletteScope.test.ts', list: 'SCOPE_REMOVAL_CASES' },
];

test('the keys are unique in each list', () => {
  for (const list of [REMOVAL_CASES, SCOPE_REMOVAL_CASES]) {
    const keys = list.map((c) => c.key);
    assert.equal(new Set(keys).size, keys.length, keys.join(', '));
  }
});

test('each of the four suites exists, names the table and runs its list', () => {
  for (const { file, list } of SUITES) {
    assert.ok(existsSync(join(REPO, file)), `${file} exists`);
    const source = readFileSync(join(REPO, file), 'utf8');
    assert.match(source, /palette-removal-cases/, `${file} loads the table`);
    assert.match(source, new RegExp(`for \\(const \\w+ of ${list}\\)`), `${file} loops over ${list}`);
  }
});

test('the declared case names every palette of its config', () => {
  const declared = REMOVAL_CASES.find((c) => c.key === 'declared');
  assert.ok(declared);
  const step = declared.steps[0];
  assert.ok(step && step.do === 'remove' && 'throws' in step);
  for (const palette of REMOVAL_CONFIGS[declared.config].palettes) assert.ok(step.throws.includes(palette.name), palette.name);
});

const DISPATCHERS = ['frameworks/react/test/RemovalSteps.ts', 'frameworks/angular/test/RemovalSteps.ts'];
const SCOPE_SUITES = SUITES.filter((suite) => suite.list === 'SCOPE_REMOVAL_CASES').map((suite) => suite.file);

const kindsIn = (source: string) => new Set([...source.matchAll(/\bstep\.do === '(\w+)'/g)].map((match) => match[1] ?? ''));

test('each layer dispatches exactly the step kinds the table uses, the scope suites handling mount and check themselves', () => {
  const used = new Set([
    ...REMOVAL_CASES.flatMap((one) => one.steps.map((step) => step.do)),
    ...SCOPE_REMOVAL_CASES.flatMap((one) => one.steps.map((step) => step.do)),
  ]);
  const local = new Set(['mount', 'check']);
  for (const file of DISPATCHERS) {
    const handled = kindsIn(readFileSync(join(REPO, file), 'utf8'));
    assert.deepEqual([...handled].sort(), [...used].filter((kind) => !local.has(kind)).sort(), file);
  }
  for (const file of SCOPE_SUITES) {
    assert.deepEqual([...kindsIn(readFileSync(join(REPO, file), 'utf8'))].sort(), [...local].sort(), file);
  }
});

test('each dispatcher throws on a kind it does not handle', () => {
  for (const file of DISPATCHERS) {
    assert.match(readFileSync(join(REPO, file), 'utf8'), /else throw new Error\(`a removal case has no /, file);
  }
});
