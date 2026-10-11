import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aliasProblems, emptySpecProblems, graphProblems, namingProblems, peerReadProblems, poolProblems, probesOf,
  staleExceptions, unaccountedScripts, unreachedSpecNotes, vacuousProblems,
} from './graph-problems.ts';
import type { GraphNode } from './graph.ts';
import { COLLECTION, allNodes } from './nodes.ts';
import { universe } from './inputs.ts';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { budgetFor } from '../lib/arena/deadline.ts';

const node = (name: string, over: Partial<{ reads: string[]; writes: string[]; feeds: string[] }> = {}) =>
  ({ name, reads: [], writes: [], feeds: [], ...over });

const PATHS = ['contracts/design/colors.css', 'frameworks/react/components/A.tsx'];

test('a script in neither list is a decision nobody made', () => {
  assert.deepEqual(unaccountedScripts(['scripts/build/react/new-step.ts'], new Map(), new Set(), () => null), [
    'scripts/build/react/new-step.ts declares no node and is in neither list; a script that opts '
    + 'out of the graph has to say why, and one that has not opted in yet has to be counted',
  ]);
});

test('a declared script is accounted for by its declaration and needs no list entry', () => {
  const declaredIn = new Map([['build:new', 'scripts/build/react/new-step.ts']]);
  assert.deepEqual(unaccountedScripts(['scripts/build/react/new-step.ts'], declaredIn, new Set(), () => null), []);
});

test('an exception that has since subscribed is stale, and so is one whose script has gone', () => {
  const notYet = new Set(['scripts/check/core/check-dtcg.ts']);
  const none = () => null;
  const declaredIn = new Map([['check:dtcg', 'scripts/check/core/check-dtcg.ts']]);

  assert.deepEqual(staleExceptions(['scripts/check/core/check-dtcg.ts'], declaredIn, notYet, none), [
    'NOT_YET_SUBSCRIBED names scripts/check/core/check-dtcg.ts, which now declares a node; drop it',
  ]);
  assert.deepEqual(staleExceptions([], new Map(), notYet, none), [
    'NOT_YET_SUBSCRIBED names scripts/check/core/check-dtcg.ts, which is not there',
  ]);
  assert.deepEqual(staleExceptions(['scripts/check/core/check-dtcg.ts'], new Map(), notYet, none), [],
    'a script that has not subscribed and is named as not having subscribed is the state this list '
    + 'exists to record, and it is silent');
});

test('a never-subscribes entry that has since declared is stale too', () => {
  const declaredIn = new Map([['check:docs', 'scripts/check/arena/check-docs.ts']]);
  assert.deepEqual(staleExceptions([], declaredIn, new Set(), () => 'a reason'), [
    'NEVER_SUBSCRIBES covers scripts/check/arena/check-docs.ts, and it declares check:docs; the '
    + 'exception outlived what it was written for',
  ]);
});

test('a node whose name is no npm script is a node nobody can invoke', () => {
  const declaredIn = new Map([['build:typo', 'scripts/build/react/build-vendor.ts']]);
  assert.deepEqual(namingProblems([node('build:typo')], declaredIn, new Set(['build:vendor'])), [
    'scripts/build/react/build-vendor.ts declares build:typo, and package.json has no script by that name',
  ]);
});

test('a name an alias stands for counts as invocable, because the alias is what package.json holds', () => {
  const declaredIn = new Map([['generate:api-types', 'scripts/generate/arena/generate-api-types.ts']]);
  assert.deepEqual(namingProblems([node('generate:api-types')], declaredIn, new Set(['generate:api'])), []);
});

test('an alias standing for a node that is not there is caught', () => {
  assert.deepEqual(aliasProblems([node('generate:api-types')]).length > 0, true);
});

test('a node reading nothing that is there would come from the cache for ever', () => {
  const resolve = () => [];
  assert.deepEqual(emptySpecProblems([node('check:x', { reads: ['contracts/design'] })], PATHS, resolve), [
    'check:x reads nothing that is there, so its fingerprint is over an empty list and it would '
    + 'come from the cache for ever',
  ]);
});

test('a spec whose directory holds no file fails, and one whose directory is there is a note', () => {
  const resolve = (specs: string[]) => (specs.includes('contracts/design/colors.css') ? PATHS : []);
  const typo = node('check:x', { reads: ['contracts/design/colors.css', 'contracts/typo/*.json'] });
  assert.deepEqual(emptySpecProblems([typo], PATHS, resolve), [
    'check:x names contracts/typo/*.json, and the directory it sits in holds no file at all -- a '
    + 'spec written for a tree that is not there reaches nothing however the tree grows',
  ]);

  const ahead = node('check:y', { reads: ['contracts/design/colors.css', 'frameworks/react/components/**/*.jsx'] });
  assert.deepEqual(emptySpecProblems([ahead], PATHS, resolve), []);
  assert.deepEqual(unreachedSpecNotes([ahead], PATHS), [
    'check:y names frameworks/react/components/**/*.jsx, which matches no file today; its directory '
    + 'is there, so this reads as an extension the node compiles and the tree does not hold yet',
  ]);
});

test('a spec a node writes names what that node creates, so a tree without it is not a defect', () => {
  const resolve = (specs: string[]) => (specs.includes('contracts/design/colors.css') ? PATHS : []);
  const emit = node('build:x', {
    reads: ['contracts/design/colors.css'],
    writes: ['frameworks/angular/build/test/**'],
  });

  assert.deepEqual(emptySpecProblems([emit], PATHS, resolve), [],
    'the step has not run, and a gate judging the shape cannot answer differently depending on '
    + 'which steps happen to have run before it');
  assert.deepEqual(unreachedSpecNotes([emit], PATHS), [
    'build:x writes frameworks/angular/build/test/**, and nothing here matches it; what a step '
    + 'emits is on disk once that step has run, so this is either the tree before the run or a '
    + 'typo, and only a full build tells them apart',
  ]);
});

test('a run that compared nothing says so rather than passing', () => {
  assert.deepEqual(vacuousProblems([], []), ['no script was collected, so this gate compared nothing']);
  assert.deepEqual(vacuousProblems([], ['scripts/build/a.ts']), ['no script declares a node, so this gate compared nothing']);
  assert.deepEqual(vacuousProblems([node('a')], ['scripts/build/a.ts']), []);
});

const DECLARED = new Map([
  ['generate:a', 'scripts/generate/a.ts'], ['generate:b', 'scripts/generate/b.ts'], ['build:c', 'scripts/build/c.ts'],
  ['build:t', 'scripts/build/t.ts'], ['check:g', 'scripts/check/g.ts'],
]);

const step = (name: string, over: Partial<GraphNode> = {}): GraphNode => ({ name, reads: [], writes: [], feeds: [], ...over });

test('a pool and a cost belong to a heavy build step, and a shape no runner reads is refused with a sentence', () => {
  const rows: [GraphNode, RegExp | null][] = [
    [step('build:c', { pool: 'compiler', cost: 12 }), null],
    [step('generate:a'), null],
    [step('build:c', { pool: 'gpu' as never, cost: 12 }), /build:c declares pool "gpu", which is none of browser, compiler/],
    [step('build:c', { cost: 12 }), /build:c declares a cost and no pool/],
    [step('build:c', { pool: 'compiler' }), /build:c declares pool "compiler" and no cost in seconds above zero/],
    [step('build:c', { pool: 'compiler', cost: 0 }), /build:c declares pool "compiler" and no cost in seconds above zero/],
    [step('check:g', { pool: 'browser', cost: 4 }), /check:g declares a pool or a cost, and no build invocation runs it/],
    [step('build:t', { runsBeforeSuites: 'the suites run it before the suites that read it, in their own order', pool: 'compiler', cost: 18 }),
      /build:t declares a pool or a cost, and no build invocation runs it/],
  ];
  for (const [one, problem] of rows) {
    const found = poolProblems([one], DECLARED);
    if (problem === null) {
      assert.deepEqual(found, [], one.name);
    } else {
      assert.equal(found.length, 1, `${one.name}: ${found.join('; ')}`);
      assert.match(found[0] ?? '', problem);
    }
  }
  assert.equal(rows.length, 8);
});

const MEASURED_COMPILER = new Map([['build:angular-package', 16.5], ['build:angular-demo', 11.9], ['build:react-package', 11.5]]);

test('the build steps measured as compilers declare that pool and their cost, and no other node declares either',
  { timeout: budgetFor(COLLECTION) }, async () => {
    const { nodes, declaredIn } = await allNodes(repoRoot);
    assert.equal(MEASURED_COMPILER.size, 3);
    const declared = nodes.filter((one) => one.pool !== undefined || one.cost !== undefined)
      .map((one) => [one.name, one.pool, one.cost]);
    assert.deepEqual(declared.sort(), [...MEASURED_COMPILER].map(([name, cost]) => [name, 'compiler', cost]).sort(),
      'a build step that peaks near a gigabyte and declares no pool runs as light, and two of them at once can take the '
      + 'machine down; a light step declaring one costs a heavy slot it does not need');
    assert.deepEqual(poolProblems(nodes, declaredIn), []);
  });

test('a probe stands for every file a write spec could create, so a rule over it holds on a tree where nothing ran', () => {
  assert.deepEqual(probesOf('out/a/**').slice(0, 2), ['out/a/probe/probe', 'out/a/probe/probe/probe.ts']);
  assert.equal(probesOf('intro/*.generated.js')[0], 'intro/probe.generated.js');
  assert.equal(probesOf('!dist/**/*.map')[0], 'dist/probe/probe.map');
  assert.ok(probesOf('out/x.json').includes('out/x.json/probe.d.ts'));
});

test('a build step reading what a step that can run beside it writes is refused, and one downstream of it is not', () => {
  const graph = [
    step('generate:a', { writes: ['out/a/**'], feeds: ['build:c'] }),
    step('generate:b', { reads: ['out/**'] }),
    step('build:c', { reads: ['out/a/**'] }),
  ];
  const found = peerReadProblems(graph, DECLARED, []);
  assert.equal(found.pairs, 4, 'a and b, b and c, each way round, are the pairs that can run side by side');
  assert.equal(found.problems.length, 1, found.problems.join('; '));
  assert.match(found.problems[0] ?? '', /^generate:b reads out\/a\/probe, which generate:a writes, and neither waits for the other/);
  const excluded = graph.map((one) => (one.name === 'generate:b' ? { ...one, reads: ['out/**', '!out/a/**'] } : one));
  assert.deepEqual(peerReadProblems(excluded, DECLARED, []).problems, []);
  const gate = [...graph, step('check:g', { reads: ['out/**'] })];
  assert.equal(peerReadProblems(gate, DECLARED, []).pairs, 4, 'a gate is no build step, so run-build never runs it beside one');
});

test('a reader naming one file, or one level, under a writer\'s glob crosses it on a tree where nothing ran and on one where it did', () => {
  const rows: { writes: string[]; reads: string[]; crosses: boolean }[] = [
    { writes: ['out/**'], reads: ['out/x.json'], crosses: true },
    { writes: ['out/**'], reads: ['out/*.json'], crosses: true },
    { writes: ['out/**'], reads: ['out/**'], crosses: true },
    { writes: ['out/**/*.js'], reads: ['out/a/b.js'], crosses: true },
    { writes: ['out/**/*.js'], reads: ['out/*.js'], crosses: true },
    { writes: ['out/x.json'], reads: ['out/**'], crosses: true },
    { writes: ['out/**/z.js'], reads: ['out/*.js'], crosses: true },
    { writes: ['out/**'], reads: ['other/x.json'], crosses: false },
    { writes: ['out/**/*.js'], reads: ['other/x.json'], crosses: false },
    { writes: ['out/**'], reads: ['out/**', '!out/**'], crosses: false },
    { writes: ['out/**', '!out/keep/**'], reads: ['out/keep/x.json'], crosses: false },
  ];
  let walked = 0;
  for (const { writes, reads, crosses } of rows) {
    const label = `writes ${writes.join(' ')} reads ${reads.join(' ')}`;
    const graph = [step('generate:a', { writes }), step('build:c', { reads })];
    for (const paths of [[], ['out/x.json', 'out/a/b.js']]) {
      const found = peerReadProblems(graph, DECLARED, paths);
      assert.equal(found.pairs, 2, label);
      assert.equal(found.problems.length, crosses ? 1 : 0, `${label} on ${paths.length === 0 ? 'a clean tree' : 'a built tree'}: ${found.problems.join('; ')}`);
    }
    walked += 1;
  }
  assert.equal(walked, rows.length);
  assert.equal(rows.length, 11);
});

test('no build step reads what a step that can run beside it writes, on a built tree and on one where nothing ran',
  { timeout: budgetFor(COLLECTION) }, async () => {
    const { nodes, declaredIn } = await allNodes(repoRoot);
    const trees: [string, string[]][] = [['nothing built', []], ['this tree', universe(repoRoot)]];
    for (const [label, paths] of trees) {
      const { problems, pairs } = peerReadProblems(nodes, declaredIn, paths);
      assert.ok(pairs > 0, `${label}: no two build steps can run side by side, so this case would hold over nothing`);
      assert.deepEqual(problems, [], label);
    }
    assert.equal(trees.length, 2);
  });

test('check:graph runs both rules over the graph it collects, so a declaration that breaks either is reported',
  { timeout: budgetFor(COLLECTION) }, async () => {
    const collected = await allNodes(repoRoot);
    const gate = collected.nodes.find((one) => one.name.startsWith('check:'));
    assert.ok(gate, 'no gate declares a node, so this case would hold over nothing');
    const nodes = collected.nodes.map((one) => {
      if (one.name === 'build:angular-package') {
        return { ...one, reads: one.reads.filter((spec) => spec !== '!frameworks/angular/build/**') };
      }
      return one.name === gate.name ? { ...one, pool: 'compiler' as const, cost: 1 } : one;
    });
    const { problems } = await graphProblems(repoRoot, async () => ({ nodes, declaredIn: collected.declaredIn }));
    assert.ok(problems.some((one) => /^build:angular-package reads frameworks\/angular\/build\/.*neither waits for the other/.test(one)),
      problems.join('\n'));
    assert.ok(problems.some((one) => one.startsWith(`${gate.name} declares a pool or a cost, and no build invocation runs it`)),
      problems.join('\n'));
  });
