import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILD_HANDOFF_PATHS, carriedBy, handoffProblems, handoffSteps, sampleOf, stepProblems, trackedPaths,
  uncarriedProblems, workflowTexts,
} from './handoff.ts';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { budgetFor } from '../lib/arena/deadline.ts';
import { COLLECTION, allNodes } from './nodes.ts';

const BUDGET_MS = budgetFor(COLLECTION);

const node = (name: string, over: Partial<{ writes: string[]; runsBeforeSuites: string }> = {}) =>
  ({ name, reads: [], writes: [], feeds: [], ...over });

const step = (lines: string[]) => lines.map((line) => `      ${line}`).join('\n');
const workflow = (...steps: string[]) =>
  `jobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n${steps.join('\n')}\n`;
const restore = (paths: readonly string[], key = 'arena-build-${{ runner.os }}-${{ github.sha }}') => step([
  '- name: the build Arena main already made for this commit',
  '  uses: actions/cache/restore@v6',
  '  with:',
  '    path: |',
  ...paths.map((one) => `      ${one}`),
  `    key: ${key}`,
]);
const install = step([
  '- uses: actions/cache@v6',
  '  with:',
  '    path: ~/.bun/install/cache',
  '    key: bun-cache-${{ runner.os }}-x',
]);
const record = step([
  '- uses: actions/upload-artifact@v7',
  '  with:',
  '    name: arena-angular-${{ needs.guard.outputs.version }}',
  '    path: |',
  '      frameworks/angular/dist/arena-angular.tgz',
  '      publish-record.json',
]);

const TRACKED = ['contracts/design/colors.css', 'frameworks/react/Button.tsx'];

test('a handoff step is a cache or artifact step whose key or name opens with arena-build-', () => {
  assert.deepEqual(handoffSteps('w.yml', workflow(restore(BUILD_HANDOFF_PATHS))), [{
    file: 'w.yml',
    line: 5,
    label: 'the build Arena main already made for this commit',
    uses: 'actions/cache/restore',
    paths: [...BUILD_HANDOFF_PATHS],
  }]);
});

test('the install cache and a release record are not the build, so they are not handoff steps', () => {
  assert.deepEqual(handoffSteps('w.yml', workflow(install, record)), []);
});

test('a quoted key is still a key', () => {
  const steps = handoffSteps('w.yml', workflow(restore(BUILD_HANDOFF_PATHS, "'arena-build-x'")));
  assert.equal(steps.length, 1);
});

test('the list carries every path exactly, and a matching one is silent', () => {
  assert.deepEqual(stepProblems(handoffSteps('w.yml', workflow(restore(BUILD_HANDOFF_PATHS)))), []);
});

test('a list missing one path fails and names the file, the line, the step and the path', () => {
  const short = BUILD_HANDOFF_PATHS.filter((one) => one !== 'dist/mcp');
  const problems = stepProblems(handoffSteps('.github/workflows/w.yml', workflow(install, restore(short))));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^\.github\/workflows\/w\.yml:9 \(the build Arena main already made for this commit\)/);
  assert.match(problems[0] ?? '', /missing dist\/mcp/);
});

test('the same paths in another order fail, because the order is part of the list', () => {
  const turned = [...BUILD_HANDOFF_PATHS].reverse();
  const problems = stepProblems(handoffSteps('w.yml', workflow(restore(turned))));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /the same paths in another order/);
});

test('a path listed twice fails and says so', () => {
  const twice = [...BUILD_HANDOFF_PATHS, 'dist/site'];
  const problems = stepProblems(handoffSteps('w.yml', workflow(restore(twice))));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /a path listed twice/);
});

test('a cache step naming its paths on one line fails, because nothing could hold that list', () => {
  const oneLine = step([
    '- uses: actions/cache/save@v6',
    '  with:',
    '    path: dist/site',
    '    key: arena-build-x',
  ]);
  const problems = stepProblems(handoffSteps('w.yml', workflow(oneLine)));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /on one line or not at all/);
});

test('a download names where it lands, so a one-line path there is not a list', () => {
  const download = step([
    '- uses: actions/download-artifact@v8',
    '  with:',
    '    name: arena-build-${{ github.run_id }}',
    '    path: .',
  ]);
  const steps = handoffSteps('w.yml', workflow(download));
  assert.equal(steps.length, 1);
  assert.deepEqual(stepProblems(steps), []);
});

test('no handoff step in any workflow is a hand-off that never happens, and fails', () => {
  assert.equal(handoffProblems([], [{ file: 'w.yml', text: workflow(install) }], TRACKED).length, 1);
  assert.equal(handoffProblems([], [], TRACKED).length, 1);
});

test('a spec is sampled as a path it would reach, so a glob is compared without a tree', () => {
  assert.equal(sampleOf('dist/site/**'), 'dist/site/x/x/x');
  assert.equal(sampleOf('frameworks/*/Api.generated.ts'), 'frameworks/x/Api.generated.ts');
  assert.equal(sampleOf('frameworks/react/dist/**'), 'frameworks/react/dist/x/x/x');
});

test('a directory carries everything under it and a glob carries what it matches', () => {
  assert.equal(carriedBy(['frameworks/angular/build'], 'frameworks/angular/build/demo/**'), true);
  assert.equal(carriedBy(['frameworks/**/*.generated.*'], 'frameworks/react/Api.generated.ts'), true);
  assert.equal(carriedBy(['frameworks/**/*.generated.*'], 'dist/site/**'), false,
    'the entry that carries every generated file under one tree carries nothing outside it');
});

test('an artifact no clone checks out and the list does not name is a gate over an absent tree', () => {
  const nodes = [node('build:site', { writes: ['dist/site/**'] })];
  const problems = uncarriedProblems(nodes, TRACKED, ['frameworks/**/*.generated.*']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /build:site writes dist\/site\/\*\*/);
  assert.match(problems[0] ?? '', /BUILD_HANDOFF_PATHS/);
});

test('the same artifact named by the list is carried, and the rule is silent', () => {
  const nodes = [node('build:site', { writes: ['dist/site/**'] })];
  assert.deepEqual(uncarriedProblems(nodes, TRACKED), []);
});

test('an output a clone already has needs no hand-off', () => {
  const nodes = [node('generate:tokens', { writes: ['contracts/design/colors.css'] })];
  assert.deepEqual(uncarriedProblems(nodes, TRACKED, ['dist/site']), []);
});

test('a step no build invocation runs is out, because the job that reads it runs it first', () => {
  const nodes = [node('build:angular-tests', {
    writes: ['frameworks/angular/build/test/**'],
    runsBeforeSuites: 'bun run test runs the emit immediately before the suites that read it',
  })];
  assert.deepEqual(uncarriedProblems(nodes, TRACKED, ['dist/site']), []);
});

test('an empty checkout is reported rather than compared against', () => {
  const nodes = [node('build:site', { writes: ['dist/site/**'] })];
  assert.equal(handoffProblems(nodes, [{ file: 'w.yml', text: workflow(restore(BUILD_HANDOFF_PATHS)) }], []).length, 1);
});

test('every handoff step in every workflow carries BUILD_HANDOFF_PATHS, and the list carries every artifact',
  { timeout: BUDGET_MS }, async () => {
    const { nodes } = await allNodes(repoRoot);
    const workflows = workflowTexts(repoRoot);
    assert.ok(workflows.some(({ file }) => file === '.github/workflows/pr.yml'),
      'the walk has to reach the workflow directory, or this case compares nothing');
    assert.deepEqual(handoffProblems(nodes, workflows, trackedPaths(repoRoot)), []);
  });

test('a publish restore with one path removed fails, naming that file and that step', () => {
  const file = '.github/workflows/npm-publish-angular-package.yml';
  const workflows = workflowTexts(repoRoot).map((one) => (one.file === file
    ? { file, text: one.text.replace(/\n\s+dist\/mcp\n/, '\n') }
    : one));
  const problems = workflows.flatMap(({ file: name, text }) => stepProblems(handoffSteps(name, text)));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^\.github\/workflows\/npm-publish-angular-package\.yml:\d+ \(the build Arena main already made for this commit\)/);
  assert.match(problems[0] ?? '', /missing dist\/mcp/);
});

const BLOCK = BUILD_HANDOFF_PATHS.map((one) => `      ${one}`);
const readAll = (text: string) => stepProblems(handoffSteps('w.yml', text));

test('a with: written as a flow mapping cannot be held to a block list, so it fails naming the step', () => {
  const inline = step(['- uses: actions/cache/save@v6', '  with: { path: dist/site, key: arena-build-x }']);
  const problems = readAll(workflow(inline));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^w\.yml:5 \(actions\/cache\/save\).*write with: as a block/);
});

test('children indented other than two columns are read, and a matching list is silent', () => {
  const deep = step(['- uses: actions/cache/restore@v6', '  with:', '      path: |',
    ...BUILD_HANDOFF_PATHS.map((one) => `        ${one}`), '      key: arena-build-x']);
  const steps = handoffSteps('w.yml', workflow(deep));
  assert.equal(steps.length, 1);
  assert.deepEqual(steps[0]?.paths, [...BUILD_HANDOFF_PATHS]);
  assert.deepEqual(stepProblems(steps), []);
});

test('children indented other than two columns are held to the list like any other', () => {
  const deep = step(['- uses: actions/cache/restore@v6', '  with:', '      path: dist/site', '      key: arena-build-x']);
  assert.equal(readAll(workflow(deep)).length, 1);
});

test('extra spaces after the dash move the content column, and the step is still read', () => {
  const wide = step(['-   uses: actions/cache/restore@v6', '    with:', '      path: dist/site', '      key: arena-build-x']);
  const steps = handoffSteps('w.yml', workflow(wide));
  assert.equal(steps.length, 1);
  assert.equal(steps[0]?.uses, 'actions/cache/restore');
  assert.equal(readAll(workflow(wide)).length, 1);
});

test('a name under env: does not stand in for the name under with:', () => {
  const env = step(['- uses: actions/upload-artifact@v7', '  env:', '    name: other', '  with:',
    '    name: arena-build-x', '    path: dist/site']);
  const steps = handoffSteps('w.yml', workflow(env));
  assert.equal(steps.length, 1);
  assert.equal(readAll(workflow(env)).length, 1);
});

test('a name under env: alone does not make a step a handoff step', () => {
  const env = step(['- uses: actions/upload-artifact@v7', '  env:', '    name: arena-build-x', '  with:',
    '    name: other', '    path: dist/site']);
  assert.deepEqual(handoffSteps('w.yml', workflow(env)), []);
});

test('a chomped block header and a block header with a comment are block lists', () => {
  for (const header of ['path: |-', 'path: |+', 'path: |   # the build']) {
    const chomped = step(['- uses: actions/cache/restore@v6', '  with:', `    ${header}`, ...BLOCK.map((one) => `  ${one}`),
      '    key: arena-build-x']);
    const steps = handoffSteps('w.yml', workflow(chomped));
    assert.deepEqual(steps[0]?.paths, [...BUILD_HANDOFF_PATHS], header);
    assert.deepEqual(stepProblems(steps), [], header);
  }
});

test('a one-line path says to write a block, and the message does not describe a block as one line', () => {
  const oneLine = step(['- uses: actions/upload-artifact@v7', '  with:', '    name: arena-build-x', '    path: dist/site']);
  assert.match(readAll(workflow(oneLine))[0] ?? '', /write them as a block list/);
});

test('an artifact step whose list differs gives the artifact reason, not the cache version reason', () => {
  const upload = step(['- uses: actions/upload-artifact@v7', '  with:', '    name: arena-build-x', '    path: |',
    '      dist/site']);
  const [problem] = readAll(workflow(upload));
  assert.match(problem ?? '', /handed only what the list carries/);
  assert.doesNotMatch(problem ?? '', /derives an entry/);
});

test('a cache step whose list differs gives the cache version reason', () => {
  const [problem] = readAll(workflow(restore(['dist/site'])));
  assert.match(problem ?? '', /derives an entry's version/);
});

test('a with: followed by a comment is a block, and the step is read', () => {
  const noted = step(['- uses: actions/cache/restore@v6', '  with: # the build', '    path: |',
    ...BLOCK.map((one) => `  ${one}`), '    key: arena-build-x']);
  const steps = handoffSteps('w.yml', workflow(noted));
  assert.deepEqual(steps[0]?.paths, [...BUILD_HANDOFF_PATHS]);
  assert.deepEqual(stepProblems(steps), []);
});

test('a comment line first under with: does not set the child indent', () => {
  const noted = step(['- uses: actions/cache/restore@v6', '  with:', '# the build', '    path: dist/site',
    '    key: arena-build-x']);
  assert.equal(readAll(workflow(noted)).length, 1);
});

test('a handoff step in a shape the parser cannot read fails rather than passing unseen', () => {
  const shapes: Record<string, string[]> = {
    foldedKey: ['- uses: actions/cache/save@v6', '  with:', '    path: dist/site', '    key: >-', '      arena-build-x'],
    anchor: ['- uses: actions/upload-artifact@v7', '  with: *build', '  # arena-build-x'],
  };
  for (const [name, lines] of Object.entries(shapes)) {
    const problems = readAll(workflow(step(lines)));
    assert.equal(problems.length, 1, name);
    assert.match(problems[0] ?? '', /^w\.yml:5 .*in a shape this gate cannot read/, name);
  }
});

test('a step name that mentions arena-build- is a label and not a handoff step', () => {
  const named = step(['- name: arena-build-label', '  uses: actions/cache/restore@v6', '  with:',
    '    path: ~/.bun/install/cache', '    key: bun-x']);
  assert.deepEqual(handoffSteps('w.yml', workflow(named)), []);
});

test('a quoted uses key is read like a plain one', () => {
  const quoted = step(['- "uses": actions/cache/restore@v6', '  with:', '    path: dist/site', '    key: arena-build-x']);
  const steps = handoffSteps('w.yml', workflow(quoted));
  assert.equal(steps.length, 1);
  assert.equal(readAll(workflow(quoted)).length, 1);
});

test('a with: line equal to an env: line is judged by where it stands, not by its text', () => {
  const twin = step(['- uses: actions/cache/restore@v6', '  env:', '    note: arena-build-x', '  with:',
    '    note: arena-build-x', '    path: dist/site']);
  const problems = readAll(workflow(twin));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /in a shape this gate cannot read/);
});

test('a quoted key under with: is read, and its list is held to the constant', () => {
  const quoted = step(['- uses: actions/cache/save@v6', '  with:', '    path: |', ...BLOCK.map((one) => `  ${one}`),
    '    "key": arena-build-x']);
  const steps = handoffSteps('w.yml', workflow(quoted));
  assert.equal(steps.length, 1);
  assert.deepEqual(stepProblems(steps), []);
});
