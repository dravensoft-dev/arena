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

test('the matrix is asked on a merge request to main, and by nothing else automatic', () => {
  const text = workflow();
  const triggers = text.slice(text.indexOf('\non:'), text.indexOf('\npermissions:'));

  assert.match(triggers, /pull_request:\s*\n\s*branches:\s*\[main\]/,
    'main is what the two packages are published from, so it is the last place worth asking '
    + 'whether the tree still works on a machine that is not the one it was written on');
  assert.ok(!/schedule:|cron:/.test(triggers),
    'nothing runs on a clock: a scheduled leg nobody reads is a cost with no reader');
  assert.ok(!/\bpush:/.test(triggers),
    'not on a push either, which is the cost of the choice and is stated in the workflow: work '
    + 'that lands on develop and stays there is never asked this question');
  assert.match(triggers, /workflow_dispatch:/,
    'the hand crank stays, since it fires on nobody schedule and is what answers when Windows '
    + 'needs looking at during bring-up');
});

test('all three operating systems are legs, which is the whole subject of the workflow', () => {
  const legs = [...matrixLegs(workflow()).keys()].sort();
  assert.deepEqual(legs, ['macos-latest', 'ubuntu-latest', 'windows-latest']);
});
