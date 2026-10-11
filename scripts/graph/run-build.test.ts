import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  buildOutcome, collate, exitCode, isBuildStep, main, parseBuildArgs, partialRunProblems, runGraph, selectSteps,
  summarize, summaryLine, type BuildResult, type MainDeps,
} from './run-build.ts';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { platform } from '../lib/arena/platform.ts';
import { TERM_GRACE } from '../lib/arena/child-output.ts';
import { budgetFor, deadline, type Deadline } from '../lib/arena/deadline.ts';
import { POLL_MS, waitFor } from '../lib/arena/wait-for.ts';
import { readJson } from '../utils/read-file.ts';
import { COLLECTION, allNodes } from './nodes.ts';
import { topoOrder, upstreamOf, type GraphNode } from './graph.ts';
import { ABORT_GRACE, GIB, type Slots } from './scheduler.ts';
import { STATE_PATH, readState } from './state.ts';
import { trackedPaths, workflowTexts } from './handoff.ts';
import { isExclusion, resolveSpecs } from './pathspecs.ts';

const GRAPH_RUN: Deadline = deadline('run-build:graph-run', 30_000,
  'a run on a scratch graph starts up to seven bun processes that each write a file or two and exit; a cold '
  + 'bun start on a loaded machine takes most of a second, and the bound only ends a hang');

const RUN_BUDGET = budgetFor(COLLECTION, GRAPH_RUN, TERM_GRACE, ABORT_GRACE);

test('the runner takes five flags and refuses anything else', () => {
  assert.deepEqual(parseBuildArgs([]), { force: false, assertFull: false, assemble: false, targets: [], jobs: null });
  assert.deepEqual(parseBuildArgs(['--force']), { force: true, assertFull: false, assemble: false, targets: [], jobs: null });
  assert.deepEqual(parseBuildArgs(['--assemble', '--force', '--assert-full']),
    { force: true, assertFull: true, assemble: true, targets: [], jobs: null });
  assert.deepEqual(parseBuildArgs(['--target=build:site', '--jobs=2', '--assemble']),
    { force: false, assertFull: false, assemble: true, targets: ['build:site'], jobs: 2 });
  assert.throws(() => parseBuildArgs(['--forse']), /unrecognised argument "--forse"; .*--jobs=<n>/);
});

test('the three flags are what tells the three commands apart', () => {
  assert.deepEqual(parseBuildArgs(['--assemble']), { force: false, assertFull: false, assemble: true, targets: [], jobs: null },
    'bun run build:packages assembles and still keeps what has not moved, for iterating on packaging');
  assert.deepEqual(parseBuildArgs([]), { force: false, assertFull: false, assemble: false, targets: [], jobs: null },
    'bun run build is the loop, and leaves out what only a release ships');
  assert.deepEqual(parseBuildArgs(['--assemble', '--force', '--assert-full']),
    { force: true, assertFull: true, assemble: true, targets: [], jobs: null },
    'bun run build:release is every step, run, with a kept step failing the run on its own');
});

test('--jobs takes a whole number once, alone or beside --target and --assemble, and every other shape is refused', () => {
  assert.equal(parseBuildArgs(['--jobs=1']).jobs, 1);
  assert.equal(parseBuildArgs(['--assemble', '--force', '--assert-full', '--jobs=6']).jobs, 6);
  const shapes = ['--jobs=0', '--jobs=', '--jobs=abc', '--jobs=1.5', '--jobs=-1', '--jobs=01'];
  for (const shape of shapes) {
    assert.throws(() => parseBuildArgs(['--target=build:site', shape]), /run-build: --jobs=.* is not a whole number of at least 1/, shape);
  }
  assert.equal(shapes.length, 6);
  assert.throws(() => parseBuildArgs(['--jobs=2', '--jobs=3']), /run-build: --jobs is given twice/);
  assert.throws(() => parseBuildArgs(['--jobs']), /unrecognised argument "--jobs"/);
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
  const out = summarize([{ name: 'generate:tokens', status: 'pass', ms: 512 }, { name: 'build:tailwind', status: 'cached' }]);
  assert.match(out, /all 2 step\(s\) passed, 1 ran, 1 came from the cache/);
  assert.match(out, /^ {2}PASS {2}generate:tokens {2}0\.5 s$/m);
  assert.match(out, /^ {2}CACHED {2}build:tailwind$/m);
});

test('a failure is counted against the steps that were reached, not against the graph', () => {
  const out = summarize([{ name: 'a', status: 'pass', ms: 1 }, { name: 'b', status: 'fail', ms: 1 }]);
  assert.match(out, /1\/2 step\(s\) failed/,
    'the denominator is the steps the run reached, and the tail says so');
});

test('a blocked step is neither a pass nor a failure, and the tail counts it apart', () => {
  const out = summarize([
    { name: 'build:vendor', status: 'pass', ms: 1 },
    { name: 'generate:tokens', status: 'fail', ms: 1 },
    { name: 'build:tailwind', status: 'blocked' },
  ]);
  assert.match(out, /^ {2}BLOCKED {2}build:tailwind$/m);
  assert.match(out, /1\/3 step\(s\) failed, 2 ran, 0 came from the cache, 1 did not run because an upstream failed/,
    'a step that never ran is not a step that passed, and a reader has to be able to tell which of '
    + 'the two the tail is reporting');
});

test('a run with nothing blocked says nothing about blocking', () => {
  assert.doesNotMatch(summarize([{ name: 'a', status: 'pass', ms: 1 }]), /upstream/);
});

test('the summary refuses a line it cannot vouch for, and an interrupted run says what never started', () => {
  assert.throws(() => summaryLine({ name: 'a', status: 'pass' }), /a ran and carries no duration/);
  assert.throws(() => summaryLine({ name: 'a', status: 'fail', ms: Number.NaN }), /carries no duration/);
  assert.throws(() => summaryLine({ name: 'a', status: 'green' } as unknown as BuildResult), /a reports "green"/);
  assert.throws(() => summarize([]), /no step to summarize/);
  const interrupted = summarize([{ name: 'a', status: 'fail', ms: 3, note: 'killed by SIGTERM' }], { notStarted: ['b', 'c'] });
  assert.match(interrupted, /run-build: INTERRUPTED, 1 ran, 0 came from the cache, 2 never started: b, c/);
  assert.doesNotMatch(interrupted, /passed/);
  assert.throws(() => collate(['a'], [{ name: 'b', status: 'pass', ms: 1 }]), /b finished without being planned/);
  assert.throws(() => collate(['a'], [{ name: 'a', status: 'pass', ms: 1 }, { name: 'a', status: 'pass', ms: 1 }]), /a is reported twice/);
  assert.throws(() => collate(['a', 'b'], [{ name: 'a', status: 'pass', ms: 1 }]), /b is planned and neither finished nor listed as not started/);
  assert.deepEqual(collate(['a', 'b'], [{ name: 'b', status: 'pass', ms: 1 }, { name: 'a', status: 'cached' }]).map((r) => r.name), ['a', 'b']);
  assert.equal(exitCode([{ name: 'a', status: 'pass', ms: 1 }], [], true), 130);
  assert.equal(exitCode([{ name: 'a', status: 'pass', ms: 1 }], ['kept'], false), 1);
  assert.equal(exitCode([{ name: 'a', status: 'blocked' }, { name: 'b', status: 'cached' }], [], false), 0);
});

test('a build step exits 0 to pass, and every other ending is a failure that names itself', () => {
  assert.deepEqual(buildOutcome({ code: 0, signal: null, output: '' }), { status: 'pass' });
  assert.deepEqual(buildOutcome({ code: 1, signal: null, output: '' }), { status: 'fail' });
  assert.deepEqual(buildOutcome({ code: 2, signal: null, output: '' }), { status: 'fail', note: 'exited 2' },
    'a gate that cannot run exits 2 and is a SKIP; a build has nothing it may skip');
  assert.deepEqual(buildOutcome({ code: null, signal: 'SIGTERM', output: '' }), { status: 'fail', note: 'killed by SIGTERM' });
  assert.deepEqual(buildOutcome({ code: null, signal: 'SIGKILL', output: '', ignored: 'SIGTERM' }),
    { status: 'fail', note: 'ignored SIGTERM, killed by SIGKILL' });
  assert.deepEqual(buildOutcome({ code: null, signal: null, output: '', error: new Error('ENOENT') }),
    { status: 'fail', note: 'failed to spawn: ENOENT' });
  assert.deepEqual(buildOutcome({ code: null, signal: null, output: '' }),
    { status: 'fail', note: 'ended with neither an exit code nor a signal' });
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

test('a step the suites run is out of every build invocation, assembly included', () => {
  const declaredIn = new Map([['build:angular-tests', 'scripts/build/angular/build-angular-tests.ts']]);
  const node = { name: 'build:angular-tests', runsBeforeSuites: 'a reason' };
  assert.equal(isBuildStep(declaredIn, node), false);
  assert.equal(isBuildStep(declaredIn, node, true), false,
    '--assemble includes what a release ships, and the Angular test emit is not that: bun run test runs it before the suites that read it, '
    + 'and check-all\'s Angular suite step waits for it');
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
  { timeout: RUN_BUDGET }, async () => {
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

const PACKAGES = ['build:angular-package', 'build:react-package'];
const RUNNER = /^bun scripts\/graph\/run-build\.ts((?: --[a-z-]+(?:=[\w:-]+)?)+)$/;

function missBuild(file: string, text: string) {
  const lines = text.split('\n');
  const misses = lines.flatMap((line, at) => (line.includes("cache-hit != 'true'") ? [at] : []));
  if (misses.length !== 1) throw new Error(`${file} has ${misses.length} step(s) that build on a cache miss; the suite reads exactly one`);
  const rest = lines.slice(misses[0]! + 1);
  const run = rest.findIndex((line) => /^\s*run:/.test(line));
  const named = rest.findIndex((line) => /^\s*- name:/.test(line));
  if (run < 0 || (named >= 0 && named < run)) throw new Error(`${file}: the step that builds on a cache miss has no run: line`);
  const command = (rest[run] ?? '').replace(/^\s*run:\s*/, '').trimEnd();
  if (/^[|>]/.test(command) || command.endsWith('\\')) {
    throw new Error(`${file}: the step that builds on a cache miss runs a block or a continued line, which the suite does not read; write it as one run: line`);
  }
  const flags = RUNNER.exec(command)?.[1]?.trim().split(' ');
  if (!flags) throw new Error(`${file}: the miss step's command "${command}" is not bun scripts/graph/run-build.ts followed by flags`);
  const targets = flags.filter((flag) => flag.startsWith('--target=')).map((flag) => flag.slice('--target='.length));
  const stray = flags.filter((flag) => !['--force', '--assert-full'].includes(flag) && !flag.startsWith('--target='));
  if (stray.length > 0 || targets.length === 0) {
    throw new Error(`${file}: the miss step's flags ${flags.join(' ')} are not --force, --assert-full and at least one --target=<step>`);
  }
  const gate = rest.slice(run).join('\n').match(/bun run (check:[\w:-]+)/)?.[1];
  if (!gate) throw new Error(`${file} runs no gate after the step that builds on a cache miss`);
  return { targets, gate };
}

test('a miss step the suite cannot read in full is refused with a sentence, never read in part', () => {
  const step = (run: string) => ['      - name: build', "        if: steps.build.outputs.cache-hit != 'true'", run,
    '      - run: bun run check:mcp'].join('\n');
  const flat = 'bun scripts/graph/run-build.ts --force --assert-full';
  assert.deepEqual(missBuild('a.yml', step(`        run: ${flat} --target=build:site --target=generate:tokens`)),
    { targets: ['build:site', 'generate:tokens'], gate: 'check:mcp' });
  assert.throws(() => missBuild('a.yml', step('        run: |\n          bun scripts/graph/run-build.ts --target=build:site')),
    /a\.yml: .*runs a block or a continued line/);
  assert.throws(() => missBuild('a.yml', step(`        run: ${flat} --target=build:site \\\n          --target=generate:tokens`)),
    /a\.yml: .*runs a block or a continued line/);
  assert.throws(() => missBuild('a.yml', step(`        run: ${flat} --target=build:site --target=$TARGET`)),
    /a\.yml: the miss step's command/);
  assert.throws(() => missBuild('a.yml', step(`        run: ${flat}`)), /at least one --target/);
  assert.throws(() => missBuild('a.yml', step(`        run: ${flat} --target=build:site\n`) + '\n' + step('        run: x')),
    /2 step\(s\) that build on a cache miss/);
  assert.throws(() => missBuild('a.yml', 'name: x'), /0 step\(s\) that build on a cache miss/);
});

function requiredOf(nodes: GraphNode[], declaredIn: Map<string, string>, tracked: string[], gate: string) {
  const known = new Map(nodes.map((node) => [node.name, node]));
  const absentFromAClone = (node: GraphNode) => node.writes
    .filter((spec) => !isExclusion(spec))
    .some((spec) => resolveSpecs([spec], tracked).length === 0);
  return [...upstreamOf(nodes, gate)]
    .filter((name) => isBuildStep(declaredIn, known.get(name)!, true) && absentFromAClone(known.get(name)!));
}

function unbuilt(
  nodes: GraphNode[], declaredIn: Map<string, string>, tracked: string[], gate: string, targets: string[],
) {
  const selected = (list: string[]) => new Set(names(selectSteps(nodes, declaredIn, { assemble: false, targets: list })));
  const built = selected(targets);
  const otherOnly = new Set<string>();
  if (gate === 'check:packages') {
    const other = PACKAGES.filter((one) => !targets.includes(one));
    if (other.length !== PACKAGES.length - 1) {
      throw new Error(`a miss for ${gate} must build exactly one of ${PACKAGES.join(' and ')}, and it builds ${targets.join(', ')}`);
    }
    for (const name of selected(other)) if (!built.has(name)) otherOnly.add(name);
  }
  return requiredOf(nodes, declaredIn, tracked, gate).filter((name) => !built.has(name) && !otherOnly.has(name));
}

function ownStep(file: string, nodes: GraphNode[]) {
  const named = /\/npm-publish-([a-z]+)-package\.yml$/.exec(file);
  const step = named ? `build:${named[1]}-package` : file.endsWith('/pages.yml') ? 'build:site' : undefined;
  if (!step || !nodes.some((node) => node.name === step)) {
    throw new Error(`${file} maps to no package step the graph holds: a publish is npm-publish-<name>-package.yml for `
      + 'build:<name>-package, and the site is pages.yml for build:site');
  }
  return step;
}

test('a miss builds every step its gate reads whose output a clone does not carry', () => {
  const declaredIn = new Map([
    ['generate:page', 'scripts/generate/a.ts'], ['generate:doc', 'scripts/generate/b.ts'],
    ['build:pack', 'scripts/build/c.ts'], ['build:other', 'scripts/build/d.ts'],
  ]);
  const graph = [
    { ...step('generate:page', { feeds: ['check:gate'] }), writes: ['out/page.html'] },
    { ...step('generate:doc', { feeds: ['check:gate'] }), writes: ['docs/doc.md', '!docs/skip.md'] },
    { ...step('build:pack', { feeds: ['check:gate'] }), writes: ['out/pack.tgz'] },
    step('check:gate'),
  ];
  const tracked = ['docs/doc.md'];
  assert.deepEqual(unbuilt(graph, declaredIn, tracked, 'check:gate', ['build:pack']), ['generate:page'],
    'a step whose every write a clone checks out is not required; one whose write it lacks is');
  assert.deepEqual(unbuilt(graph, declaredIn, tracked, 'check:gate', ['build:pack', 'generate:page']), []);
  assert.throws(() => unbuilt(graph, declaredIn, tracked, 'check:packages', ['build:pack']),
    /must build exactly one of build:angular-package and build:react-package, and it builds build:pack/);
});

test('every publish and the site builds on a miss what its gate reads that a clone does not carry',
  { timeout: RUN_BUDGET }, async () => {
    const { nodes, declaredIn } = await allNodes(repoRoot);
    const tracked = trackedPaths(repoRoot);
    const files = workflowTexts(repoRoot).filter((one) => /\/(npm-publish-.*|pages)\.yml$/.test(one.file));
    assert.ok(files.length >= 5, 'the publish workflows and the site are found');
    const packageSteps = files.filter((one) => !one.file.endsWith('/pages.yml')).map((one) => ownStep(one.file, nodes));
    const checked: string[] = [];
    for (const { file, text } of files) {
      const { targets, gate } = missBuild(file, text);
      const expected = ownStep(file, nodes);
      const picked = names(selectSteps(nodes, declaredIn, { assemble: false, targets }));
      const foreign = packageSteps.filter((one) => one !== expected && picked.includes(one));
      assert.ok(targets.includes(expected) && foreign.length === 0,
        `${file} builds ${picked.filter((one) => packageSteps.includes(one) || one === 'build:site').join(', ')} and should build ${expected} alone`);
      const required = requiredOf(nodes, declaredIn, tracked, gate);
      assert.ok(required.length > 0, `${file}: ${gate} reads no step whose output a clone lacks, which the tree contradicts; tracked paths are wrong`);
      if (gate === 'check:mcp') {
        assert.ok(['generate:playgrounds', 'generate:kitchen-sink'].every((one) => required.includes(one)),
          `${file}: ${gate} holds the playground and kitchen-sink pages, which are gitignored, so both generators are required`);
      }
      assert.deepEqual(unbuilt(nodes, declaredIn, tracked, gate, targets), [],
        `${file}: ${gate} reads steps the miss does not build; add them as --target`);
      checked.push(file);
    }
    assert.equal(checked.length, files.length, 'every workflow found is checked');
  });

test('a publish workflow that names no package step the graph holds is refused, not skipped', () => {
  const graph = [step('build:mcp-package')];
  assert.equal(ownStep('.github/workflows/npm-publish-mcp-package.yml', graph), 'build:mcp-package');
  assert.throws(() => ownStep('.github/workflows/npm-publish-vue-package.yml', graph), /maps to no package step the graph holds/);
  assert.throws(() => ownStep('.github/workflows/release.yml', graph), /maps to no package step the graph holds/);
});

const WIDE: Slots = { total: 4, heavy: 2, browser: 1 };
const SERIAL: Slots = { total: 1, heavy: 1, browser: 1 };

const PRELUDE = [
  "import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
  "import { dirname } from 'node:path';",
  'const put = (path, text) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); };',
];

type Spec = { name: string; reads?: string[]; writes: string[]; feeds?: string[]; body: string[] };

function scratch(specs: Spec[], files: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), 'run-build-graph-'));
  const declaredIn = new Map<string, string>();
  const nodes: GraphNode[] = specs.map((spec) => {
 const script = `scripts/generate/${spec.name.replace(/[^a-z0-9]+/g, '-')}.mjs`;
 mkdirSync(dirname(join(root, script)), { recursive: true });
 writeFileSync(join(root, script), [...PRELUDE, ...spec.body].join('\n'));
 declaredIn.set(spec.name, script);
 return { name: spec.name, reads: spec.reads ?? [], writes: spec.writes, feeds: spec.feeds ?? [] };
  });
  for (const [path, text] of Object.entries(files)) {
 mkdirSync(dirname(join(root, path)), { recursive: true });
 writeFileSync(join(root, path), text);
  }
  return {
 root, nodes, declaredIn, order: topoOrder(nodes),
 commandFor: (node: GraphNode) => ({ command: process.execPath, args: [join(root, declaredIn.get(node.name) ?? '')] }),
 done: () => { rmSync(root, { recursive: true, force: true }); },
  };
}

const chain = (failing = ''): Spec[] => [
  { name: 'generate:a', reads: ['src/a.txt'], writes: ['out/a.txt'], feeds: ['generate:b', 'generate:d'],
 body: ["put('out/a.txt', readFileSync('src/a.txt', 'utf8') + 'a');"] },
  { name: 'generate:b', reads: ['out/a.txt'], writes: ['out/b.txt'], feeds: ['generate:c'],
 body: [...(failing === 'generate:b' ? ['process.exit(1);'] : []), "put('out/b.txt', readFileSync('out/a.txt', 'utf8') + 'b');"] },
  { name: 'generate:c', reads: ['out/b.txt'], writes: ['out/c.txt', 'out/seen.json'],
 body: ["copyFileSync('.cache/graph/state.json', 'out/seen.json');", "put('out/c.txt', readFileSync('out/b.txt', 'utf8') + 'c');"] },
  { name: 'generate:d', reads: ['out/a.txt'], writes: ['out/d.txt'],
 body: ["put('out/d.txt', readFileSync('out/a.txt', 'utf8') + 'd');"] },
  { name: 'generate:e', reads: ['src/e.txt'], writes: ['out/e.txt'],
 body: ["put('out/e.txt', readFileSync('src/e.txt', 'utf8') + 'e');"] },
  { name: 'generate:f', reads: ['doc/f.md'], writes: ['doc/f.md'],
 body: ["const text = readFileSync('doc/f.md', 'utf8');", "if (!text.endsWith('described\\n')) writeFileSync('doc/f.md', text + 'described\\n');"] },
];

const SOURCES = { 'src/a.txt': 'A', 'src/e.txt': 'E', 'doc/f.md': '# f\n' };

const statusOf = (results: BuildResult[]) => Object.fromEntries(results.map((r) => [r.name, r.status]));

test('a failing step blocks only what reads what it writes, transitively, and every other step runs to its end',
  { timeout: RUN_BUDGET }, async () => {
 const s = scratch(chain('generate:b'), SOURCES);
 try {
   const printed: string[] = [];
   const run = await runGraph({ nodes: s.nodes, declaredIn: s.declaredIn, order: s.order, root: s.root, force: true,
     slots: WIDE, commandFor: s.commandFor, print: (text) => { printed.push(text); } });
   assert.equal(run.results.length, s.order.length);
   assert.deepEqual(statusOf(run.results), {
     'generate:a': 'pass', 'generate:b': 'fail', 'generate:c': 'blocked',
     'generate:d': 'pass', 'generate:e': 'pass', 'generate:f': 'pass',
   });
   assert.deepEqual(run.notStarted, []);
   assert.equal(existsSync(join(s.root, 'out', 'c.txt')), false);
   assert.equal(readFileSync(join(s.root, 'out', 'd.txt'), 'utf8'), 'Aad');
   assert.deepEqual([...readState(s.root).keys()].sort(), ['generate:a', 'generate:d', 'generate:e', 'generate:f']);
   assert.match(printed.join(''), /run-build: generate:c does not run, because generate:b failed/);
   assert.equal(exitCode(run.results, [], run.interrupted), 1);
   assert.match(summarize(run.results), /1\/6 step\(s\) failed, 5 ran, 0 came from the cache, 1 did not run because an upstream failed/);
 } finally {
   s.done();
 }
  });

test('a step that cannot be spawned is a failure naming the spawn, and blocks all of its downstream, however far',
  { timeout: RUN_BUDGET }, async () => {
 const s = scratch(chain(), SOURCES);
 try {
   const commandFor = (node: GraphNode) => (node.name === 'generate:a'
     ? { command: join(s.root, 'no-such-binary'), args: [] }
     : s.commandFor(node));
   const run = await runGraph({ nodes: s.nodes, declaredIn: s.declaredIn, order: s.order, root: s.root, force: true,
     slots: WIDE, commandFor, print: () => {} });
   assert.deepEqual(statusOf(run.results), {
     'generate:a': 'fail', 'generate:b': 'blocked', 'generate:c': 'blocked',
     'generate:d': 'blocked', 'generate:e': 'pass', 'generate:f': 'pass',
   });
   assert.match(run.results[0]?.note ?? '', /failed to spawn/);
 } finally {
   s.done();
 }
  });

test('the state is written as each step ends, so a step that runs later finds every green before it on disk',
  { timeout: RUN_BUDGET }, async () => {
 const s = scratch(chain(), SOURCES);
 try {
   const run = await runGraph({ nodes: s.nodes, declaredIn: s.declaredIn, order: s.order, root: s.root, force: true,
     slots: WIDE, commandFor: s.commandFor, print: () => {} });
   assert.ok(run.results.every((r) => r.status === 'pass'), JSON.stringify(statusOf(run.results)));
   const seen = JSON.parse(readFileSync(join(s.root, 'out', 'seen.json'), 'utf8')).nodes;
   assert.ok('generate:a' in seen && 'generate:b' in seen, `generate:c found ${Object.keys(seen).join(', ')}`);
   assert.ok(!('generate:c' in seen));
   assert.deepEqual([...readState(s.root).keys()].sort(), s.order.map((node) => node.name).sort(),
     'steps ending side by side each land, and none is lost to another\'s write');
 } finally {
   s.done();
 }
  });

test('a state write that throws ends the run with a sentence naming the step, and main exits 1 with it',
  { timeout: RUN_BUDGET }, async () => {
 const s = scratch(chain(), SOURCES);
 try {
   mkdirSync(join(s.root, STATE_PATH, 'occupied'), { recursive: true });
   await assert.rejects(runGraph({ nodes: s.nodes, declaredIn: s.declaredIn, order: s.order, root: s.root, force: true,
     slots: WIDE, commandFor: s.commandFor, print: () => {} }), /scheduler: the finished hook threw for generate:/);
   const errors: string[] = [];
   const code = await main(['--force'], { root: s.root, collect: async () => ({ nodes: s.nodes, declaredIn: s.declaredIn }),
     signal: new AbortController().signal, print: () => {}, error: (text) => { errors.push(text); }, cores: 8, free: 16 * GIB,
     commandFor: s.commandFor });
   assert.equal(code, 1);
   assert.match(errors.join(''), /the finished hook threw for generate:/);
 } finally {
   s.done();
 }
  });

test('the fingerprint recorded as each step ends lets the next run keep exactly what did not move',
  { timeout: RUN_BUDGET }, async () => {
 const s = scratch(chain(), SOURCES);
 try {
   const statuses = async (force: boolean) => statusOf((await runGraph({ nodes: s.nodes, declaredIn: s.declaredIn,
     order: s.order, root: s.root, force, slots: WIDE, commandFor: s.commandFor, print: () => {} })).results);
   const all = (status: string) => Object.fromEntries(s.order.map((node) => [node.name, status]));
   assert.deepEqual(await statuses(true), all('pass'));
   assert.deepEqual(await statuses(false), all('cached'),
     'a fingerprint measured before a step that writes what it reads, or before an upstream wrote, never matches the next run');
   writeFileSync(join(s.root, 'src', 'e.txt'), 'E2');
   assert.deepEqual(await statuses(false), { ...all('cached'), 'generate:e': 'pass' });
   writeFileSync(join(s.root, 'src', 'a.txt'), 'A2');
   assert.deepEqual(await statuses(false),
     { ...all('pass'), 'generate:e': 'cached', 'generate:f': 'cached' });
 } finally {
   s.done();
 }
  });

const meet = (self: string, other: string) => [
  `put('out/${self}.flag', '1');`,
  `const until = Date.now() + ${GRAPH_RUN.ms};`,
  `while (!existsSync('out/${other}.flag')) { if (Date.now() > until) process.exit(3); await new Promise((r) => setTimeout(r, ${POLL_MS})); }`,
  `put('out/${self}.txt', 'met');`,
];

test('two ready steps run side by side, so each meets the file the other writes while both are running',
  { timeout: RUN_BUDGET }, async () => {
 const s = scratch([
   { name: 'generate:x', writes: ['out/x.flag', 'out/x.txt'], body: meet('x', 'y') },
   { name: 'generate:y', writes: ['out/y.flag', 'out/y.txt'], body: meet('y', 'x') },
 ]);
 try {
   const run = await runGraph({ nodes: s.nodes, declaredIn: s.declaredIn, order: s.order, root: s.root, force: true,
     slots: { total: 2, heavy: 1, browser: 1 }, commandFor: s.commandFor, print: () => {} });
   assert.deepEqual(statusOf(run.results), { 'generate:x': 'pass', 'generate:y': 'pass' });
 } finally {
   s.done();
 }
  });

test('one slot runs the steps in the order the graph derives, one block each', { timeout: RUN_BUDGET }, async () => {
  const s = scratch(chain(), SOURCES);
  try {
 const printed: string[] = [];
 await runGraph({ nodes: s.nodes, declaredIn: s.declaredIn, order: s.order, root: s.root, force: true, slots: SERIAL,
   commandFor: s.commandFor, print: (text) => { printed.push(text); } });
 const headers = [...printed.join('').matchAll(/^> (.+)$/gm)].map((match) => match[1]);
 assert.deepEqual(headers, s.order.map((node) => node.name));
 assert.equal(printed.length, s.order.length);
  } finally {
 s.done();
  }
});

const killHold = (root: string, file: string) => {
  const path = join(root, file);
  if (!existsSync(path)) return;
  try { process.kill(Number(readFileSync(path, 'utf8')), 'SIGKILL'); } catch { void 0; }
};

test('an interrupt ends the running step, starts nothing further, records nothing for it and exits 130',
  { timeout: RUN_BUDGET, skip: platform === 'win32' ? 'a signal sent to a process is a POSIX idea' : false }, async () => {
 const s = scratch([
   { name: 'generate:hold', writes: ['out/hold.pid'], feeds: ['generate:after'],
     body: ["put('out/hold.pid', String(process.pid));", 'setInterval(() => {}, 1_000);'] },
   { name: 'generate:after', reads: ['out/hold.pid'], writes: ['out/after.txt'], body: ["put('out/after.txt', 'x');"] },
   { name: 'generate:later', writes: ['out/later.txt'], body: ["put('out/later.txt', 'x');"] },
 ]);
 try {
   const stop = new AbortController();
   const pending = runGraph({ nodes: s.nodes, declaredIn: s.declaredIn, order: s.order, root: s.root, force: true,
     slots: SERIAL, signal: stop.signal, commandFor: s.commandFor, print: () => {} });
   const up = await waitFor(() => existsSync(join(s.root, 'out', 'hold.pid')), GRAPH_RUN);
   assert.ok(up.seen, up.seen ? '' : up.why);
   stop.abort();
   const run = await pending;
   assert.equal(run.interrupted, true);
   assert.deepEqual(run.results.map((r) => [r.name, r.status]), [['generate:hold', 'fail']]);
   assert.match(run.results[0]?.note ?? '', /killed by SIGTERM/);
   assert.deepEqual([...run.notStarted].sort(), ['generate:after', 'generate:later']);
   assert.equal(readState(s.root).has('generate:hold'), false);
   assert.equal(exitCode(run.results, [], run.interrupted), 130);
   assert.match(summarize(run.results, { notStarted: run.notStarted }), /run-build: INTERRUPTED, 1 ran, 0 came from the cache, 2 never started/);
 } finally {
   killHold(s.root, 'out/hold.pid');
   s.done();
 }
  });

test('main refuses a bad --jobs, an unknown target and a pool no slot runs, before any step runs or any state is written',
  { timeout: RUN_BUDGET }, async () => {
 const s = scratch(chain(), SOURCES);
 try {
   const errors: string[] = [];
   const deps: MainDeps = { root: s.root, collect: async () => ({ nodes: s.nodes, declaredIn: s.declaredIn }),
     signal: new AbortController().signal, print: () => {}, error: (text) => { errors.push(text); }, cores: 8,
     free: 16 * GIB, commandFor: s.commandFor };
   const refused = [['--jobs=0'], ['--jobs=2', '--jobs=3'], ['--jobs'], ['--target=generate:nothing', '--jobs=2']];
   for (const argv of refused) assert.equal(await main(argv, deps), 1, argv.join(' '));
   const typo = s.nodes.map((node) => (node.name === 'generate:a' ? { ...node, pool: 'compilr' as never, cost: 3 } : node));
   assert.equal(await main(['--force'], { ...deps, collect: async () => ({ nodes: typo, declaredIn: s.declaredIn }) }), 1);
   assert.equal(errors.length, refused.length + 1);
   assert.match(errors.at(-1) ?? '', /run-build: the run cannot be scheduled: generate:a declares pool "compilr"/);
   assert.equal(existsSync(join(s.root, STATE_PATH)), false, 'a refused run wrote state');
   assert.equal(existsSync(join(s.root, 'out')), false, 'a refused run ran a step');
 } finally {
   s.done();
 }
  });

test('main builds a target with --jobs, prints the closure and the slots, and a full run that kept nothing exits 0',
  { timeout: RUN_BUDGET }, async () => {
 const s = scratch(chain(), SOURCES);
 try {
   const printed: string[] = [];
   const code = await main(['--target=generate:c', '--jobs=2', '--force', '--assert-full'], { root: s.root,
     collect: async () => ({ nodes: s.nodes, declaredIn: s.declaredIn }), signal: new AbortController().signal,
     print: (text) => { printed.push(text); }, error: () => {}, cores: 8, free: 16 * GIB, commandFor: s.commandFor });
   const text = printed.join('');
   assert.equal(code, 0, text);
   assert.match(text, /run-build: 3 step\(s\), the upstream closure of generate:c/);
   assert.match(text, /run-build: up to 2 step\(s\) at once \(--jobs=2\)/);
   assert.match(text, /run-build: all 3 step\(s\) passed, 3 ran, 0 came from the cache/);
   assert.equal(existsSync(join(s.root, 'out', 'e.txt')), false, 'a step outside the closure ran');
 } finally {
   s.done();
 }
  });

test('every build step\'s npm script is bun and the file that declares it, so spawning that file is the step',
  { timeout: RUN_BUDGET }, async () => {
 const { nodes, declaredIn } = await allNodes(repoRoot);
 const scripts = readJson(join(repoRoot, 'package.json')).scripts as Record<string, string>;
 const steps = selectSteps(nodes, declaredIn, { assemble: true, targets: [] });
 assert.ok(steps.length > 0);
 const differ = steps.filter((node) => scripts[node.name] !== `bun ${declaredIn.get(node.name)}`)
   .map((node) => `${node.name}: ${scripts[node.name]}`);
 assert.deepEqual(differ, [], 'run-build spawns the declaring file so a signal reaches the step and not a wrapper');
  });

const alone = (self: string) => [
  'const start = Date.now();',
  `await new Promise((r) => setTimeout(r, ${POLL_MS * 20}));`,
  `put('out/${self}.json', JSON.stringify({ start, end: Date.now() }));`,
];

test('main hands --jobs=1 to the scheduler, so two ready steps never overlap', { timeout: RUN_BUDGET }, async () => {
  const s = scratch([
    { name: 'generate:x', writes: ['out/x.json'], body: alone('x') },
    { name: 'generate:y', writes: ['out/y.json'], body: alone('y') },
  ]);
  try {
    const code = await main(['--force', '--jobs=1'], { root: s.root, collect: async () => ({ nodes: s.nodes, declaredIn: s.declaredIn }),
      signal: new AbortController().signal, print: () => {}, error: () => {}, cores: 8, free: 16 * GIB, commandFor: s.commandFor });
    assert.equal(code, 0);
    assert.deepEqual([...readState(s.root).keys()].sort(), ['generate:x', 'generate:y']);
    const [x, y] = ['x', 'y'].map((self) => readJson(join(s.root, 'out', `${self}.json`)) as { start: number; end: number });
    assert.ok(x && y && x.end > x.start && y.end > y.start, 'each step ran for a measurable time');
    assert.ok(x.end <= y.start || y.end <= x.start, `the steps overlapped: ${JSON.stringify({ x, y })}`);
  } finally {
    s.done();
  }
});

const HOLDING = [
  { name: 'generate:hold', writes: ['out/hold.txt'],
    body: ["put('out/hold.txt', 'h');", "put('run/pid', String(process.pid));", "if (!existsSync('run/quiet')) setInterval(() => {}, 1_000);"] },
];

test('an interrupt that ends a step the graph would have kept does not blame the graph for the step it killed',
  { timeout: RUN_BUDGET, skip: platform === 'win32' ? 'a signal sent to a process is a POSIX idea' : false }, async () => {
    const s = scratch(HOLDING, { 'run/quiet': '1' });
    try {
      const errors: string[] = [];
      const deps = (signal: AbortSignal): MainDeps => ({ root: s.root, collect: async () => ({ nodes: s.nodes, declaredIn: s.declaredIn }),
        signal, print: () => {}, error: (text) => { errors.push(text); }, cores: 8, free: 16 * GIB, commandFor: s.commandFor });
      assert.equal(await main(['--force', '--jobs=1'], deps(new AbortController().signal)), 0);
      assert.equal(readState(s.root).has('generate:hold'), true, 'the first run recorded the step green');
      rmSync(join(s.root, 'run'), { recursive: true });
      const stop = new AbortController();
      const pending = main(['--force', '--jobs=1'], deps(stop.signal));
      const up = await waitFor(() => existsSync(join(s.root, 'run', 'pid')), GRAPH_RUN);
      assert.ok(up.seen, up.seen ? '' : up.why);
      stop.abort();
      assert.equal(await pending, 130);
      assert.deepEqual(errors, [], 'an interrupted run says nothing about the graph');
    } finally {
      killHold(s.root, 'run/pid');
      s.done();
    }
  });

test('a step the scheduler started as the abort landed is never spawned, so it counts as never started and leaves the state alone',
  { timeout: RUN_BUDGET }, async () => {
    const s = scratch([
      { name: 'generate:c1', writes: ['out/c1.txt'], body: ["put('out/c1.txt', 'x');"] },
      { name: 'generate:c2', writes: ['out/c2.txt'], body: ["put('out/c2.txt', 'x');"] },
    ]);
    try {
      const stop = new AbortController();
      const run = await runGraph({ nodes: s.nodes, declaredIn: s.declaredIn, order: s.order, root: s.root, force: true,
        slots: SERIAL, signal: stop.signal, print: () => {},
        commandFor: (node) => { stop.abort(); return s.commandFor(node); } });
      assert.equal(run.interrupted, true);
      assert.deepEqual(run.results, []);
      assert.deepEqual([...run.notStarted].sort(), ['generate:c1', 'generate:c2']);
      assert.equal(existsSync(join(s.root, 'out', 'c1.txt')), false, 'the step was spawned');
      assert.equal(readState(s.root).size, 0);
    } finally {
      s.done();
    }
  });

test('main refuses a selection of no step, and a graph it cannot collect, with a sentence and before it prints a slots line',
  { timeout: RUN_BUDGET }, async () => {
    const s = scratch([{ name: 'generate:only', writes: ['out/only.txt'], body: ["put('out/only.txt', 'x');"] }]);
    try {
      const releaseOnly = s.nodes.map((node) => ({ ...node, releaseOnly: 'a release ships it' }));
      const rows: [string, MainDeps['collect'], RegExp][] = [
        ['a selection of no step', async () => ({ nodes: releaseOnly, declaredIn: s.declaredIn }), /run-build: the selection holds no step/],
        ['a graph that cannot be collected', async () => { throw new Error('nodes.ts: a declaration threw'); }, /a declaration threw/],
      ];
      let walked = 0;
      for (const [label, collect, sentence] of rows) {
        const printed: string[] = [];
        const errors: string[] = [];
        const code = await main(['--force'], { root: s.root, collect, signal: new AbortController().signal,
          print: (text) => { printed.push(text); }, error: (text) => { errors.push(text); }, cores: 8, free: 16 * GIB,
          commandFor: s.commandFor });
        assert.equal(code, 1, label);
        assert.deepEqual(printed, [], `${label} printed before it refused`);
        assert.match(errors.join(''), sentence, label);
        walked += 1;
      }
      assert.equal(walked, rows.length);
      assert.equal(rows.length, 2);
      assert.equal(existsSync(join(s.root, STATE_PATH)), false);
    } finally {
      s.done();
    }
  });
