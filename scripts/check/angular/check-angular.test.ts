import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { PROJECTS, typecheck } from './check-angular.ts';

const BUILD_ONLY_OPTIONS = ['outDir', 'sourceMap', 'incremental', 'tsBuildInfoFile'];

test('the emit project covers the test directory and relaxes nothing', () => {
  const emit = readJson(join(repoRoot, 'frameworks/angular/tsconfig.test.json'));
  assert.equal(emit.extends, './tsconfig.check.json',
    'the emit project must inherit the layer project rather than restate its strictness');
  assert.ok(Array.isArray(emit.include) && emit.include.some((p: string) => p.startsWith('./test/')),
    `the emit project no longer covers ./test/: ${JSON.stringify(emit.include)}`);
  assert.equal(emit.angularCompilerOptions, undefined,
    'the emit project must carry no angularCompilerOptions of its own -- it relaxes nothing');
  const extra = Object.keys(emit.compilerOptions ?? {}).filter((k) => !BUILD_ONLY_OPTIONS.includes(k));
  assert.deepEqual(extra, [],
    `the emit project may carry build configuration only; these are something else: ${extra.join(', ')}`);
  assert.ok((emit.exclude ?? []).includes('./components/**/*.card.entry.ts'),
    'a page entry bootstraps an application at module scope, so emitting it into the test tree '
    + 'would put a running app beside the suites that share one document');
});

test('the demo project reaches the page entries and relaxes nothing either', () => {
  const demo = readJson(join(repoRoot, 'frameworks/angular/tsconfig.demo.json'));
  assert.equal(demo.extends, './tsconfig.check.json',
    'the demo project must inherit the layer project rather than restate its strictness');
  assert.equal(demo.angularCompilerOptions, undefined,
    'the demo project must carry no angularCompilerOptions of its own -- it relaxes nothing');
  const extra = Object.keys(demo.compilerOptions ?? {}).filter((k) => !BUILD_ONLY_OPTIONS.includes(k));
  assert.deepEqual(extra, [],
    `the demo project may carry build configuration only; these are something else: ${extra.join(', ')}`);
  assert.ok((demo.exclude ?? []).includes('./**/*.test.ts'),
    'the demo bundle must not carry the suites — they import node:test, which the layer has no types for');
});

test('check:angular typechecks both projects, because no barrel reaches a page entry', () => {
  assert.deepEqual(
    PROJECTS.map((p) => p.project),
    ['frameworks/angular/tsconfig.check.json', 'frameworks/angular/tsconfig.demo.json'],
  );
});

test('the layer project still names the barrel alone, so check:angular keeps its own subject', () => {
  const layer = readJson(join(repoRoot, 'frameworks/angular/tsconfig.check.json'));
  assert.deepEqual(layer.files, ['./index.ts'],
    'the shipped surface is the barrel; folding the tests into it would report a test error as a broken layer');
});
