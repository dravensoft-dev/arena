/* The claims this step makes about its own output, each of which this suite alone states: that
 * the emit it bundles from is the current one, that it holds an entry for every page, and that
 * the bundler landed each one in build/demo/js under the name the page loads it by. The last is
 * the one a browser gate cannot state: a page whose entry is missing renders an empty document,
 * and every gate that opens one then waits out its timeout and reports the component as drawing
 * nothing. All are pure over lists or a mkdtemp tree, so the shape a bundler produces on another
 * operating system is asserted from this one. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { missingEntryProblems, unbundledProblems, isEntry, staleEmitMessage, node } from './build-angular-demo.ts';
import { resolveSpecs } from '../../graph/pathspecs.ts';
import { collectInputs, emitStaleness, recordInputs, node as testsNode } from './build-angular-tests.ts';

const ENTRY = 'ArenaDialog.demo.entry.generated.js';

test('an entry that landed where the page looks for it is no problem', () => {
  assert.deepEqual(unbundledProblems([ENTRY], [ENTRY], 'frameworks/angular/build/demo/js'), []);
});

test('an entry bundled under another name or into another directory is reported with what did land', () => {
  const problems = unbundledProblems([ENTRY], ['chunk-abc.js'], 'frameworks/angular/build/demo/js');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /frameworks\/angular\/build\/demo\/js\/ArenaDialog\.demo\.entry\.generated\.js/);
  assert.match(problems[0] ?? '', /chunk-abc\.js/,
    'what did land is what tells a reader whether the bundler renamed the file or moved it, and '
    + 'those are two different edits');
});

test('a bundle directory holding nothing at all says so rather than listing an empty set', () => {
  assert.match(unbundledProblems([ENTRY], [], 'js')[0] ?? '', /nothing at all/);
});

test('a source entry ngc never compiled is named with the include that would reach it', () => {
  assert.deepEqual(missingEntryProblems(['a/A.demo.entry.generated.ts'], ['a/A.demo.entry.generated.js']), []);
  const problems = missingEntryProblems(['a/A.demo.entry.generated.ts'], []);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /tsconfig\.test\.json/);
});

test('an entry is recognised by suffix in either extension, since one side is source and the other emit', () => {
  assert.equal(isEntry(ENTRY), true);
  assert.equal(isEntry('ArenaDialog.demo.entry.generated.ts', '.ts'), true);
  assert.equal(isEntry('ArenaDialog.ts', '.ts'), false);
});

function layer(files: Record<string, string>) {
  const repo = mkdtempSync(join(tmpdir(), 'arena-demo-emit-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(repo, rel)), { recursive: true });
    writeFileSync(join(repo, rel), text);
  }
  const root = join(repo, 'layer');
  const stamp = join(root, 'build', 'test', '.arena-emit-stamp');
  const verdict = () => staleEmitMessage(emitStaleness(repo, root, stamp, undefined, []));
  const record = () => {
    mkdirSync(dirname(stamp), { recursive: true });
    writeFileSync(stamp, JSON.stringify({ inputs: recordInputs(repo, collectInputs(repo, root, undefined, [])) }));
  };
  return { repo, verdict, record };
}

test('a bundle over an emit that was never made is refused with the command that makes it', () => {
  const { repo, verdict } = layer({ 'layer/a.html': '<p>one</p>', 'layer/a.ts': 'export const a = 1;' });
  try {
    const message = verdict() ?? '';
    assert.match(message, /^build-angular-demo: /);
    assert.match(message, /no emit stamp is present/);
    assert.match(message, /bun run build:angular-tests/);
    assert.match(message, /bun run build\b/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('a bundle over an emit that an edited source has outdated is refused, and over a current one is not', () => {
  const { repo, verdict, record } = layer({ 'layer/a.ts': 'export const a = 1;' });
  try {
    record();
    assert.equal(verdict(), null);
    writeFileSync(join(repo, 'layer/a.ts'), 'export const a = 2;');
    utimesSync(join(repo, 'layer/a.ts'), new Date(Date.now() + 60_000), new Date(Date.now() + 60_000));
    const message = verdict() ?? '';
    assert.match(message, /layer\/a\.ts holds other content than the last emit compiled/);
    assert.match(message, /bun run build:angular-tests/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('the node reads the emit, its stamp and the script that judges it, and the emit node feeds it the layer', () => {
  const inputs = [
    'frameworks/angular/build/test/a/A.js', 'frameworks/angular/build/test/.arena-emit-stamp',
    'frameworks/angular/components/a/A.demo.entry.generated.ts', 'scripts/build/angular/build-angular-tests.ts',
    'package.json', 'bun.lock',
  ];
  const outside = ['frameworks/angular/build/demo/js/A.json', 'frameworks/angular/dist/arena.tokens.json'];
  assert.deepEqual(resolveSpecs(node.reads, [...inputs, ...outside]), [...inputs].sort());
  assert.ok(testsNode.feeds.includes(node.name), 'the layer reaches this node through the emit node\'s fingerprint');
  assert.ok(testsNode.reads.includes('frameworks/angular/**/*.ts'));
});
