/* The two claims this step makes about its own output, each of which this suite alone states: that
 * ngc compiled an entry for every page, and that the bundler landed each one in build/demo/js
 * under the name the page loads it by. The second is the one a browser gate cannot state: a page
 * whose entry is missing renders an empty document, and every gate that opens one then waits out
 * its timeout and reports the component as drawing nothing. Both are pure over lists, so the
 * shape a bundler produces on another operating system is asserted from this one. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { platform } from '../../lib/arena/platform.ts';
import { budgetFor } from '../../lib/arena/deadline.ts';
import { TERM_GRACE } from '../../lib/arena/child-output.ts';
import { PROBE_ENDED, PROBE_SPAWNED, assertCompilerEnded, probeInterrupt } from '../../lib/arena/forwarding-probe.ts';
import { missingEntryProblems, unbundledProblems, isEntry } from './build-angular-demo.ts';

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
  assert.match(problems[0] ?? '', /tsconfig\.demo\.json/);
});

test('an entry is recognised by suffix in either extension, since one side is source and the other emit', () => {
  assert.equal(isEntry(ENTRY), true);
  assert.equal(isEntry('ArenaDialog.demo.entry.generated.ts', '.ts'), true);
  assert.equal(isEntry('ArenaDialog.ts', '.ts'), false);
});

test('an interrupt of the demo step ends the ngc it spawned', {
  timeout: budgetFor(PROBE_SPAWNED, PROBE_ENDED, TERM_GRACE),
  skip: platform === 'win32' ? 'a signal sent to a process is a POSIX idea' : false,
}, async () => {
  const probed = await probeInterrupt({
    module: join(import.meta.dirname, 'build-angular-demo.ts'),
    body: 'await step.compileDemo(stub, "unused.json", root);',
  });
  assertCompilerEnded(probed, false);
});
