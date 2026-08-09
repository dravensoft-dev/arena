import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PORTABILITY_GATES, unknownGates, unreasonedGates } from './run-portability.ts';
import { BLOCKING_OS, SUPPORTED_OS, SUPPORTED_OS_NAMES } from './supported-os.ts';
import { matrixLegs, matrixProblems } from '../../check/arena/check-portability.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const workflow = () => readFileSync(join(repoRoot, '.github/workflows/portability.yml'), 'utf8');

test('every gate in the list is one check-all declares, so a rename fails here', () => {
  assert.deepEqual(unknownGates(), [],
    'a list naming a gate that no longer exists reports a confident pass over less than it says');
});

test('every gate in the list carries a reason, since a matrix row is otherwise a habit', () => {
  assert.deepEqual(unreasonedGates(), []);
  for (const [name, why] of Object.entries(PORTABILITY_GATES)) {
    assert.ok(why.length > 20, `${name} has a label rather than a reason`);
  }
});

test('the four browser gates are in the list, being the ones a platform decides most', () => {
  for (const name of ['check:cards', 'check:focus-trap', 'check:playgrounds', 'check:style-parity']) {
    assert.ok(Object.hasOwn(PORTABILITY_GATES, name), `${name} is missing from the portability list`);
  }
});

test('the workflow matrix is exactly the declared list, in both directions', () => {
  const legs = matrixLegs(workflow());
  assert.deepEqual([...legs.keys()].sort(), SUPPORTED_OS_NAMES.slice().sort(),
    'a routing rule that lives in YAML alone is a rule nothing tests, which is the argument '
    + 'changed-layers.ts already makes about the layer filter');
  assert.deepEqual(matrixProblems(), []);
});

test('a leg that reports without gating says so in both places, or one of them is a lie', () => {
  const legs = matrixLegs(workflow());
  for (const [name, one] of Object.entries(SUPPORTED_OS)) {
    assert.equal(legs.get(name), one.blocking, `${name} disagrees with the matrix`);
  }
  assert.ok(BLOCKING_OS.length >= 1 && BLOCKING_OS.length < SUPPORTED_OS_NAMES.length,
    'at least one leg gates, or the workflow proves nothing, and at least one does not, or this '
    + 'distinction is dead code that will rot before it is next needed');
  assert.equal(SUPPORTED_OS['windows-latest']?.blocking, false,
    'Windows reports and does not gate until a runner has confirmed the branches unit tests '
    + 'carry alone. When it is green that flag flips, and the flip IS the support claim.');
});

test('every supported OS carries a reason, and ubuntu says why it is there twice over', () => {
  for (const [name, one] of Object.entries(SUPPORTED_OS)) {
    assert.ok(one.why.length > 40, `${name} has a label rather than a reason`);
  }
  assert.match(SUPPORTED_OS['ubuntu-latest']?.why ?? '', /single spelling/);
});

test('the workflow does not override core.autocrlf, which is what proves .gitattributes', () => {
  assert.ok(!/core\.autocrlf/.test(workflow().replace(/^\s*#.*$/gm, '')),
    'setting it would prove the line-ending contract works by not letting it be tested');
});

test('the workflow exports no CHROME_PATH, so the candidate list is what CI proves', () => {
  assert.ok(!/^\s*CHROME_PATH:/m.test(workflow()));
});
