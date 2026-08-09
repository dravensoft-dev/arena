import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANGULAR_EMIT, SUITES, suiteSteps, testStep } from '../../check/arena/check-all.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const manifest = () => JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));

test('every test script in the manifest goes through the runner and names a real suite', () => {
  const scripts: Record<string, string> = manifest().scripts;
  const names = Object.keys(scripts).filter((key) => key === 'test' || key.startsWith('test:'));
  assert.ok(names.length >= 5, `found ${names.length} test scripts, which is fewer than expected`);

  for (const name of names) {
    const command = scripts[name] ?? '';
    assert.match(command, /^bun scripts\/ci\/arena\/run-suite\.ts \S+$/,
      `${name} spells its own invocation as "${command}", and check-all.ts is the authority`);
    assert.doesNotThrow(() => suiteSteps(command.split(' ').pop() ?? ''),
      `${name} names a suite suiteSteps does not know`);
  }
});

test('no script in the manifest carries a quote character', () => {
  const scripts: Record<string, string> = manifest().scripts;
  const quoted = Object.entries(scripts).filter(([, command]) => /['"]/.test(command));
  assert.deepEqual(quoted, [],
    'cmd.exe leaves a single quote inside the argument rather than stripping it, so a quoted glob '
    + 'reaches bun test as part of the pattern and matches nothing');
});

test('all is exactly what check-all runs, rather than a second reading of it', () => {
  assert.deepEqual(suiteSteps('all'), testStep({ isBun: true, testFiles: [] }),
    'the manifest and the gate runner have to invoke the suite identically, and the only way to '
    + 'be sure of that is for one of them to be the other');
});

test('a suite that reads the Angular emit runs it first, and one that does not, does not', () => {
  assert.deepEqual(suiteSteps('angular')[0], ANGULAR_EMIT);
  assert.deepEqual(suiteSteps('all')[0], ANGULAR_EMIT);
  for (const name of ['scripts', 'react', 'react-dom']) {
    assert.notDeepEqual(suiteSteps(name)[0], ANGULAR_EMIT,
      `${name} reads nothing ngc emits, so paying for the emit would be a slower answer to nothing`);
  }
});

test('an unknown suite is a named failure and never a silent pass over nothing', () => {
  assert.throws(() => suiteSteps('reactt'), /no suite called "reactt"/);
  assert.throws(() => suiteSteps('reactt'), new RegExp(Object.keys(SUITES).join(', ')));
});

test('no suite argument carries a quote, since it is the thing that had drifted', () => {
  for (const name of Object.keys(SUITES)) {
    for (const arg of SUITES[name]?.args ?? []) {
      assert.ok(!/['"]/.test(arg), `${name} passes ${arg}, and spawnSync has no shell to strip it`);
    }
  }
});
