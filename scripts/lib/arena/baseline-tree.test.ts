/* The baseline tree is built by three commands in a fixed order, and a built one is reused by its
 * marker, so a phase measured twice pays for the build once. The runner is injected: these cases
 * assert which commands run where, and the real build is the acceptance run's to pay for. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareBaseline, baselineDir, resolveRef, BUILT_MARKER, BASELINE_BUILD, type Run } from './baseline-tree.ts';

const SHA = '0123456789abcdef0123456789abcdef01234567';

function recorder(fail?: string) {
  const calls: { command: string; args: string[]; cwd: string; timeout?: number }[] = [];
  const exec: Run = (command, args, cwd, timeout) => {
    calls.push({ command, args, cwd, timeout });
    if (args[0] === 'rev-parse') return { status: 0, stdout: `${SHA}\n`, stderr: '' };
    if (fail && args.join(' ').includes(fail)) return { status: 1, stdout: '', stderr: 'boom' };
    return { status: 0, stdout: '', stderr: '' };
  };
  return { calls, exec };
}

test('a ref resolves to the commit it names, and a ref naming nothing says so', () => {
  assert.equal(resolveRef('HEAD', '/repo', recorder().exec), SHA);
  const none: Run = () => ({ status: 128, stdout: '', stderr: 'fatal: bad revision' });
  assert.throws(() => resolveRef('nope', '/repo', none), /names no commit/);
});

test('an unbuilt baseline adds a detached worktree, installs from the lockfile and builds, in that order', () => {
  const { calls, exec } = recorder();
  const marked: string[] = [];
  const out = prepareBaseline('HEAD~1', '/repo', { exec, under: '/tmp', exists: () => false, mark: (p) => marked.push(p) });
  assert.equal(out.dir, baselineDir(SHA, '/tmp'));
  assert.equal(out.reused, false);
  assert.deepEqual(calls.slice(1).map((c) => [c.command, ...c.args].join(' ')), [
    `git worktree add --detach ${out.dir} ${SHA}`,
    'bun install --frozen-lockfile',
    'bun run build',
  ]);
  assert.equal(calls[3]?.cwd, out.dir);
  assert.equal(calls[3]?.timeout, BASELINE_BUILD.ms);
  assert.deepEqual(marked, [`${out.dir}/${BUILT_MARKER}`]);
});

test('a built baseline is reused and nothing runs but the ref lookup', () => {
  const { calls, exec } = recorder();
  const out = prepareBaseline('HEAD', '/repo', { exec, under: '/tmp', exists: (p) => p.endsWith(BUILT_MARKER) });
  assert.equal(out.reused, true);
  assert.equal(calls.length, 1);
});

test('a half-built baseline is removed before it is added again', () => {
  const { calls, exec } = recorder();
  prepareBaseline('HEAD', '/repo', { exec, under: '/tmp', exists: (p) => !p.endsWith(BUILT_MARKER), mark: () => {} });
  assert.equal([calls[1]?.command, ...(calls[1]?.args ?? [])].join(' '), `git worktree remove --force ${baselineDir(SHA, '/tmp')}`);
});

test('a failing step names the step and its output, and leaves no marker', () => {
  const { exec } = recorder('run build');
  const marked: string[] = [];
  assert.throws(() => prepareBaseline('HEAD', '/repo', { exec, under: '/tmp', exists: () => false, mark: (p) => marked.push(p) }),
    /bun run build[\s\S]*boom/);
  assert.deepEqual(marked, []);
});
