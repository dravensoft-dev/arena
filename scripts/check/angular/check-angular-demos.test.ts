import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readIfExists } from '../../utils/read-file.ts';
import { BUNDLE_DIR, PAGE_SUFFIX, ENTRY_SUFFIX, pageProblems } from './check-angular-demos.ts';
import { readLayer } from '../../lib/arena/layers.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const TREE = { forms: ['arena-button'] };
const DIR = 'frameworks/angular/components/forms/arena-button';

const PAGE =
  '<!doctype html><html><head><meta charset="utf-8"><title>ArenaButton</title></head>'
  + '<body><script src="../../../../../intro/theme.js"></script>'
  + `<script type="module" src="../../../${BUNDLE_DIR}/ArenaButton.demo.entry.generated.js"></script></body></html>`;

const ENTRY =
  "import '@angular/compiler';\n"
  + "import { bootstrapApplication } from '@angular/platform-browser';\n"
  + 'bootstrapApplication(Demo, { providers: [provideZonelessChangeDetection()] });\n';

function reader(files: Record<string, string>) {
  return (rel: string) => files[rel] ?? null;
}

const GOOD = {
  [`${DIR}/ArenaButton${PAGE_SUFFIX}`]: PAGE,
  [`${DIR}/ArenaButton${ENTRY_SUFFIX}`]: ENTRY,
};

test('a page with a bundled entry and a zoneless bootstrap passes', () => {
  const { problems, pages } = pageProblems(TREE, reader(GOOD));
  assert.deepEqual(problems, []);
  assert.equal(pages, 1);
});

test('the inventory is the component tree, so a component with no page fails with no list to consult', () => {
  const { problems } = pageProblems(TREE, reader({}));
  assert.ok(problems.some((p) => p.includes(`ArenaButton${PAGE_SUFFIX}: missing — run bun run generate:playgrounds`)));
  assert.ok(problems.some((p) => p.includes(`ArenaButton${ENTRY_SUFFIX}: missing`)));
});

test('an empty tree fails rather than passing vacuously', () => {
  const { problems } = pageProblems({}, reader({}));
  assert.ok(problems.some((p) => p.includes('found 0 Angular demo pages')));
});

test('the module script is what is read, not the first script on the page', () => {
  const files = { ...GOOD };
  files[`${DIR}/ArenaButton${PAGE_SUFFIX}`] = PAGE.replace(/<script type="module"[^>]*><\/script>/, '');
  const { problems } = pageProblems(TREE, reader(files));
  assert.ok(problems.some((p) => p.includes('loads no module script')),
    'the chrome scripts above it must not be mistaken for the application');
});

test("a page pointing at another component's bundle fails", () => {
  const files = { ...GOOD };
  files[`${DIR}/ArenaButton${PAGE_SUFFIX}`] = PAGE.replace('ArenaButton.demo.entry', 'ArenaTooltip.demo.entry');
  const { problems } = pageProblems(TREE, reader(files));
  assert.ok(problems.some((p) => p.includes("is not this component's bundled entry")));
});

test('an Angular page declaring @dsCard fails, because its script is build output', () => {
  const files = { ...GOOD };
  files[`${DIR}/ArenaButton${PAGE_SUFFIX}`] =
    '<!-- @dsCard group="Angular" viewport="700x400" name="ArenaButton" subtitle="x" -->\n' + PAGE;
  const { problems } = pageProblems(TREE, reader(files));
  assert.ok(problems.some((p) => p.includes('declares @dsCard')));
});

test('an entry that bootstraps with a zone fails, because the layer ships no zone.js', () => {
  const files = { ...GOOD };
  files[`${DIR}/ArenaButton${ENTRY_SUFFIX}`] = "import '@angular/compiler';\nbootstrapApplication(Demo);\n";
  const { problems } = pageProblems(TREE, reader(files));
  assert.ok(problems.some((p) => p.includes('does not provide zoneless change detection')));
});

test('an entry without @angular/compiler fails, because the library ships partially compiled', () => {
  const files = { ...GOOD };
  files[`${DIR}/ArenaButton${ENTRY_SUFFIX}`] = ENTRY.replace("import '@angular/compiler';\n", '');
  const { problems } = pageProblems(TREE, reader(files));
  assert.ok(problems.some((p) => p.includes("does not import '@angular/compiler'")));
});

test('every component in the shipped tree has a page, and the count is the tree rather than a list', () => {
  const read = (rel: string) => readIfExists(join(repoRoot, rel));
  const tree = readLayer('angular');
  const { problems, pages } = pageProblems(tree, read);
  assert.deepEqual(problems, []);
  assert.equal(pages, Object.values(tree).flat().length);
});
