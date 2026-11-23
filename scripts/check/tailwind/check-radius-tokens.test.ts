import test from 'node:test';
import assert from 'node:assert/strict';
import { hasRoundedFull, evaluateManifest, collect, zeroManifestProblem } from './check-radius-tokens.ts';

const ROUNDED_FULL_ROWS: [name: string, classes: string, expected: boolean][] = [
  ['a plain class string carries no rounded-full', 'size-5 rounded-pill bg-base-300', false],
  ['rounded-full is detected', 'size-10 rounded-full', true],
  ['rounded-pill does not false-positive as rounded-full', 'inline-flex rounded-pill', false],
  ['a word-boundary near-miss does not false-positive', 'not-rounded-full-ish', false],
];

test('hasRoundedFull detects rounded-full and nothing near it', () => {
  for (const [name, classes, expected] of ROUNDED_FULL_ROWS) assert.equal(hasRoundedFull(classes), expected, name);
});

const MANIFEST_ROWS: { name: string; manifest: Parameters<typeof evaluateManifest>[0]; expected: { component: string; slot: string }[] }[] = [
  {
    name: 'evaluateManifest flags a slot in `slots`',
    manifest: { component: 'Fixture', slots: { dot: 'size-1.5 rounded-full bg-current' } },
    expected: [{ component: 'Fixture', slot: 'dot' }],
  },
  {
    name: 'evaluateManifest flags a slot only reached through a variant branch',
    manifest: { component: 'Fixture', slots: { root: 'inline-flex' }, variants: { shape: { circle: { root: 'rounded-full' } } } },
    expected: [{ component: 'Fixture', slot: 'root' }],
  },
  { name: 'evaluateManifest reports nothing for a clean manifest', manifest: { component: 'Fixture', slots: { root: 'rounded-pill bg-primary' } }, expected: [] },
];

test('evaluateManifest flags a slot reached by slots or by a variant branch and reports nothing for a clean manifest', () => {
  for (const row of MANIFEST_ROWS) assert.deepEqual(evaluateManifest(row.manifest), row.expected, row.name);
});

test('the real manifest tree carries no rounded-full -- the six known offenders are fixed', () => {
  assert.deepEqual(collect(), []);
});

test('zeroManifestProblem fails on an empty file list and is null on a non-empty one -- a gate that finds nothing must not report a clean pass', () => {
  assert.match(zeroManifestProblem([]) ?? '', /0 manifest/i, 'an empty list is a problem');
  assert.equal(zeroManifestProblem(['X.manifest.json']), null, 'a non-empty list is not');
});

test('collect accepts an explicit file list, so an empty walk finds zero findings rather than falling back to a real one', () => {
  assert.deepEqual(collect([]), []);
});
