import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ANGULAR_EMIT, JIT_SUITES, SUITES, suiteSteps, testStep } from '../../check/arena/check-all.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { runSuite } from './run-suite.ts';

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

test('the JIT run reads the layer sources through its preload and no emit, and is no suite a gate or CI runs', () => {
  const [step, ...more] = suiteSteps('angular-jit');
  assert.deepEqual(more, [], 'the JIT run is one step');
  assert.notDeepEqual(step, ANGULAR_EMIT, 'the JIT run exists so a task pays for no ngc emit');
  const args = step?.args ?? [];
  const preload = args[args.indexOf('--preload') + 1] ?? '';
  assert.ok(existsSync(join(repoRoot, preload)), `the preload ${preload} is not there`);
  assert.ok(args.includes('frameworks/angular') && !args.includes('frameworks/angular/build/test'),
    'the JIT run reads the sources, never the emitted tree');
  for (const name of Object.keys(JIT_SUITES)) {
    assert.ok(!(name in SUITES), `${name} would reach verify.yml and check-all, where the emitted tree is the verdict`);
  }
  assert.ok(!testStep({ isBun: true, testFiles: [] }).some((s) => s.args.includes(preload)),
    'bun run check runs the emitted suite, never the JIT one');
});

test('each step runs under a temp root of its own, and the root is gone when the step ends, pass or fail', () => {
  const log = mkdtempSync(join(tmpdir(), 'arena-run-suite-log-'));
  try {
    const step = (name: string, code: number) => ({
      name,
      args: ['-e', [
        "const { appendFileSync, writeFileSync } = require('node:fs');",
        "const { join } = require('node:path');",
        "writeFileSync(join(process.env.TMPDIR, 'made'), 'x');",
        `appendFileSync(${JSON.stringify(join(log, 'seen'))}, process.env.TMPDIR + '\\n');`,
        `process.exit(${code});`,
      ].join('\n')],
    });
    const seen = () => readFileSync(join(log, 'seen'), 'utf8').trim().split('\n');

    assert.equal(runSuite('probe', [step('first', 0), step('second', 0)]), 0);
    const [first, second] = seen();
    assert.ok(first && second && first !== second, 'two steps share one temp root');
    assert.equal(existsSync(first), false, 'a step that passed left its temp root behind');
    assert.equal(existsSync(second), false, 'the last step left its temp root behind');

    assert.equal(runSuite('probe', [step('broken', 3), step('never', 0)]), 3);
    const failed = seen().slice(2);
    assert.equal(failed.length, 1, 'a step ran after the one that failed');
    assert.equal(existsSync(failed[0] ?? ''), false, 'a step that failed left its temp root behind');
  } finally {
    rmSync(log, { recursive: true, force: true });
  }
});
