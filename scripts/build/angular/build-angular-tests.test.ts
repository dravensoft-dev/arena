import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { platform } from '../../lib/arena/platform.ts';
import { budgetFor } from '../../lib/arena/deadline.ts';
import { TERM_GRACE } from '../../lib/arena/child-output.ts';
import { PROBE_ENDED, PROBE_SPAWNED, assertCompilerEnded, probeInterrupt } from '../../lib/arena/forwarding-probe.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { collectInputs, missingEmitProblems, readStamp, recordInputs, stalenessReason } from './build-angular-tests.ts';

const roots: string[] = [];
function tree(files: Record<string, string>) {
  const repo = mkdtempSync(join(tmpdir(), 'arena-emit-'));
  roots.push(repo);
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(repo, rel)), { recursive: true });
    writeFileSync(join(repo, rel), text);
  }
  return repo;
}
after(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });

const FILES = { 'layer/a.ts': 'export const a = 1;', 'layer/b.json': '{}', 'layer/build/skipped.ts': 'x', 'layer/dist/skipped.json': '{}', 'package.json': '{}' };
const gather = (repo: string) => collectInputs(repo, join(repo, 'layer'), [join(repo, 'layer', 'build'), join(repo, 'layer', 'dist')], [join(repo, 'package.json')]);
const stampFor = (repo: string) => ({ inputs: recordInputs(repo, gather(repo)) });
const later = (path: string) => utimesSync(path, new Date(Date.now() + 60_000), new Date(Date.now() + 60_000));

test('collectInputs walks exactly the .ts and .json under the layer, minus the emit and the package, plus the externals', () => {
  const paths = gather(tree(FILES));
  assert.deepEqual([...paths].sort(), ['layer/a.ts', 'layer/b.json', 'package.json']);
  assert.equal(Object.keys(recordInputs(tree(FILES), paths)).length, paths.length);
});

test('collectInputs with its defaults leaves out the layer\'s build and dist trees', () => {
  const repo = tree(FILES);
  const paths = collectInputs(repo, join(repo, 'layer'), undefined, []);
  assert.deepEqual([...paths].sort(), ['layer/a.ts', 'layer/b.json']);
});

test('an untouched tree is fresh', () => {
  const repo = tree(FILES);
  assert.equal(stalenessReason(repo, gather(repo), stampFor(repo)), null);
});

test('an input rewritten with the same bytes and a newer mtime is fresh', () => {
  const repo = tree(FILES);
  const stamped = stampFor(repo);
  writeFileSync(join(repo, 'layer/b.json'), '{}');
  later(join(repo, 'layer/b.json'));
  assert.equal(stalenessReason(repo, gather(repo), stamped), null);
});

test('an input rewritten with different bytes is stale and named', () => {
  const repo = tree(FILES);
  const stamped = stampFor(repo);
  writeFileSync(join(repo, 'layer/a.ts'), 'export const a = 2;');
  later(join(repo, 'layer/a.ts'));
  const reason = stalenessReason(repo, gather(repo), stamped);
  assert.match(reason ?? '', /layer\/a\.ts holds other content/);
  assert.doesNotMatch(reason ?? '', /b\.json/);
});

test('an input whose size and mtime match the record is taken as unchanged without being read', () => {
  const repo = tree(FILES);
  const stamped = stampFor(repo);
  stamped.inputs['layer/a.ts'] = { ...stamped.inputs['layer/a.ts']!, hash: 'not the hash of the file' };
  assert.equal(stalenessReason(repo, gather(repo), stamped), null, 'a read would have found the hash different');
});

test('a source added since the last emit rebuilds, however old it is', () => {
  const repo = tree(FILES);
  const stamped = stampFor(repo);
  writeFileSync(join(repo, 'layer/new.ts'), 'export {};');
  assert.match(stalenessReason(repo, gather(repo), stamped) ?? '', /layer\/new\.ts is not among the inputs/);
});

test('a source deleted since the last emit rebuilds, which no timestamp can see', () => {
  const repo = tree(FILES);
  const stamped = stampFor(repo);
  rmSync(join(repo, 'layer/a.ts'));
  assert.match(stalenessReason(repo, gather(repo), stamped) ?? '', /layer\/a\.ts is among the inputs the last emit compiled and is not on disk/);
});

test('no stamp rebuilds, and no input found rebuilds rather than skipping on a walk that saw nothing', () => {
  const repo = tree(FILES);
  assert.match(stalenessReason(repo, gather(repo), null) ?? '', /no emit stamp/);
  assert.match(stalenessReason(repo, [], { inputs: {} }) ?? '', /no input is found/);
});

test('a stamp in the old shape, paths only, compiles with a sentence', () => {
  const repo = tree({ ...FILES, 'stamp': JSON.stringify({ at: 'x', paths: ['layer/a.ts'] }) });
  const read = readStamp(join(repo, 'stamp'));
  assert.ok(read && 'problem' in read);
  assert.match(stalenessReason(repo, gather(repo), read) ?? '', /holds no content hashes/);
});

test('a stamp that is not JSON, or whose rows are not fingerprints, compiles with a sentence', () => {
  const repo = tree({ ...FILES, 'junk': '{not json', 'rows': JSON.stringify({ inputs: { 'layer/a.ts': 3 } }) });
  for (const name of ['junk', 'rows']) {
    const read = readStamp(join(repo, name));
    assert.ok(read && 'problem' in read, name);
    assert.ok(stalenessReason(repo, gather(repo), read), name);
  }
  assert.equal(readStamp(join(repo, 'absent')), null);
});

test('a stamp written from recorded inputs reads back whole', () => {
  const repo = tree(FILES);
  const inputs = recordInputs(repo, gather(repo));
  writeFileSync(join(repo, 'stamp'), JSON.stringify({ at: 'x', inputs }));
  assert.deepEqual(readStamp(join(repo, 'stamp')), { inputs });
});

test('missingEmitProblems reports nothing when every source test has a matching emit', () => {
  const problems = missingEmitProblems(
    ['DataVisuals.test.ts', 'components/charts/arena-bar-chart/ArenaBarChart.geometry.test.ts'],
    ['DataVisuals.test.js', 'components/charts/arena-bar-chart/ArenaBarChart.geometry.test.js'],
  );
  assert.deepEqual(problems, []);
});

test('missingEmitProblems names a source test with no matching emit', () => {
  const problems = missingEmitProblems(
    ['DataVisuals.test.ts', 'components/charts/arena-bar-chart/ArenaBarChart.geometry.test.ts'],
    ['components/charts/arena-bar-chart/ArenaBarChart.geometry.test.js'],
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /DataVisuals\.test\.ts/);
  assert.match(problems[0] ?? '', /never runs/);
});

test('missingEmitProblems reports one problem per missing suite, not one for the whole run', () => {
  const problems = missingEmitProblems(
    ['A.test.ts', 'B.test.ts', 'C.test.ts'],
    ['C.test.js'],
  );
  assert.equal(problems.length, 2);
  assert.ok(problems.some((p) => p.includes('A.test.ts')));
  assert.ok(problems.some((p) => p.includes('B.test.ts')));
});

test('missingEmitProblems is empty for two empty lists -- no source tests is not the failure this guards', () => {
  assert.deepEqual(missingEmitProblems([], []), []);
});

test('an extra emitted file with no source is not this function\'s problem -- pruneOrphans owns that direction', () => {
  const problems = missingEmitProblems(
    ['A.test.ts'],
    ['A.test.js', 'Orphan.test.js'],
  );
  assert.deepEqual(problems, []);
});

test('an interrupt of the test-surface step ends the ngc it spawned', {
  timeout: budgetFor(PROBE_SPAWNED, PROBE_ENDED, TERM_GRACE),
  skip: platform === 'win32' ? 'a signal sent to a process is a POSIX idea' : false,
}, async () => {
  const probed = await probeInterrupt({
    module: join(import.meta.dirname, 'build-angular-tests.ts'),
    body: 'await step.compileTests(stub, "unused.json", root);',
  });
  assertCompilerEnded(probed, false);
});

const BUILD_ONLY_OPTIONS = ['outDir', 'sourceMap', 'incremental', 'tsBuildInfoFile'];

test('the one Angular program reaches the suites and every page entry, and relaxes nothing', () => {
  const emit = readJson(join(repoRoot, 'frameworks/angular/tsconfig.test.json'));
  assert.equal(emit.extends, './tsconfig.check.json',
    'the emit project must inherit the layer project rather than restate its strictness');
  for (const dir of ['./test/', './components/', './playground/', './kitchen-sink/', './metadata/', './forms/']) {
    assert.ok(Array.isArray(emit.include) && emit.include.some((p: string) => p.startsWith(dir)),
      `the emit project does not cover ${dir}, and it is the only Angular program: ${JSON.stringify(emit.include)}`);
  }
  assert.ok(Array.isArray(emit.exclude) && emit.exclude.includes('./components/**/*.card.entry.ts'),
    'a card entry is a page the static specimens load, and the one program must not compile it');
  assert.equal(emit.angularCompilerOptions, undefined,
    'the emit project must carry no angularCompilerOptions of its own -- it relaxes nothing');
  const extra = Object.keys(emit.compilerOptions ?? {}).filter((k) => !BUILD_ONLY_OPTIONS.includes(k));
  assert.deepEqual(extra, [],
    `the emit project may carry build configuration only; these are something else: ${extra.join(', ')}`);
});

test('the layer project names the shipped entry points, which the one program reaches', () => {
  const layer = readJson(join(repoRoot, 'frameworks/angular/tsconfig.check.json'));
  assert.deepEqual(layer.files, ['./index.ts', './metadata/index.ts', './forms/index.ts']);
  assert.ok(layer.angularCompilerOptions?.strictTemplates === true,
    'the emit is the layer\'s type verdict, and without strictTemplates a template error compiles');
});
