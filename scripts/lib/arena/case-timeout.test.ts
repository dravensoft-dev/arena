/* Holds bun's runner to the bound every budgetFor() in this tree relies on: a case that never ends
 * fails at the timeout it declares, a declared timeout above the run's --timeout is the one that
 * counts, and the run goes on to the next case. Both hangs are forced, a promise that never
 * settles and a child that never exits, so the bound is what ends them and never their luck. A
 * case that blocks the thread is not here: no runner preempts one, and 1.4 lets it pass late. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { budgetFor, deadline, type Deadline } from './deadline.ts';

const FLAG: Deadline = deadline('case-timeout:flag', 200,
  'the --timeout the fixture run is given, below every span a fixture case declares, so a case '
  + 'the flag ended rather than its own timeout shows in the duration it reports');
const HUNG: Deadline = deadline('case-timeout:hung', 1_000,
  'the timeout each hung fixture case declares, five times the flag so the two cannot be confused');
const OUTLIVE: Deadline = deadline('case-timeout:outlive', 1_000,
  'how long the fixture case that must pass runs, five times the flag that would end it if the '
  + 'flag were what counted');
const DECLARED: Deadline = deadline('case-timeout:declared', 20_000,
  'the timeout that passing case declares, far above what it runs so a loaded host cannot end it');
const RUNNER: Deadline = deadline('case-timeout:runner', 30_000,
  'a runtime starts and loads one fixture file, a second or two on a loaded machine');

const BUDGET = budgetFor(RUNNER, FLAG, HUNG, OUTLIVE, DECLARED);
const SKIP = process.versions.bun ? false : 'the runner under test is bun\'s, which is the one CI runs';

const fixture = (pidFile: string) => [
  "import { test } from 'node:test';",
  "import { spawn } from 'node:child_process';",
  "import { renameSync, writeFileSync } from 'node:fs';",
  `test('a promise that never settles', { timeout: ${HUNG.ms} }, async () => {`,
  '  setInterval(() => {}, 1_000);',
  '  await new Promise(() => {});',
  '});',
  `test('a child that never exits', { timeout: ${HUNG.ms} }, async () => {`,
  "  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1_000);'], { stdio: 'ignore' });",
  `  writeFileSync(${JSON.stringify(`${pidFile}.part`)}, String(child.pid));`,
  `  renameSync(${JSON.stringify(`${pidFile}.part`)}, ${JSON.stringify(pidFile)});`,
  "  await new Promise((done) => child.once('exit', done));",
  '});',
  `test('a case that outlives the flag', { timeout: ${DECLARED.ms} }, async () => {`,
  `  await new Promise((done) => setTimeout(done, ${OUTLIVE.ms}));`,
  '});',
  "test('the case after them', () => {});",
].join('\n');

const failedAfter = (output: string, name: string) => {
  const line = new RegExp(`^\\(fail\\) ${name} \\[([0-9.]+)ms\\]`, 'm').exec(output);
  assert.ok(line, `"${name}" is not reported failed, so nothing ended it:\n${output}`);
  return Number(line[1]);
};

test('a case that never ends fails at the timeout it declares, a declared timeout outranks --timeout, and the run goes on',
  { timeout: BUDGET, skip: SKIP }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'arena-case-timeout-'));
    const pidFile = join(dir, 'child.pid');
    try {
      const file = join(dir, 'hung.test.ts');
      writeFileSync(file, fixture(pidFile));
      const run = spawn(process.execPath, ['test', `--timeout=${FLAG.ms}`, file], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';
      run.stdout.on('data', (chunk) => { output += String(chunk); });
      run.stderr.on('data', (chunk) => { output += String(chunk); });
      const code = await new Promise<number | null>((done) => run.once('close', done));

      assert.equal(code, 1, `the run ended ${code}, and two failed cases end it 1:\n${output}`);
      for (const name of ['a promise that never settles', 'a child that never exits']) {
        const ms = failedAfter(output, name);
        assert.ok(ms >= (FLAG.ms + HUNG.ms) / 2,
          `"${name}" ended after ${ms}ms, which is the flag's ${FLAG.ms}ms and not its own ${HUNG.ms}ms`);
      }
      assert.match(output, new RegExp(`timed out after ${HUNG.ms}ms`), output);
      assert.doesNotMatch(output, new RegExp(`timed out after ${FLAG.ms}ms`),
        `a case was reported ended by the flag's ${FLAG.ms}ms, which a GitHub runner's annotations repeat but never change:\n${output}`);
      assert.doesNotMatch(output, /^\(fail\) a case that outlives the flag/m,
        `a case declaring ${DECLARED.ms}ms was ended by --timeout=${FLAG.ms}, so a budget above the flag binds nothing`);
      assert.match(output, /^ 2 pass$/m, `bun prints no passing case into a pipe, so the count says the case after them ran:\n${output}`);
      assert.match(output, /^ 2 fail$/m, output);
    } finally {
      if (existsSync(pidFile)) {
        try { process.kill(Number(readFileSync(pidFile, 'utf8')), 'SIGKILL'); } catch { void 0; }
      }
      rmSync(dir, { recursive: true, force: true });
    }
  });
