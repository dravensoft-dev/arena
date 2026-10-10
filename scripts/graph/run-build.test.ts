import test from 'node:test';
import assert from 'node:assert/strict';
import { isBuildStep, parseBuildArgs, partialRunProblems, selectSteps, summarize } from './run-build.ts';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { budgetFor } from '../lib/arena/deadline.ts';
import { COLLECTION, allNodes } from './nodes.ts';

test('the runner takes four flags and refuses anything else', () => {
  assert.deepEqual(parseBuildArgs([]), { force: false, assertFull: false, assemble: false, targets: [] });
  assert.deepEqual(parseBuildArgs(['--force']), { force: true, assertFull: false, assemble: false, targets: [] });
  assert.deepEqual(parseBuildArgs(['--assemble', '--force', '--assert-full']),
    { force: true, assertFull: true, assemble: true, targets: [] });
  assert.throws(() => parseBuildArgs(['--forse']), /unrecognised argument/);
});

test('the three flags are what tells the three commands apart', () => {
  assert.deepEqual(parseBuildArgs(['--assemble']), { force: false, assertFull: false, assemble: true, targets: [] },
    'bun run build:packages assembles and still keeps what has not moved, for iterating on packaging');
  assert.deepEqual(parseBuildArgs([]), { force: false, assertFull: false, assemble: false, targets: [] },
    'bun run build is the loop, and leaves out what only a release ships');
  assert.deepEqual(parseBuildArgs(['--assemble', '--force', '--assert-full']),
    { force: true, assertFull: true, assemble: true, targets: [] },
    'bun run build:release is every step, run, with a kept step failing the run on its own');
});

test('--target names a step, may repeat, and a repeat is one target', () => {
  assert.deepEqual(parseBuildArgs(['--target=build:site']).targets, ['build:site']);
  assert.deepEqual(
    parseBuildArgs(['--target=build:site', '--force', '--target=build:mcp-package', '--target=build:site']).targets,
    ['build:site', 'build:mcp-package'],
  );
});

test('--target with no step is refused, not read as no target', () => {
  assert.throws(() => parseBuildArgs(['--target=']), /names no step/);
  assert.throws(() => parseBuildArgs(['--target']), /unrecognised argument/);
});

test('the tail never collapses the count, so a cheap run cannot read as a whole one', () => {
  const out = summarize(
    [{ name: 'generate:tokens', status: 'pass' }, { name: 'build:tailwind', status: 'cached' }],
    1, 1,
  );
  assert.match(out, /all 2 step\(s\) passed, 1 ran, 1 came from the cache/);
  assert.match(out, /^ {2}PASS {2}generate:tokens$/m);
  assert.match(out, /^ {2}CACHED {2}build:tailwind$/m);
});

test('a failure is counted against the steps that were reached, not against the graph', () => {
  const out = summarize([{ name: 'a', status: 'pass' }, { name: 'b', status: 'fail' }], 2, 0);
  assert.match(out, /1\/2 step\(s\) failed/,
    'the run stops at the first failure, so the denominator is what it got to and the tail says so');
});

test('a run asked to be a full one fails if it kept anything, and names what it kept', () => {
  assert.deepEqual(partialRunProblems([{ name: 'a', status: 'pass' }]), []);
  assert.deepEqual(partialRunProblems([{ name: 'a', status: 'pass' }, { name: 'b', status: 'cached' }]), [
    '1 step(s) came from the cache and this run was asked to be a full one: b. A build that skipped '
    + 'is a build whose idempotence nobody proved.',
  ]);
});

test('the guard is what keeps a workflow from proving idempotence over a build that did nothing', () => {
  const kept = [{ name: 'generate:tokens', status: 'cached' }, { name: 'build:tailwind', status: 'cached' }];
  assert.equal(partialRunProblems(kept).length, 1,
    'CI restores no graph state today, so this passes trivially; it is the guard for the day '
    + 'somebody adds .cache to the paths actions/cache restores, which would turn the whole gate '
    + 'from a full run into an incremental one in silence');
});

test('a build runs what build/ and generate/ declared, and never a gate', () => {
  const declaredIn = new Map([
    ['generate:tokens', 'scripts/generate/arena/generate-tokens.ts'],
    ['build:tailwind', 'scripts/build/tailwind/build-tailwind.ts'],
    ['check:dtcg', 'scripts/check/core/check-dtcg.ts'],
  ]);
  assert.equal(isBuildStep(declaredIn, { name: 'generate:tokens' }), true);
  assert.equal(isBuildStep(declaredIn, { name: 'build:tailwind' }), true);
  assert.equal(isBuildStep(declaredIn, { name: 'check:dtcg' }), false,
    'every node is in one graph, and the phase that declared a node is what says whether a build '
    + 'is the thing that runs it. Without this, subscribing a gate quietly adds it to bun run build');
  assert.equal(isBuildStep(declaredIn, { name: 'check:nothing' }), false);
});

test('a step that says it is release-only stays out of the development build', () => {
  const declaredIn = new Map([['build:react-package', 'scripts/build/react/build-react-package.ts']]);
  assert.equal(isBuildStep(declaredIn, { name: 'build:react-package' }), true,
    'it is under build/, so the phase alone would put it in');
  assert.equal(isBuildStep(declaredIn, { name: 'build:react-package', releaseOnly: 'a reason' }), false,
    'the phase says what a script is; only the node can say that a development loop should not pay '
    + 'for it, so the node says it and carries the why');
});

test('a blocked step is neither a pass nor a failure, and the tail counts it apart', () => {
  const out = summarize([
    { name: 'build:vendor', status: 'pass' },
    { name: 'generate:tokens', status: 'fail' },
    { name: 'build:tailwind', status: 'blocked' },
  ], 2, 0);
  assert.match(out, /^ {2}BLOCKED {2}build:tailwind$/m);
  assert.match(out, /1\/3 step\(s\) failed, 2 ran, 0 came from the cache, 1 did not run because an upstream failed/,
    'a step that never ran is not a step that passed, and a reader has to be able to tell which of '
    + 'the two the tail is reporting');
});

test('a run with nothing blocked says nothing about blocking', () => {
  assert.doesNotMatch(summarize([{ name: 'a', status: 'pass' }], 1, 0), /upstream/);
});

test('a step the suites run is out of every build invocation, assembly included', () => {
  const declaredIn = new Map([['build:angular-tests', 'scripts/build/angular/build-angular-tests.ts']]);
  const node = { name: 'build:angular-tests', runsBeforeSuites: 'a reason' };
  assert.equal(isBuildStep(declaredIn, node), false);
  assert.equal(isBuildStep(declaredIn, node, true), false,
    '--assemble includes what a release ships, and the Angular test emit is not that: bun run test '
    + 'and check-all run it immediately before the suites that read it');
  assert.equal(isBuildStep(declaredIn, { name: 'build:angular-tests' }), true,
    'without the field the phase alone would put it in, which is what it did before');
});

const DECLARED_IN = new Map([
  ['generate:tokens', 'scripts/generate/arena/generate-tokens.ts'],
  ['build:tailwind', 'scripts/build/tailwind/build-tailwind.ts'],
  ['build:vendor', 'scripts/build/react/build-vendor.ts'],
  ['build:intro', 'scripts/build/arena/build-intro.ts'],
  ['build:react-package', 'scripts/build/react/build-react-package.ts'],
  ['build:mcp-package', 'scripts/build/arena/build-mcp-package.ts'],
  ['build:angular-tests', 'scripts/build/angular/build-angular-tests.ts'],
  ['check:tailwind', 'scripts/check/tailwind/check-tailwind.ts'],
]);

const step = (name: string, over: Partial<{ feeds: string[]; releaseOnly: string; runsBeforeSuites: string }> = {}) =>
  ({ name, reads: [], writes: [], feeds: [], ...over });

const GRAPH = [
  step('generate:tokens', { feeds: ['build:tailwind', 'build:mcp-package'] }),
  step('build:tailwind', { feeds: ['build:react-package', 'check:tailwind', 'build:angular-tests'] }),
  step('build:vendor', { feeds: ['build:react-package'] }),
  step('build:intro'),
  step('build:react-package', { releaseOnly: 'a reason' }),
  step('build:mcp-package', { releaseOnly: 'a reason' }),
  step('build:angular-tests', { runsBeforeSuites: 'a reason' }),
  step('check:tailwind'),
];

const names = (steps: { name: string }[]) => steps.map((one) => one.name);

test('with no target the selection is the one each command makes without the flag', () => {
  assert.deepEqual(names(selectSteps(GRAPH, DECLARED_IN, { assemble: false, targets: [] })).sort(),
    ['build:intro', 'build:tailwind', 'build:vendor', 'generate:tokens']);
  assert.deepEqual(names(selectSteps(GRAPH, DECLARED_IN, { assemble: true, targets: [] })).sort(),
    ['build:intro', 'build:mcp-package', 'build:react-package', 'build:tailwind', 'build:vendor', 'generate:tokens']);
});

test('a target is built with every step it reads from and nothing else, itself last', () => {
  const picked = names(selectSteps(GRAPH, DECLARED_IN, { assemble: false, targets: ['build:tailwind'] }));
  assert.deepEqual(picked, ['generate:tokens', 'build:tailwind']);
});

test('a release-only target, or a release-only upstream, is built without --assemble', () => {
  const picked = names(selectSteps(GRAPH, DECLARED_IN, { assemble: false, targets: ['build:react-package'] }));
  assert.deepEqual([...picked].sort(), ['build:react-package', 'build:tailwind', 'build:vendor', 'generate:tokens']);
  assert.equal(picked.at(-1), 'build:react-package');
  assert.ok(!picked.includes('build:intro') && !picked.includes('check:tailwind') && !picked.includes('build:angular-tests'),
    'a step outside the closure, a gate and the suites\' own emit stay out');
});

test('two targets that share an upstream run it once', () => {
  const picked = names(selectSteps(GRAPH, DECLARED_IN,
    { assemble: false, targets: ['build:react-package', 'build:mcp-package'] }));
  assert.equal(picked.filter((one) => one === 'generate:tokens').length, 1);
  assert.equal(new Set(picked).size, picked.length);
  assert.ok(picked.indexOf('generate:tokens') < picked.indexOf('build:mcp-package'));
});

test('a target the graph does not hold, a gate, or the suites\' emit is refused before anything runs', () => {
  assert.throws(() => selectSteps(GRAPH, DECLARED_IN, { assemble: false, targets: ['build:nothing'] }),
    /--target=build:nothing names no step the graph holds/);
  assert.throws(() => selectSteps(GRAPH, DECLARED_IN, { assemble: false, targets: ['check:tailwind'] }),
    /--target=check:tailwind is not a build step/);
  assert.throws(() => selectSteps(GRAPH, DECLARED_IN, { assemble: false, targets: ['build:angular-tests'] }),
    /--target=build:angular-tests is not a build step/);
});

test('a gate and the suites\' emit upstream of a target are left out, whatever feeds them', () => {
  const graph = [
    step('generate:tokens', { feeds: ['build:tailwind'] }),
    step('check:tailwind', { feeds: ['build:tailwind'] }),
    step('build:angular-tests', { runsBeforeSuites: 'a reason', feeds: ['build:tailwind'] }),
    step('build:tailwind'),
  ];
  assert.deepEqual(names(selectSteps(graph, DECLARED_IN, { assemble: false, targets: ['build:tailwind'] })),
    ['generate:tokens', 'build:tailwind']);
});

test('each package and the site build from their own closure, and no closure assembles another package',
  { timeout: budgetFor(COLLECTION) }, async () => {
    const { nodes, declaredIn } = await allNodes(repoRoot);
    const closure = (target: string) => names(selectSteps(nodes, declaredIn, { assemble: false, targets: [target] }));
    const packages = ['build:angular-package', 'build:react-package', 'build:mcp-package', 'build:contracts-package'];
    for (const target of [...packages, 'build:site']) {
      const picked = closure(target);
      assert.equal(picked.at(-1), target, `${target} runs after everything it reads from`);
      assert.ok(picked.every((one) => !one.startsWith('check:')), `${target} builds and never judges`);
      for (const other of packages.filter((one) => one !== target)) {
        assert.ok(!picked.includes(other), `${target} does not assemble ${other}`);
      }
    }
    for (const light of ['build:mcp-package', 'build:contracts-package']) {
      assert.ok(!closure(light).includes('build:angular-demo'), `${light} compiles no Angular`);
    }
  });
