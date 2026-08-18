/* The gate reads the real tree, so these drive its pure functions with the shapes a real mistake
 * takes: a level no chain of links reaches, a level reached through a sibling rather than a
 * parent, a README.md back on the branch, and a SURVIVORS entry whose file has gone. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ROUTER, SURVIVORS, SKIPPED_ANYWHERE, SKIPPED_UNDER_FRAMEWORKS, EMITTED, EMITTED_UNDER_FRAMEWORKS,
  skips, emitted, markdownFiles, routers, resolveLink, linkedRouters, reachedFrom, reachProblems,
  survivorProblems, zeroScanProblems,
} from './check-agents.ts';
import { trackedPages } from './check-agents-spec.ts';

function tree(files: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), 'arena-agents-'));
  for (const [rel, text] of Object.entries(files) as [string, string][]) {
    const path = join(base, rel);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, text);
  }
  return base;
}

const NONE = new Map();

test('the branch has one name, and the levels are what the walk finds', () => {
  assert.equal(ROUTER, 'AGENTS.md');
  assert.ok(routers().length > 0, 'the walk found no level, so every assertion below is vacuous');
  assert.ok(routers().includes(ROUTER), 'the router is a level like any other');
});

test('SURVIVORS names every README.md kept, and says why each is not a contributor document', () => {
  assert.deepEqual([...SURVIVORS.keys()], [
    'README.md',
  ]);
  for (const reason of SURVIVORS.values()) assert.ok(reason.length > 40, 'an entry states its reason');
});

test('a link resolves against the document holding it, and a URL is not a link into the tree', () => {
  assert.equal(resolveLink('scripts', './check/AGENTS.md'), 'scripts/check/AGENTS.md');
  assert.equal(resolveLink('scripts/ci', '../../AGENTS.md'), 'AGENTS.md');
  assert.equal(resolveLink('.', './contracts/AGENTS.md#roof'), 'contracts/AGENTS.md');
  assert.equal(resolveLink('.', 'https://agents.md'), null);
  assert.equal(resolveLink('.', '/AGENTS.md'), null, 'a leading slash is a site root and not a repository one');
});

test('a path written in prose is not a link, because a reader cannot follow one', () => {
  const known = new Set(['AGENTS.md', 'scripts/AGENTS.md']);
  assert.deepEqual(linkedRouters('AGENTS.md', 'see [scripts](./scripts/AGENTS.md)', known), ['scripts/AGENTS.md']);
  assert.deepEqual(linkedRouters('AGENTS.md', 'see scripts/AGENTS.md', known), []);
});

test('reach is transitive, so a level linked from a level the router links is reached', () => {
  const known = new Set(['AGENTS.md', 'a/AGENTS.md', 'a/b/AGENTS.md']);
  const text = new Map([
    ['AGENTS.md', '[a](./a/AGENTS.md)'],
    ['a/AGENTS.md', '[b](./b/AGENTS.md)'],
    ['a/b/AGENTS.md', 'the leaf'],
  ]);
  assert.deepEqual(
    [...reachedFrom('AGENTS.md', known, (rel) => text.get(rel) ?? '')].sort(),
    ['AGENTS.md', 'a/AGENTS.md', 'a/b/AGENTS.md'],
  );
});

test('a level no chain of links reaches is one only somebody who knew it was there can open', () => {
  const base = tree({ 'AGENTS.md': '[a](./a/AGENTS.md)', 'a/AGENTS.md': 'no link down', 'a/b/AGENTS.md': 'x' });
  const problems = reachProblems(base);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /a\/b\/AGENTS\.md is a level on this branch and no chain of links/);
});

test('a level linked by the level whose subject reaches it, rather than by its parent, is reached', () => {
  const base = tree({
    'AGENTS.md': '[design](./contracts/AGENTS.md)',
    'contracts/AGENTS.md': '[the store](../plugin-store/AGENTS.md)',
    'plugin-store/AGENTS.md': 'x',
  });
  assert.deepEqual(reachProblems(base), []);
});

test('a level a build emitted is a copy of one the tree already carries, and is not a level', () => {
  assert.equal(EMITTED, 'dist');
  assert.equal(EMITTED_UNDER_FRAMEWORKS, 'build');
  assert.equal(emitted('frameworks/angular/build/package/AGENTS.md'), true);
  assert.equal(emitted('dist/site/intro/AGENTS.md'), true);
  assert.equal(emitted('scripts/ci/arena/AGENTS.md'), false);
  assert.equal(emitted('scripts/build/react/AGENTS.md'), false,
    'the build PHASE is where a generator is written, and dropping it takes five levels out of the walk');
});

test('the walk reaches every level the index carries, so nothing is judged over a subset', () => {
  const found = new Set(routers());
  for (const rel of trackedPages()) assert.ok(found.has(rel), `${rel} is tracked and the walk missed it`);
});

test('a README.md back on the branch is a problem, and the message says both remedies', () => {
  const base = tree({ 'scripts/lib/README.md': '# notes' });
  const problems = survivorProblems(base, [...markdownFiles(base)], NONE);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /scripts\/lib\/README\.md is a README\.md on the contributor branch/);
  assert.match(problems[0] ?? '', /or name it in SURVIVORS/);
});

test('a SURVIVORS entry whose file has gone fails as a stale allowance', () => {
  const base = tree({ 'a/AGENTS.md': 'x' });
  const survivors = new Map([['README.md', 'Getting started, the page GitHub and npm both show a reader']]);
  const problems = survivorProblems(base, [...markdownFiles(base)], survivors);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /SURVIVORS names README\.md, and no README\.md is there/);
});

test('a survivor that is there passes, and an assembled dist copy is read by nobody', () => {
  const base = tree({ 'README.md': '# getting started', 'frameworks/react/dist/README.md': '# npm page' });
  const survivors = new Map([['README.md', 'Getting started, the page GitHub and npm both show a reader']]);
  assert.deepEqual(survivorProblems(base, [...markdownFiles(base)], survivors), []);
});

test('a vendor or dist directory under frameworks is skipped, and one anywhere else is not', () => {
  assert.deepEqual([...SKIPPED_ANYWHERE], ['node_modules', '.git', '.claude']);
  assert.deepEqual([...SKIPPED_UNDER_FRAMEWORKS], ['dist', 'vendor']);
  assert.equal(skips('vendor', 'frameworks/react'), true);
  assert.equal(skips('vendor', 'scripts'), false);
});

test('an empty walk is a failure, because it reports every level reachable and every survivor stale', () => {
  assert.equal(zeroScanProblems([]).length, 1);
  assert.match(zeroScanProblems([])[0] ?? '', /clean-looking pass over a tree it never opened/);
  assert.deepEqual(zeroScanProblems(['AGENTS.md']), []);
});
