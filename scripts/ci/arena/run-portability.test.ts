import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PORTABILITY_GATES, unknownGates, unreasonedGates } from './run-portability.ts';
import { BLOCKING_OS, SUPPORTED_OS, SUPPORTED_OS_NAMES } from './supported-os.ts';
import {
  MATRIX_WORKFLOW, WORKFLOWS, matrixLegs, matrixProblems,
} from '../../check/arena/check-portability.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const workflow = () => readFileSync(join(repoRoot, WORKFLOWS, MATRIX_WORKFLOW), 'utf8');

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
  for (const name of ['check:focus-trap']) {
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

test('every leg gates, and one that did not would have to say so in both places', () => {
  const legs = matrixLegs(workflow());
  for (const [name, one] of Object.entries(SUPPORTED_OS)) {
    assert.equal(legs.get(name), one.blocking, `${name} disagrees with the matrix`);
  }
  assert.deepEqual(SUPPORTED_OS_NAMES.filter((name) => !BLOCKING_OS.includes(name)), [],
    'a leg that reports without gating hands pr-gate a success whatever it said, so a platform '
    + 'carrying that flag is one whose red mark stops nothing. The flag stays readable and the '
    + 'branch that reads it is held from an injected map in check-portability.test.ts, which is '
    + 'what keeps it from being a clause nothing exercises.');
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

test('the matrix is asked on a merge into develop, and by nothing else automatic', () => {
  const text = workflow();
  const triggers = text.slice(text.indexOf('\non:'), text.indexOf('\npermissions:'));

  assert.match(triggers, /push:\s*\n\s*branches:\s*\[develop\]/,
    'every change reaches main through develop, so a merge into it is the earliest event that '
    + 'asks once per accepted change rather than once per revision of every open contribution');
  assert.ok(!/schedule:|cron:/.test(triggers),
    'nothing runs on a clock: a scheduled leg nobody reads is a cost with no reader');
  assert.ok(!/pull_request/.test(triggers),
    'not on a pull request either, which is the cost of the choice and is stated in the '
    + 'workflow: a contributor learns their change is not portable after review and not during '
    + 'it, and Arena takes pull requests from anyone, so that event bills three operating '
    + 'systems per revision of every one of them');
  assert.ok(!/workflow_dispatch:/.test(triggers),
    'and not by hand either. A leg somebody can trigger is a leg somebody can trigger to make a '
    + 'branch look ready, so the merge is the only thing that asks.');

  assert.deepEqual(triggers.match(/^\s{2}\w[\w-]*:/gm)?.map((one) => one.trim()), ['push:'],
    'one event, counted rather than described, so a trigger added without a reason fails here');
});

test('all three operating systems are legs, which is the whole subject of the workflow', () => {
  const legs = [...matrixLegs(workflow()).keys()].sort();
  assert.deepEqual(legs, ['macos-latest', 'ubuntu-latest', 'windows-latest']);
});
