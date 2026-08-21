import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  FORBIDDEN_FIELDS, NON_CONTRACT, catalogueProblems, collect, expectedCarried, manifestProblems,
  payloadProblems, zeroDerivedProblems,
} from './check-contracts-package.ts';
import { CATALOGUE, NAME, NOT_CARRIED, catalogue, manifest, unmatchedExclusions } from '../../build/arena/build-contracts-package.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'arena-contracts-'));
  const put = (rel: string, body: string) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), body);
  };
  return { dir, put };
}

test('a derivation that finds nothing fails rather than comparing nothing against nothing', () => {
  assert.deepEqual(zeroDerivedProblems(1), []);
  assert.equal(zeroDerivedProblems(0).length, 1);
  assert.match(zeroDerivedProblems(0)[0] ?? '', /failure rather than a clean pass/);
});

test('a file in the tree and not in the package is a problem, and so is the reverse', () => {
  const { dir, put } = fixture();
  try {
    put('contracts/design/spacing.json', '{}');
    put('contracts/design/stray.json', '{}');
    for (const rel of NON_CONTRACT) put(rel, '{}');
    const problems = payloadProblems(dir, ['contracts/design/spacing.json', 'contracts/design/absent.json'], dir);
    assert.ok(problems.some((p) => /absent\.json is in the tree and not in the package/.test(p)));
    assert.ok(problems.some((p) => /stray\.json is in the package and not in the tree/.test(p)));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a carried file whose bytes differ from the tree is a problem', () => {
  const { dir, put } = fixture();
  try {
    put('contracts/design/spacing.json', '{"a":1}');
    for (const rel of NON_CONTRACT) put(rel, '{}');
    const tree = mkdtempSync(join(tmpdir(), 'arena-tree-'));
    try {
      mkdirSync(join(tree, 'contracts/design'), { recursive: true });
      writeFileSync(join(tree, 'contracts/design/spacing.json'), '{"a":2}');
      const problems = payloadProblems(dir, ['contracts/design/spacing.json'], tree);
      assert.ok(problems.some((p) => /differs from the one in the tree/.test(p)));
    } finally { rmSync(tree, { recursive: true, force: true }); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the catalogue is held to the carried set and to the version in both directions', () => {
  const { dir, put } = fixture();
  try {
    const want = catalogue(['contracts/design/spacing.json'], repoRoot);
    put(CATALOGUE, JSON.stringify({ ...want, contracts: ['contracts/design/ghost.json'] }));
    const problems = catalogueProblems(dir, ['contracts/design/spacing.json'], repoRoot);
    assert.ok(problems.some((p) => /does not list contracts\/design\/spacing\.json/.test(p)));
    assert.ok(problems.some((p) => /lists contracts\/design\/ghost\.json, which the package does not carry/.test(p)));

    put(CATALOGUE, JSON.stringify({ ...want, version: '0.0.0' }));
    const stale = catalogueProblems(dir, ['contracts/design/spacing.json'], repoRoot);
    assert.ok(stale.some((p) => /says version 0\.0\.0/.test(p)));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a manifest leaning on any npm semantics at all is a problem, one per field', () => {
  const { dir, put } = fixture();
  try {
    const base = manifest(repoRoot) as Record<string, unknown>;
    put('package.json', JSON.stringify({ ...base, bin: { x: './x' }, engines: { node: '>=22' }, dependencies: {} }));
    const problems = manifestProblems(dir, repoRoot);
    for (const field of ['bin', 'engines', 'dependencies']) {
      assert.ok(problems.some((p) => p.includes(`declares ${field}`)), `nothing reported ${field}`);
    }
    assert.ok(FORBIDDEN_FIELDS.has('types'), 'a package with no TypeScript still refuses a types entry');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an export naming a file that was never emitted is a problem', () => {
  const { dir, put } = fixture();
  try {
    put('package.json', JSON.stringify({ ...manifest(repoRoot), name: NAME }));
    const problems = manifestProblems(dir, repoRoot);
    assert.ok(problems.some((p) => /which was never emitted/.test(p)),
      'the fixture emitted no target, so every non-wildcard export should report');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an exclusion matching nothing in the tree fails, so it cannot outlive what it excludes', () => {
  const ghost = new Map([['contracts/design/*.sass', 'a shape the tree has never held']]);
  const problems = unmatchedExclusions(repoRoot, ghost);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /outlived what it excluded/);
  assert.deepEqual(unmatchedExclusions(repoRoot), [], 'every real exclusion still matches the tree');
});

test('the tree passes its own claim, over more than nothing', () => {
  const { problems, expected, assembled } = collect();
  assert.deepEqual(problems, []);
  assert.ok(expected.length > 0);
  assert.ok(NOT_CARRIED.size > 0, 'a package that excludes nothing is one nobody decided the shape of');
  assert.equal(typeof assembled, 'boolean');
});

test('the derived set is every contract level and nothing else', () => {
  const expected = expectedCarried();
  const roots = new Set(expected.map((p) => p.split('/').slice(0, -1).join('/')));
  assert.deepEqual([...roots].sort(), [
    'contracts/api/components', 'contracts/api/types', 'contracts/behaviour', 'contracts/design',
  ]);
  assert.equal(expected.every((p) => p.endsWith('.json')), true,
    'a package carrying anything but JSON is carrying a mechanism rather than a value');
});
