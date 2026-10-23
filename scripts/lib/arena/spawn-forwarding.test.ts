/* Covers spawn-forwarding.ts through its exports: a parent that runs a child through it and is
 * sent SIGTERM or SIGINT ends the child, waits for it, prints what the child wrote and ends by
 * that signal, leaving no capture directory; the listeners it adds are on before the child exists
 * and gone once it has ended on its own; the probe signals on the stand-in's ready mark, which
 * the old order, mark before line, fails every time. Signals are a POSIX idea. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { platform } from './platform.ts';
import { budgetFor } from './deadline.ts';
import { TERM_GRACE } from './child-output.ts';
import { PROBE_ENDED, PROBE_IMPORTED, PROBE_SPAWNED, probeInterrupt, standIn } from './forwarding-probe.ts';
import { FORWARDED, spawnForwarding } from './spawn-forwarding.ts';

const BUDGET = budgetFor(PROBE_IMPORTED, PROBE_SPAWNED, PROBE_ENDED, TERM_GRACE);
const SKIP = platform === 'win32' ? 'a signal sent to a process is a POSIX idea' : false;

const CASES: Array<{ name: string; capture: boolean; signal: NodeJS.Signals }> = [
  { name: 'inherited output, SIGTERM', capture: false, signal: 'SIGTERM' },
  { name: 'captured output, SIGTERM', capture: true, signal: 'SIGTERM' },
  { name: 'captured output, SIGINT', capture: true, signal: 'SIGINT' },
];

test('a signal sent to the parent reaches the child, and the parent ends by that signal with the capture directory removed and the output printed',
  { timeout: BUDGET * CASES.length, skip: SKIP }, async () => {
    let walked = 0;
    for (const one of CASES) {
      const probed = await probeInterrupt({
        module: join(import.meta.dirname, 'spawn-forwarding.ts'),
        signal: one.signal,
        body: [
          `const r = await step.spawnForwarding(process.execPath, [stub], { capture: ${one.capture} });`,
          "step.endIfInterrupted('probe', r);",
          "console.error('probe: the parent went on after the interrupt');",
        ].join('\n'),
      });
      assert.equal(probed.signal, one.signal, `${one.name}: the parent ends by the signal it was sent`);
      assert.equal(probed.childAliveAtExit, false, `${one.name}: the child is gone when the parent is`);
      assert.deepEqual(probed.left, [], `${one.name}: no capture directory outlives the parent`);
      assert.match(probed.stderr, new RegExp(`probe: interrupted by ${one.signal}`));
      assert.doesNotMatch(probed.stderr, /went on after the interrupt/);
      if (one.capture) assert.match(probed.stderr, /compiler said hello/, `${one.name}: the captured output is printed`);
      walked += 1;
    }
    assert.equal(walked, CASES.length);
    assert.equal(CASES.length, 3);
  });

const ORDERS = [
  { name: 'the line, then the mark at once', standIn: standIn(), hello: true },
  { name: 'the line, a pause, then the mark', standIn: standIn({ pauseMs: 300 }), hello: true },
  { name: 'the old order, the mark, then the line after a pause the signal always lands in',
    standIn: standIn({ markFirst: true, pauseMs: 600_000 }), hello: false },
];

test('the probe signals on the stand-in\'s ready mark, so a pause between the line and the mark changes nothing, and the old order never prints the line',
  { timeout: BUDGET * ORDERS.length, skip: SKIP }, async () => {
    for (const one of ORDERS) {
      const probed = await probeInterrupt({
        module: join(import.meta.dirname, 'spawn-forwarding.ts'),
        standIn: one.standIn,
        body: [
          'const r = await step.spawnForwarding(process.execPath, [stub], { capture: true });',
          "step.endIfInterrupted('probe', r);",
        ].join('\n'),
      });
      assert.equal(probed.signal, 'SIGTERM', `${one.name}: the parent ends by the signal it was sent`);
      assert.equal(probed.childAliveAtExit, false, `${one.name}: the child is gone when the parent is`);
      assert.match(probed.stderr, /probe: interrupted by SIGTERM/, one.name);
      if (one.hello) assert.match(probed.stderr, /compiler said hello/, one.name);
      else assert.doesNotMatch(probed.stderr, /compiler said hello/, `${one.name}: the probe would not catch the race`);
    }
  });

test('the listeners are on before the child exists, and a signal that lands before it does ends it as it is spawned',
  { timeout: BUDGET }, async () => {
    const before = FORWARDED.map((name) => process.listenerCount(name));
    let atSpawn: number[] = [];
    const r = await spawnForwarding(process.execPath, ['-e', 'setInterval(() => {}, 1_000);'], {
      spawn: (command, args, options) => {
        atSpawn = FORWARDED.map((name) => process.listenerCount(name));
        for (const listener of process.listeners('SIGTERM').slice(before[0])) (listener as (s: string) => void)('SIGTERM');
        return spawn(command, args, options);
      },
    });
    assert.deepEqual(atSpawn, before.map((n) => n + 1), 'a signal between the spawn and the listeners kills the parent alone');
    assert.equal(r.interrupted, 'SIGTERM');
    assert.notEqual(r.status, 0, 'the child ran on after the signal that came before it');
    assert.deepEqual(FORWARDED.map((name) => process.listenerCount(name)), before);
  });

test('an interrupt prints the whole capture and its own line before it signals itself, even into a pipe', { timeout: BUDGET }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-forward-pipe-'));
  try {
    const parent = join(dir, 'parent.ts');
    writeFileSync(parent, [
      `import { endIfInterrupted } from ${JSON.stringify(pathToFileURL(join(import.meta.dirname, 'spawn-forwarding.ts')).href)};`,
      "endIfInterrupted('probe', { status: null, signal: 'SIGTERM', interrupted: 'SIGTERM', output: 'x'.repeat(4 * 1024 * 1024) + '\\nend of capture\\n' });",
    ].join('\n'));
    const child = spawn(process.execPath, [parent], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (chunk) => { err += String(chunk); });
    await new Promise((done) => child.once('close', done));
    assert.ok(err.length > 4 * 1024 * 1024, `only ${err.length} bytes reached the pipe before the signal`);
    assert.match(err, /end of capture\nprobe: interrupted by SIGTERM/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the listeners it adds are removed when the child ends on its own, and its output is returned when asked for',
  { timeout: BUDGET }, async () => {
    const before = FORWARDED.map((name) => process.listenerCount(name));
    const r = await spawnForwarding(process.execPath, ['-e', "console.log('said'); console.error('also')"], { capture: true });
    assert.equal(r.status, 0);
    assert.match(r.output, /said/);
    assert.match(r.output, /also/);
    assert.deepEqual(FORWARDED.map((name) => process.listenerCount(name)), before);
    assert.equal(FORWARDED.length, 2);
  });

test('a command that cannot be spawned is reported as an error and leaves no listener', { timeout: BUDGET }, async () => {
  const before = FORWARDED.map((name) => process.listenerCount(name));
  const r = await spawnForwarding(join(tmpdir(), 'arena-no-such-binary'), []);
  assert.ok(r.error, 'the spawn error is returned');
  assert.deepEqual(FORWARDED.map((name) => process.listenerCount(name)), before);
});

test('the parent marks itself ready only after the step module has finished importing',
  { timeout: BUDGET, skip: SKIP }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'arena-forward-order-'));
    try {
      const module = join(dir, 'slow-step.mjs');
      writeFileSync(module, [
        "import { existsSync, writeFileSync } from 'node:fs';",
        "import { dirname, join } from 'node:path';",
        `export * from ${JSON.stringify(pathToFileURL(join(import.meta.dirname, 'spawn-forwarding.ts')).href)};`,
        'await new Promise((resolve) => setImmediate(resolve));',
        'const dir = dirname(process.argv[1]);',
        "writeFileSync(join(dir, 'order'), existsSync(join(dir, 'parent.ready')) ? 'mark-first' : 'import-first');",
      ].join('\n'));
      const probed = await probeInterrupt({
        module,
        body: [
          "import { readFileSync } from 'node:fs';",
          "import { join } from 'node:path';",
          "console.error(readFileSync(join(root, 'order'), 'utf8'));",
          "const r = await step.spawnForwarding(process.execPath, [stub], { capture: false });",
          "step.endIfInterrupted('probe', r);",
        ].join('\n'),
      });
      assert.match(probed.stderr, /import-first/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

test('a parent that exits while importing fails the probe at once and shows what the parent printed',
  { timeout: BUDGET, skip: SKIP }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'arena-forward-exit-'));
    try {
      const module = join(dir, 'broken-step.mjs');
      writeFileSync(module, 'export const = "step module refused to load";\n');
      await assert.rejects(
        probeInterrupt({ module, body: 'console.error(Object.keys(step));' }),
        /exited first, printing[\s\S]*step module refused to load/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
