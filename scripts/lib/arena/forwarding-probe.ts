/* Runs a step's compile function in a parent process beside a stand-in compiler, sends the parent
 * a signal the way run-build ends a step, and reports how the parent ended, whether the stand-in
 * is still running once it has, what the parent printed and which directories it left in its
 * temporary directory. Everything lives under one mkdtemp root, and the parent's TMPDIR is a
 * directory in it, so a capture directory that outlives its parent is seen and never leaks. */

import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { deadline, type Deadline } from './deadline.ts';
import { waitFor } from './wait-for.ts';

export const PROBE_IMPORTED: Deadline = deadline('forwarding-probe:imported', 30_000,
  'the parent resolves the whole step module before it writes its ready mark, which takes about half a second on an idle machine, and a full check that keeps every core busy stretches that many times over');
export const PROBE_SPAWNED: Deadline = deadline('forwarding-probe:spawned', 30_000,
  'two bun processes start and the second writes its pid, and a loaded machine starts a runtime in a second or two');
export const PROBE_ENDED: Deadline = deadline('forwarding-probe:ended', 15_000,
  'the stand-in ends on SIGTERM within a fraction of a second and the parent exits when it has');

export type Probed = {
  code: number | null;
  signal: NodeJS.Signals | null;
  stderr: string;
  childPid: number;
  childAliveAtExit: boolean;
  left: string[];
};

export function assertCompilerEnded(probed: Probed, capture: boolean) {
  assert.equal(probed.signal, 'SIGTERM', 'the step ends by the signal it was sent');
  assert.equal(probed.childAliveAtExit, false, 'the compiler is gone when the step is');
  assert.deepEqual(probed.left, [], 'no capture directory outlives the step');
  if (capture) assert.match(probed.stderr, /compiler said hello/, 'the captured output is printed');
}

export const alive = (pid: number) => {
  try { process.kill(pid, 0); return true; } catch { return false; }
};

const STAND_IN = [
  "import { writeFileSync, writeSync } from 'node:fs';",
  "writeSync(1, 'compiler said hello\\n');",
  "writeFileSync(process.env.STAND_IN_PID ?? '', String(process.pid));",
  'setInterval(() => {}, 1_000);',
].join('\n');

export async function probeInterrupt(options: {
  module: string;
  body: string;
  stubAt?: string[] | undefined;
  signal?: NodeJS.Signals | undefined;
}): Promise<Probed> {
  const root = mkdtempSync(join(tmpdir(), 'arena-forward-probe-'));
  const tmp = join(root, 'tmp');
  mkdirSync(tmp);
  const pidFile = join(root, 'child.pid');
  const readyFile = join(root, 'parent.ready');
  let parent: ChildProcess | undefined;
  try {
    const stub = join(root, 'stub.js');
    writeFileSync(stub, STAND_IN);
    for (const rel of options.stubAt ?? []) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      copyFileSync(stub, join(root, rel));
    }
    const parentScript = join(root, 'parent.ts');
    writeFileSync(parentScript, [
      `import * as step from ${JSON.stringify(pathToFileURL(options.module).href)};`,
      `const root = ${JSON.stringify(root)};`,
      `const stub = ${JSON.stringify(stub)};`,
      "import { writeFileSync as markReady } from 'node:fs';",
      `markReady(${JSON.stringify(readyFile)}, 'ready');`,
      options.body,
    ].join('\n'));
    const errPath = join(root, 'parent.stderr');
    const err = openSync(errPath, 'w');
    parent = spawn(process.execPath, [parentScript], {
      stdio: ['ignore', 'ignore', err],
      env: { ...process.env, TMPDIR: tmp, STAND_IN_PID: pidFile },
    });
    closeSync(err);
    let ended: { code: number | null; signal: NodeJS.Signals | null } | undefined;
    parent.once('exit', (code, signal) => { ended = { code, signal }; });
    const imported = await waitFor(() => existsSync(readyFile) || ended !== undefined, PROBE_IMPORTED);
    if (!existsSync(readyFile))
      throw new Error(`the parent never finished its imports: ${imported.seen ? `it exited first, printing ${readFileSync(errPath, 'utf8')}` : imported.why}`);
    const up = await waitFor(() => existsSync(pidFile) && readFileSync(pidFile, 'utf8') !== '', PROBE_SPAWNED);
    if (!up.seen) throw new Error(`the stand-in compiler never started: ${up.why}`);
    const childPid = Number(readFileSync(pidFile, 'utf8'));
    parent.kill(options.signal ?? 'SIGTERM');
    const done = await waitFor(() => ended !== undefined, PROBE_ENDED);
    if (!done.seen || ended === undefined) throw new Error(`the parent never ended: ${done.seen ? '' : done.why}`);
    const childAliveAtExit = alive(childPid);
    if (childAliveAtExit) process.kill(childPid, 'SIGKILL');
    return {
      ...ended,
      stderr: readFileSync(errPath, 'utf8'),
      childPid,
      childAliveAtExit,
      left: readdirSync(tmp),
    };
  } finally {
    parent?.kill('SIGKILL');
    if (existsSync(pidFile)) {
      try { process.kill(Number(readFileSync(pidFile, 'utf8')), 'SIGKILL'); } catch { void 0; }
    }
    rmSync(root, { recursive: true, force: true });
  }
}
