import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PR_WORKFLOW, cachePathLists, carriedBy, handoffProblems, oneListProblems, sampleOf, trackedPaths,
} from './handoff.ts';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { budgetFor } from '../lib/arena/deadline.ts';
import { COLLECTION, allNodes } from './nodes.ts';

const BUDGET_MS = budgetFor(COLLECTION);

const node = (name: string, over: Partial<{ writes: string[]; runsBeforeSuites: string }> = {}) =>
  ({ name, reads: [], writes: [], feeds: [], ...over });

const workflow = (...lists: string[][]) => lists
  .map((list) => `      - uses: actions/cache@v6\n        with:\n          path: |\n${
    list.map((one) => `            ${one}`).join('\n')}\n          key: whatever\n`)
  .join('\n');

const TRACKED = ['contracts/design/colors.css', 'frameworks/react/Button.tsx'];

test('a cache list is read as the lines indented past the key that opens it', () => {
  const text = workflow(['frameworks/**/*.generated.*', 'dist/site'], ['dist/site']);
  assert.deepEqual(cachePathLists(text), [['frameworks/**/*.generated.*', 'dist/site'], ['dist/site']]);
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

test('the lists have to be one list, because actions/cache keys on the paths too', () => {
  assert.deepEqual(oneListProblems([['dist/site'], ['dist/site']]), []);
  assert.equal(oneListProblems([['dist/site'], ['dist/site', 'frameworks/react/dist']]).length, 1);
  assert.equal(oneListProblems([]).length, 1);
});

test('an artifact no clone checks out and no cache list names is a gate over an absent tree', () => {
  const nodes = [node('build:site', { writes: ['dist/site/**'] })];
  const problems = handoffProblems(nodes, workflow(['frameworks/**/*.generated.*']), TRACKED);

  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /build:site writes dist\/site\/\*\*/);
  assert.match(problems[0] ?? '', new RegExp(PR_WORKFLOW.replace(/[./]/g, '\\$&')));
});

test('the same artifact named by the cache list is carried, and the gate is silent', () => {
  const nodes = [node('build:site', { writes: ['dist/site/**'] })];
  assert.deepEqual(handoffProblems(nodes, workflow(['dist/site']), TRACKED), []);
});

test('an output a clone already has needs no hand-off', () => {
  const nodes = [node('generate:tokens', { writes: ['contracts/design/colors.css'] })];
  assert.deepEqual(handoffProblems(nodes, workflow(['dist/site']), TRACKED), []);
});

test('a step no build invocation runs is out, since the job that reads it runs it first', () => {
  const nodes = [node('build:angular-tests', {
    writes: ['frameworks/angular/build/test/**'],
    runsBeforeSuites: 'bun run test runs the emit immediately before the suites that read it',
  })];
  assert.deepEqual(handoffProblems(nodes, workflow(['dist/site']), TRACKED), []);
});

test('an empty checkout is reported rather than compared against', () => {
  const nodes = [node('build:site', { writes: ['dist/site/**'] })];
  assert.equal(handoffProblems(nodes, workflow(['dist/site']), []).length, 1);
});

test('every artifact this repository builds is carried by the workflow that gates it',
  { timeout: BUDGET_MS }, async () => {
    const { nodes } = await allNodes(repoRoot);
    const text = readFileSync(join(repoRoot, PR_WORKFLOW), 'utf8');
    assert.deepEqual(handoffProblems(nodes, text, trackedPaths(repoRoot)), []);
  });
