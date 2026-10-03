/* The baseline tree is built by three commands in a fixed order, and a built one is reused by its
 * marker, so a phase measured twice pays for the build once. The runner is injected: these cases
 * assert which commands run where, and the real build is the acceptance run's to pay for. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareBaseline, baselineDir, resolveRef, resolveBinary, BUILT_MARKER, BASELINE_BUILD, type Run,
} from './baseline-tree.ts';

const SHA = '0123456789abcdef0123456789abcdef01234567';
const same = (name: string) => name;

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
  assert.equal(resolveRef('HEAD', '/repo', recorder().exec, same), SHA);
  const none: Run = () => ({ status: 128, stdout: '', stderr: 'fatal: bad revision' });
  assert.throws(() => resolveRef('nope', '/repo', none, same), /names no commit/);
});

test('an unbuilt baseline adds a detached worktree, installs from the lockfile and builds, in that order', () => {
  const { calls, exec } = recorder();
  const marked: string[] = [];
  const out = prepareBaseline('HEAD~1', '/repo', { exec, bin: same, under: '/tmp', exists: () => false, mark: (p) => marked.push(p) });
  assert.equal(out.dir, baselineDir(SHA, '/tmp'));
  assert.equal(out.reused, false);
  assert.deepEqual(calls.slice(1).map((c) => [c.command, ...c.args].join(' ')), [
    'git worktree prune',
    `git worktree add --detach ${out.dir} ${SHA}`,
    'bun install --frozen-lockfile',
    'bun run build',
  ]);
  assert.equal(calls[4]?.cwd, out.dir);
  assert.equal(calls[4]?.timeout, BASELINE_BUILD.ms);
  assert.deepEqual(marked, [`${out.dir}/${BUILT_MARKER}`]);
});

test('a built baseline is reused and nothing runs but the ref lookup', () => {
  const { calls, exec } = recorder();
  const out = prepareBaseline('HEAD', '/repo', { exec, bin: same, under: '/tmp', exists: (p) => p.endsWith(BUILT_MARKER) });
  assert.equal(out.reused, true);
  assert.equal(calls.length, 1);
});

test('a half-built baseline is removed before it is added again', () => {
  const { calls, exec } = recorder();
  prepareBaseline('HEAD', '/repo', { exec, bin: same, under: '/tmp', exists: (p) => !p.endsWith(BUILT_MARKER), mark: () => {} });
  assert.equal([calls[1]?.command, ...(calls[1]?.args ?? [])].join(' '), `git worktree remove --force ${baselineDir(SHA, '/tmp')}`);
});

test('a worktree registered in git whose directory is gone is pruned before the add', () => {
  const { calls, exec } = recorder();
  prepareBaseline('HEAD', '/repo', { exec, bin: same, under: '/tmp', exists: () => false, mark: () => {}, remove: () => {} });
  const steps = calls.slice(1).map((c) => [c.command, ...c.args].join(' '));
  assert.ok(steps.indexOf('git worktree prune') >= 0, 'prune runs');
  assert.ok(steps.indexOf('git worktree prune') < steps.findIndex((s) => s.startsWith('git worktree add')), 'prune precedes add');
});

test('a directory that is no registered worktree is deleted when git refuses to remove it', () => {
  const removed: string[] = [];
  const dir = baselineDir(SHA, '/tmp');
  const { calls, exec } = recorder('worktree remove');
  prepareBaseline('HEAD', '/repo', {
    exec, bin: same, under: '/tmp', exists: (p) => !p.endsWith(BUILT_MARKER), mark: () => {}, remove: (p) => removed.push(p),
  });
  assert.deepEqual(removed, [dir]);
  const steps = calls.slice(1).map((c) => [c.command, ...c.args].join(' '));
  assert.ok(steps.findIndex((s) => s.startsWith('git worktree add')) > steps.indexOf('git worktree prune'));
});

test('a failing step names the step and its output, and leaves no marker', () => {
  const { exec } = recorder('run build');
  const marked: string[] = [];
  assert.throws(() => prepareBaseline('HEAD', '/repo', { exec, bin: same, under: '/tmp', exists: () => false, mark: (p) => marked.push(p) }),
    /bun run build[\s\S]*boom/);
  assert.deepEqual(marked, []);
});

test('git is resolved to a host binary and bun is the runtime running this, never a bare name', () => {
  assert.equal(resolveBinary('bun'), process.execPath);
  assert.notEqual(resolveBinary('git'), 'git');
});
