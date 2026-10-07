import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collect, axisProblems, rangeProblems, engineProblems, runnerProblems, registryRunnerProblems, regionProblems,
  declaredRanges, documents,
} from './check-support.ts';
import { AXES, PEERS, NODE_ENGINE } from '../../lib/arena/support-matrix.ts';

test('the tree states no range, engine or runner the packages do not', () => {
  const { problems } = collect();
  assert.deepEqual(problems, []);
});

test('the gate read a real result set rather than an empty one', () => {
  const { scanned } = collect();
  assert.ok(scanned > 100, `${scanned} consumer document(s) scanned, so a clean pass says nothing`);
  assert.ok(documents().length === scanned);
});

test('every axis carries at least one answer, and every answer its evidence', () => {
  assert.deepEqual(axisProblems(), []);
  assert.ok(AXES.length > 0, 'a repertoire of no axes is a page that answers nothing');
});

test('an axis with no answer is a question the page asks and never answers', () => {
  const problems = axisProblems([{ axis: 'empty', question: 'what?', neutral: true, rows: [] }]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /never answers/);
});

test('an answer with no evidence level fails, since that column is what separates run from allowed', () => {
  const problems = axisProblems([{
    axis: 'one', question: 'what?', neutral: true,
    rows: [{ answer: 'yes', evidence: 'guessed' as never, note: 'no' }],
  }]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /carries no evidence level/);
});

test('the same axis declared twice is a repertoire with two answers to one question', () => {
  const axis = { axis: 'twice', question: 'what?', neutral: true, rows: AXES[0]?.rows ?? [] };
  assert.match(axisProblems([axis, axis])[0] ?? '', /declares "twice" twice/);
});

test('declaredRanges carries every peer of every layer', () => {
  const ranges = declaredRanges();
  for (const peers of Object.values(PEERS)) {
    for (const [name, range] of Object.entries(peers)) {
      assert.ok(ranges.get(name)?.has(range), `${name} at ${range} is not declared`);
    }
  }
});

test('a range typed into prose beside the one a manifest carries is reported', () => {
  const problems = rangeProblems('page.md', 'it pins `react` to `^17` today');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /states "react" at "\^17"/);
});

test('a range that agrees with the manifest passes, so the rule is not a ban on naming one', () => {
  const range = PEERS.react.react;
  assert.deepEqual(rangeProblems('page.md', `it takes \`react\` at \`${range}\``), []);
});

test('another node engine is reported, because the floor reaches a consumer through the manifest', () => {
  assert.match(engineProblems('page.md', 'engines: { node: ">=20" }')[0] ?? '', /node engine of ">=20"/);
  assert.deepEqual(engineProblems('page.md', `engines: { node: "${NODE_ENGINE}" }`), []);
});

test('a runner with no alternative on its line is reported', () => {
  const problems = runnerProblems('page.md', 'Run `bunx --no-install arena audit` before you build');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /with no alternative on the line/);
});

test('a runner beside an alternative passes, and so does the command named bare', () => {
  assert.deepEqual(runnerProblems('page.md', 'npx --no-install arena   # or: bunx / pnpm exec / yarn dlx'), []);
  assert.deepEqual(runnerProblems('page.md', 'Run `arena audit`'), []);
});

test('a registry runner that would fetch the foreign arena package is reported', () => {
  for (const line of [
    'npx arena build', 'npx -y arena doctor', 'bunx arena audit', 'npm exec arena', 'npm exec -- arena build',
    'pnpm dlx arena build', 'yarn dlx arena doctor', 'pnpm dlx arena --no-install',
    'bunx arena@latest build', 'npx arena@latest', 'npx -y arena@0.0.2 doctor', 'Run it with npx arena.',
    'npm x arena build', 'bun x arena build', 'npx "arena" build', "npx 'arena' build",
    'bunx --no arena build', 'bun x --no arena build', 'npx    arena   build',
    'npx --no-install arena doctor; bunx arena build',
  ]) {
    const problems = registryRunnerProblems('page.md', line);
    assert.equal(problems.length, 1, line);
    assert.match(problems[0] ?? '', /registry holds a different `arena`/);
  }
});

test('a registry runner that refuses to install, a scoped package and the bare command pass', () => {
  for (const line of [
    'npx --no-install arena doctor', 'npx --no arena doctor', 'bunx --no-install arena build',
    'npm exec --no -- arena build', 'npx @dravensoft/arena-mcp', 'bunx @dravensoft/arena-mcp',
    'arena build', 'npx arena-foo', 'npx arena/x', 'npm x --no arena', 'pnpm exec arena doctor', 'yarn arena doctor', 'the arena command, run with npx',
  ]) {
    assert.deepEqual(registryRunnerProblems('page.md', line), [], line);
  }
});

test('a line can satisfy the runner rule and the registry rule together', () => {
  const line = 'npx --no-install arena doctor   # or: pnpm exec arena doctor / yarn arena doctor';
  assert.deepEqual(runnerProblems('page.md', line), []);
  assert.deepEqual(registryRunnerProblems('page.md', line), []);
  const bunx = 'bunx --no-install arena doctor   # or: pnpm exec arena doctor / yarn arena doctor';
  assert.deepEqual(runnerProblems('page.md', bunx), []);
  assert.deepEqual(registryRunnerProblems('page.md', bunx), []);
});

test('the repertoire page matches a fresh emit', () => {
  assert.deepEqual(regionProblems(), []);
});
