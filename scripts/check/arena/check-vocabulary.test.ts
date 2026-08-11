/* Each claim shape is driven over a temporary tree, because the real one is green by the time
 * this file exists and a suite that only asserts the green case holds nothing. Every map is
 * asserted by name and in both directions: an entry that stops being needed fails as a stale
 * allowance, which is the property that keeps an exception list from outliving its exception. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  NAMED_BUT_NOT_HERE, README_MEANS, OUT_OF_SCOPE, SKIPPED_UNDER_FRAMEWORKS, KNOWN_EXTENSIONS,
  skips, outOfScope, documents, treeFiles, unfenced, fenced, searchRoots, suffixOf, holds,
  conventionProblems, filenameProblems, commandProblems, readmeProblems, snippetProblems,
  zeroScanProblems, vocabularyProblems, MODELS_A_FAILURE, fixtureProblems,
} from './check-vocabulary.ts';

function tree(files: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), 'arena-vocabulary-'));
  for (const [rel, text] of Object.entries(files)) {
    const path = join(base, rel);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, text);
  }
  return base;
}

const NONE = new Map<string, string>();

test('every allowance names its file and says whose file it is', () => {
  for (const [name, why] of NAMED_BUT_NOT_HERE) {
    assert.ok(name.includes('.'), `${name} is a file name`);
    assert.ok(why.length > 40, `${name} says why the tree does not hold it`);
  }
  for (const [rel, why] of README_MEANS) {
    assert.ok(rel.endsWith('.md'), `${rel} is a document`);
    assert.ok(why.length > 40, `${rel} says which README it means`);
  }
  assert.deepEqual([...OUT_OF_SCOPE.keys()], ['docs/']);
  assert.equal(outOfScope('docs/superpowers/plans/x.md'), true);
  assert.equal(outOfScope('scripts/AGENTS.md'), false);
});

test('the walk skips a build directory under frameworks and keeps the one under scripts', () => {
  assert.deepEqual([...SKIPPED_UNDER_FRAMEWORKS], ['dist', 'build', 'vendor']);
  assert.equal(skips('build', 'frameworks/angular'), true);
  assert.equal(skips('build', 'scripts'), false,
    'scripts/build is a phase directory, and skipping it hides every document in it');
});

test('a convention nothing in the tree answers to fails, and one it holds passes', () => {
  const base = tree({
    'scripts/AGENTS.md': 'Every `X.test.mjs` beside a script covers that script.',
    'scripts/walk.test.ts': 'x',
  });
  const files = treeFiles(base);
  const problems = conventionProblems(base, files, files);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /states the convention X\.test\.mjs/);

  const good = tree({
    'scripts/AGENTS.md': 'Every `X.test.ts` beside a script covers that script.',
    'scripts/walk.test.ts': 'x',
  });
  assert.deepEqual(conventionProblems(good, treeFiles(good), treeFiles(good)), []);
});

test('a compound suffix is a convention and a bare language extension is not', () => {
  const base = tree({
    'a/AGENTS.md': 'A suite is `.test.mjs` and a script is `.mjs`.',
    'a/one.mjs': 'x',
  });
  const files = treeFiles(base);
  const problems = conventionProblems(base, files, files);
  assert.equal(problems.length, 1, 'the .mjs on its own names a language the tree does have');
  assert.match(problems[0] ?? '', /\.test\.mjs/);
});

test('a bare name no file carries fails, and one carried inside a longer name does not', () => {
  const base = tree({
    'a/AGENTS.md': 'It compares what `build-tokens.mjs` emits against `Arena - Overview.html`, '
      + 'and `Overview.html` names the same page.',
    'a/generate-tokens.ts': 'x',
    'intro/Arena - Overview.html': 'x',
  });
  const files = treeFiles(base);
  const problems = filenameProblems(base, files, files, NONE);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /cites build-tokens\.mjs by its bare name/);
});

test('an allowance whose name no document writes any more fails as a stale one', () => {
  const base = tree({ 'a/AGENTS.md': 'nothing is cited here' });
  const files = treeFiles(base);
  const excused = new Map([['arena.config.json', 'the file a consuming project writes rather than this one']]);
  const problems = filenameProblems(base, files, files, excused);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /NAMED_BUT_NOT_HERE excuses arena\.config\.json/);
});

test('a command package.json does not declare answers Script not found to whoever follows it', () => {
  const base = tree({
    'package.json': JSON.stringify({ scripts: { build: 'x' } }),
    'a/AGENTS.md': 'Run `bun run build`, and then `bun run generate:fonts`.',
  });
  const problems = commandProblems(base, treeFiles(base));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /bun run generate:fonts/);
});

test('a README named on the contributor branch fails, and a document on the record does not', () => {
  const base = tree({ 'a/AGENTS.md': 'a fact goes to the layer README' });
  const files = treeFiles(base);
  assert.equal(readmeProblems(base, files, NONE).length, 1);
  assert.match(readmeProblems(base, files, NONE)[0] ?? '', /has one filename, AGENTS\.md/);

  const record = new Map([['a/AGENTS.md', 'the page the assembly hands npm, which is what this row is about']]);
  assert.deepEqual(readmeProblems(base, files, record), []);
});

test('a README_MEANS entry whose document stopped saying README fails as a stale allowance', () => {
  const base = tree({ 'a/AGENTS.md': 'nothing here' });
  const record = new Map([['a/AGENTS.md', 'the page the assembly hands npm, which is what this row is about']]);
  const problems = readmeProblems(base, treeFiles(base), record);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /no longer says README/);
});

test('a search handed to a reader that finds nothing is a broken query rather than an answer', () => {
  const base = tree({
    'scripts/AGENTS.md': '```bash\nfind scripts/lib -name \'*.mjs\'\n```',
    'scripts/lib/one.ts': 'x',
  });
  const files = treeFiles(base);
  const problems = snippetProblems(base, files, files);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /hands a reader a search for \*\.mjs under scripts\/lib/);
});

test('a search whose root is written relative to the document resolves against it', () => {
  const base = tree({
    'frameworks/tailwind/AGENTS.md': '```bash\nfind components -name \'*.manifest.json\'\n```',
    'frameworks/tailwind/components/a/A.manifest.json': '{}',
  });
  const files = treeFiles(base);
  assert.deepEqual(searchRoots('components ', 'frameworks/tailwind/AGENTS.md'),
    ['frameworks/tailwind/components']);
  assert.deepEqual(snippetProblems(base, files, files), []);
});

test('a fence and the prose around it are read by different rules', () => {
  const text = 'prose one\n```bash\ninside\n```\nprose two';
  assert.equal(unfenced(text).includes('inside'), false);
  assert.equal(fenced(text).trim(), 'inside');
});

test('a suffix is everything from the first dot, and it is looked for by basename', () => {
  assert.equal(suffixOf('X.test.ts'), '.test.ts');
  assert.equal(suffixOf('.mjs'), '.mjs');
  assert.equal(holds('.test.ts', 'scripts', ['scripts/a/b.test.ts']), true);
  assert.equal(holds('.test.ts', 'frameworks', ['scripts/a/b.test.ts']), false);
  assert.ok(KNOWN_EXTENSIONS.includes('.ts') && KNOWN_EXTENSIONS.includes('.mjs'));
});

test('an empty walk and an empty document list are failures rather than a clean pass', () => {
  assert.match(zeroScanProblems([], ['a.md'])[0] ?? '', /walked 0 files/);
  assert.match(zeroScanProblems(['a.md'], [])[0] ?? '', /read 0 documents/);
  assert.deepEqual(zeroScanProblems(['a.md'], ['a.md']), []);
});

test('the repository names no convention, command, README or search the tree cannot answer', () => {
  const { problems, scanned } = vocabularyProblems();
  assert.deepEqual(problems, []);
  assert.ok(scanned > 100, 'the walk reaches the whole documentation tree');
  assert.ok(documents().length === scanned);
});

test('a command is held in a source string too, since a gate message is read at the worst moment', () => {
  const base = tree({
    'package.json': JSON.stringify({ scripts: { build: 'x' } }),
    'scripts/check/one.ts': 'const message = `stale — run bun run generate:tokens`;',
    'scripts/check/two.ts': 'const message = `run bun run build: the page is emitted`;',
  });
  const problems = commandProblems(base, treeFiles(base));
  assert.equal(problems.length, 1, 'a trailing colon is prose punctuation and not part of the name');
  assert.match(problems[0] ?? '', /one\.ts: names bun run generate:tokens/);
});

test('the one suite that models a failure is excused by name, and a stale excuse fails', () => {
  assert.deepEqual([...MODELS_A_FAILURE.keys()], ['scripts/check/arena/check-vocabulary.test.ts']);
  for (const why of MODELS_A_FAILURE.values()) assert.ok(why.length > 60, 'it says why it is one');
  assert.deepEqual(fixtureProblems(process.cwd(), ['scripts/check/arena/check-vocabulary.test.ts']), []);
  const stale = fixtureProblems(process.cwd(), []);
  assert.equal(stale.length, 1);
  assert.match(stale[0] ?? '', /outlived the fixture it was written for/);
});
