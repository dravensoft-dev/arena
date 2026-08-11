/* The gate reads the real tree, so these drive its pure functions with the four shapes a real
 * mistake takes: a declared level nobody wrote, a level the router does not link, a README.md
 * back on the branch, and a SURVIVORS entry whose file has gone. Both maps are asserted by name. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ROUTER, DOMAINS, SURVIVORS, SKIPPED_ANYWHERE, SKIPPED_UNDER_FRAMEWORKS, skips,
  markdownFiles, declaredTargets, missingProblems, routerProblems, survivorProblems,
  zeroScanProblems,
} from './check-agents.ts';

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

test('the declared tree is the router plus one document per domain, and nothing else', () => {
  assert.equal(ROUTER, 'AGENTS.md');
  assert.deepEqual(DOMAINS, ['contracts', 'frameworks', 'scripts', 'intro']);
  assert.deepEqual(declaredTargets(), [
    'AGENTS.md', 'contracts/AGENTS.md', 'frameworks/AGENTS.md', 'scripts/AGENTS.md', 'intro/AGENTS.md',
  ]);
});

test('SURVIVORS names every README.md kept, and says why each is not a contributor document', () => {
  assert.deepEqual([...SURVIVORS.keys()], [
    'README.md',
  ]);
  for (const reason of SURVIVORS.values()) assert.ok(reason.length > 40, 'an entry states its reason');
});

test('a declared level nobody wrote is a problem, not a level that needs no document', () => {
  const base = tree({ 'AGENTS.md': 'x' });
  const problems = missingProblems(base);
  assert.equal(problems.length, DOMAINS.length);
  assert.match(problems[0] ?? '', /contracts\/AGENTS\.md is declared and is not there/);
});

test('a level the router does not link is reachable only by guessing at it', () => {
  const base = tree({ 'AGENTS.md': 'see contracts/AGENTS.md and frameworks/AGENTS.md and intro/AGENTS.md' });
  const problems = routerProblems(base);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /links no scripts\/AGENTS\.md/);
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
  assert.deepEqual([...SKIPPED_ANYWHERE], ['node_modules', '.git']);
  assert.deepEqual([...SKIPPED_UNDER_FRAMEWORKS], ['dist', 'vendor']);
  assert.equal(skips('vendor', 'frameworks/react'), true);
  assert.equal(skips('vendor', 'scripts'), false);
  assert.equal(skips('build', 'frameworks/angular'), false, 'the staging README is a declared survivor, so the walk must reach it');
});

test('an empty walk is a failure, because it reports every level present and every survivor stale', () => {
  assert.equal(zeroScanProblems([]).length, 1);
  assert.match(zeroScanProblems([])[0] ?? '', /clean-looking pass over a tree it never opened/);
  assert.deepEqual(zeroScanProblems(['AGENTS.md']), []);
});
