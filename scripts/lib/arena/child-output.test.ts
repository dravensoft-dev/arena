/* The loss this module exists to prevent is a race -- the real tsc listing came back short in
 * 2 of 30 runs through a pipe -- and a suite that reproduced it at that rate would be a flake
 * pointing at the wrong file. So the child here is the same mechanism turned certain: it is a
 * FILE rather than a -e string, which flushes synchronously and would survive; its lines are
 * the width of the absolute paths tsc lists; and it hands them over in ONE write far larger
 * than a pipe holds, which is unflushed at process.exit() every time rather than sometimes.
 * Restore the pipe underneath and the first test fails on every run. childOutputAsync is held to
 * the same child, and to a signal, a missing command and an abort. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { childOutput, childOutputAsync, TERM_GRACE } from './child-output.ts';
import { platform } from './platform.ts';
import { waitFor } from './wait-for.ts';
import { deadline, budgetFor, type Deadline } from './deadline.ts';

const LINES = 5000;
const PAD = 'x'.repeat(76);

function chatterbox(lines: number, code: number) {
  const dir = mkdtempSync(join(tmpdir(), 'arena-chatterbox-'));
  const file = join(dir, 'chatterbox.mjs');
  writeFileSync(file, [
    'const written = [];',
    `for (let i = 0; i < ${lines}; i++) written.push('out ' + i + ' ' + '${PAD}');`,
    "process.stdout.write(written.join('\\n') + '\\n');",
    "process.stderr.write('trouble\\n');",
    `process.exit(${code});`,
  ].join('\n'));
  return { dir, file };
}

function withChatterbox<T>(lines: number, code: number, read: (file: string) => T): T {
  const { dir, file } = chatterbox(lines, code);
  try {
    return read(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('a child that writes line by line and then exits is read whole, which a pipe does not manage', () => {
  const r = withChatterbox(LINES, 0, (file) => childOutput(process.execPath, [file]));
  assert.equal(r.error, undefined);
  assert.equal(r.status, 0);
  const lines = r.stdout.split('\n').filter(Boolean);
  assert.equal(lines.length, LINES, `the child wrote ${LINES} line(s) and ${lines.length} came back`);
  assert.equal(lines[LINES - 1], `out ${LINES - 1} ${PAD}`,
    'the last line the child wrote is the one a truncated read loses');
});

test('the two streams stay apart, and output is stdout then stderr, which is what a caller printed before', () => {
  const r = withChatterbox(2, 0, (file) => childOutput(process.execPath, [file]));
  assert.equal(r.stdout, `out 0 ${PAD}\nout 1 ${PAD}\n`);
  assert.equal(r.stderr, 'trouble\n');
  assert.equal(r.output, `${r.stdout}${r.stderr}`);
});

test("the child's exit code is what the caller reads, so a gate still fails on it", () => {
  assert.equal(withChatterbox(1, 7, (file) => childOutput(process.execPath, [file])).status, 7);
});

test('a command that cannot be spawned reports an error, not a child that printed nothing', () => {
  const r = childOutput('arena-no-such-command', []);
  assert.ok(r.error, 'a missing command came back looking like a silent success');
  assert.equal(r.stdout, '');
});

const ABORTED: Deadline = deadline('child-output:aborted', 10_000,
  'one bun process starts and is signalled at once; a cold start on a loaded machine takes most of a '
  + 'second, and the bound only ends a hang in a capture that never heard the abort');

const BUDGET = budgetFor(ABORTED, TERM_GRACE);

const POSIX_ONLY = platform === 'win32' ? 'a signal that ends a child is a POSIX idea' : false;

function script(lines: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'arena-child-async-'));
  const file = join(dir, 'child.mjs');
  writeFileSync(file, lines.join('\n'));
  return { dir, file };
}

test('two children writing a large burst and exiting at once, side by side, are each read whole', async () => {
  const { dir, file } = chatterbox(LINES, 0);
  try {
    const both = await Promise.all([
      childOutputAsync(process.execPath, [file]),
      childOutputAsync(process.execPath, [file]),
    ]);
    assert.equal(both.length, 2);
    for (const r of both) {
      assert.equal(r.error, undefined);
      assert.equal(r.code, 0);
      assert.equal(r.signal, null);
      const lines = r.output.split('\n').filter((line) => line.startsWith('out '));
      assert.equal(lines.length, LINES, `the child wrote ${LINES} line(s) and ${lines.length} came back`);
      assert.equal(lines[LINES - 1], `out ${LINES - 1} ${PAD}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the two streams share one capture in the order the child wrote them, which is what a block prints', async () => {
  const { dir, file } = script([
    "process.stdout.write('first\\n');",
    "process.stderr.write('second\\n');",
    "process.stdout.write('third\\r\\n');",
  ]);
  try {
    const r = await childOutputAsync(process.execPath, [file], { cwd: dir });
    assert.equal(r.output, 'first\nsecond\nthird\n');
    assert.equal(r.code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the exit code travels, so a gate still fails on it', async () => {
  const { dir, file } = chatterbox(1, 7);
  try {
    assert.equal((await childOutputAsync(process.execPath, [file])).code, 7);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a child ended by a signal says which, rather than reading as an exit code', { skip: POSIX_ONLY }, async () => {
  const { dir, file } = script(["process.kill(process.pid, 'SIGKILL');"]);
  try {
    const r = await childOutputAsync(process.execPath, [file]);
    assert.equal(r.code, null);
    assert.equal(r.signal, 'SIGKILL');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a command that cannot be spawned is an error, never a child that printed nothing', async () => {
  const r = await childOutputAsync(join(tmpdir(), 'arena-no-such-command'), []);
  assert.ok(r.error, 'a missing command came back looking like a silent success');
  assert.equal(r.code, null);
  assert.equal(r.output, '');
});

test('an abort ends the child rather than waiting on it', { timeout: BUDGET }, async () => {
  const { dir, file } = script(['setInterval(() => {}, 1_000);']);
  try {
    const stop = new AbortController();
    stop.abort();
    const r = await childOutputAsync(process.execPath, [file], { signal: stop.signal });
    assert.notEqual(r.code, 0, 'a child that ran for ever came back as a pass');
    if (!POSIX_ONLY) assert.equal(r.signal, 'SIGTERM');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a child that ignores SIGTERM is killed when the grace runs out, and the capture says it ignored it',
  { timeout: BUDGET, skip: POSIX_ONLY }, async () => {
    const { dir, file } = script([
      "import { writeFileSync } from 'node:fs';",
      "process.on('SIGTERM', () => {});",
      "process.stdout.write('holding\\n');",
      'writeFileSync(process.argv[2], String(process.pid));',
      'setInterval(() => {}, 1_000);',
    ]);
    const marker = join(dir, 'pid');
    const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
    try {
      const stop = new AbortController();
      const ended = childOutputAsync(process.execPath, [file, marker], { signal: stop.signal });
      const up = await waitFor(() => existsSync(marker), ABORTED);
      assert.ok(up.seen, up.seen ? '' : up.why);
      const pid = Number(readFileSync(marker, 'utf8'));
      stop.abort();
      const r = await ended;
      assert.equal(r.signal, 'SIGKILL');
      assert.equal(r.code, null);
      assert.equal(r.ignored, 'SIGTERM');
      assert.match(r.output, /holding/);
      const gone = await waitFor(() => !alive(pid), ABORTED);
      assert.ok(gone.seen, gone.seen ? '' : gone.why);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

test('a child that ends on SIGTERM is not reported as having ignored it', { timeout: BUDGET, skip: POSIX_ONLY }, async () => {
  const { dir, file } = script(['setInterval(() => {}, 1_000);']);
  try {
    const stop = new AbortController();
    stop.abort();
    const r = await childOutputAsync(process.execPath, [file], { signal: stop.signal });
    assert.equal(r.signal, 'SIGTERM');
    assert.equal(r.ignored, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
