/* arena build --watch: the loop is driven with a fake watch and a fake schedule, never real time. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { commandOptions } from './args.ts';
import type { Options } from './args.ts';
import { relevant, watchBuild, watchTargets, SETTLE_MS } from './watch.ts';
import type { WatchDeps, WatchEvent, WatchTarget } from './watch.ts';
import { captureIo, project } from './cli-fixtures.ts';

function optionsOf(root: string, extra: string[] = []): Options {
  const { io } = captureIo(root);
  const got = commandOptions('build', ['--config', join(root, 'arena.config.json'), '--src', join(root, 'src'), ...extra], io);
  assert.equal(typeof got, 'object');
  return got as Options;
}

function pluginRoot() {
  const root = project({ stylePlugins: ['default', './design/andina'] });
  mkdirSync(join(root, 'design', 'andina'), { recursive: true });
  return root;
}

function harness(build: () => number = () => 0) {
  const opened: { dir: string; recursive: boolean; changed: (f: string | null) => void; failed: (e: Error) => void; closed: boolean }[] = [];
  const pending: { run: () => void; ms: number; live: boolean }[] = [];
  const controller = new AbortController();
  const deps: WatchDeps = {
    watch(dir, recursive, changed, failed) {
      const one = { dir, recursive, changed, failed, closed: false };
      opened.push(one);
      return { close() { one.closed = true; } };
    },
    schedule(run, ms) {
      const handle = { run, ms, live: true };
      pending.push(handle);
      return handle;
    },
    cancel(handle) { (handle as { live: boolean }).live = false; },
    signal: controller.signal,
  };
  let builds = 0;
  const counted = () => { builds += 1; return build(); };
  const flush = () => { for (const one of pending.splice(0)) if (one.live) one.run(); };
  const live = () => opened.filter((one) => !one.closed);
  return { opened, pending, controller, deps, counted, flush, live, builds: () => builds };
}

const event = (target: Partial<WatchTarget>, filename: string | null): WatchEvent =>
  ({ target: { dir: '/p', recursive: true, only: null, ...target }, filename });

test('watchTargets: config dir with only, src dir recursive, src file with only, plugin dirs, a missing path watched through its nearest existing parent with only its first missing segment, duplicates merged', () => {
  const root = pluginRoot();
  writeFileSync(join(root, 'main.ts'), '');
  const targets = watchTargets(optionsOf(root, ['--src', join(root, 'main.ts'), '--src', join(root, 'nowhere'), '--src', join(root, 'deep', 'er'), '--src', join(root, 'src')]));
  assert.deepEqual(targets, [
    { dir: root, recursive: false, only: 'arena.config.json' },
    { dir: join(root, 'src'), recursive: true, only: null },
    { dir: root, recursive: false, only: 'main.ts' },
    { dir: root, recursive: false, only: 'nowhere' },
    { dir: root, recursive: false, only: 'deep' },
    { dir: join(root, 'design', 'andina'), recursive: true, only: null },
  ]);
  rmSync(join(root, 'design', 'andina'), { recursive: true });
  assert.deepEqual(watchTargets(optionsOf(root)).at(-1), { dir: join(root, 'design'), recursive: false, only: 'andina' });
  const twice = watchTargets(optionsOf(root, ['--src', join(root, 'src')]));
  assert.equal(twice.filter((one) => one.dir === join(root, 'src')).length, 1);
});

test('relevant keeps only the config basename on an only target, ignores output sheets and node_modules segments, keeps source extensions, .json and a null or empty filename, and reads a Windows-style name through toPosix', () => {
  const only = { only: 'arena.config.json', recursive: false };
  assert.equal(relevant(event(only, 'arena.config.json')), true);
  assert.equal(relevant(event(only, 'other.json')), false);
  assert.equal(relevant(event({}, 'arena.generated.css')), false);
  assert.equal(relevant(event({}, 'node_modules/x/a.ts')), false);
  assert.equal(relevant(event({}, 'a/dist/b.css')), false);
  for (const name of ['a.html', 'a.tsx', 'a.css', 'plugin.tokens.json']) assert.equal(relevant(event({}, name)), true, name);
  assert.equal(relevant(event({}, 'notes.md')), false);
  assert.equal(relevant(event({}, null)), true);
  assert.equal(relevant(event(only, null)), true);
  assert.equal(relevant(event({}, '')), true);
  assert.equal(relevant(event({}, 'a\\node_modules\\b.ts'), '\\'), false);
});

test('the initial build runs once before any event', async () => {
  const root = project();
  const h = harness();
  const { io, out } = captureIo(root);
  const done = watchBuild(optionsOf(root), h.counted, io, h.deps);
  assert.equal(h.builds(), 1);
  assert.equal(h.pending.length, 0);
  assert.ok(out.some((line) => /^arena build: watching \d+ location\(s\); Ctrl-C stops$/.test(line)));
  h.controller.abort();
  assert.equal(await done, 0);
});

test('a first build that throws prints build failed and still watches, and the next event builds again', async () => {
  const root = project();
  let step = 0;
  const h = harness(() => { step += 1; if (step === 1) throw new Error('boom'); return 0; });
  const { io, out, err } = captureIo(root);
  const done = watchBuild(optionsOf(root), h.counted, io, h.deps);
  assert.ok(err.includes('arena build: build failed: boom'));
  assert.ok(out.some((line) => /^arena build: watching \d+ location\(s\); Ctrl-C stops$/.test(line)));
  h.live().find((one) => one.dir === join(root, 'src'))!.changed('a.ts');
  h.flush();
  assert.equal(h.builds(), 2);
  h.controller.abort();
  assert.equal(await done, 0);
});

test('a burst of relevant events schedules one build (each cancels the previous)', async () => {
  const root = project();
  const h = harness();
  const { io } = captureIo(root);
  const done = watchBuild(optionsOf(root), h.counted, io, h.deps);
  const src = h.live().find((one) => one.dir === join(root, 'src'))!;
  for (const name of ['a.html', 'b.ts', 'c.css']) src.changed(name);
  assert.equal(h.pending.filter((one) => one.live).length, 1);
  assert.equal(h.pending[0]!.ms, SETTLE_MS);
  h.flush();
  assert.equal(h.builds(), 2);
  h.controller.abort();
  await done;
});

test('an irrelevant event schedules nothing', async () => {
  const root = project();
  const h = harness();
  const { io } = captureIo(root);
  const done = watchBuild(optionsOf(root), h.counted, io, h.deps);
  h.live().find((one) => one.dir === join(root, 'src'))!.changed('arena.generated.css');
  h.live().find((one) => one.dir === join(root, 'src'))!.changed('readme.md');
  assert.equal(h.pending.length, 0);
  h.controller.abort();
  await done;
});

test('a build that throws or returns 1 leaves the loop watching, and the next event builds again', async () => {
  const root = project();
  let step = 0;
  const h = harness(() => { step += 1; if (step === 2) throw new Error('boom'); return step === 3 ? 1 : 0; });
  const { io, out, err } = captureIo(root);
  const done = watchBuild(optionsOf(root), h.counted, io, h.deps);
  const src = () => h.live().find((one) => one.dir === join(root, 'src'))!;
  src().changed('a.ts'); h.flush();
  assert.ok(err.includes('arena build: rebuild failed: boom'));
  src().changed('a.ts'); h.flush();
  src().changed('a.ts'); h.flush();
  assert.equal(h.builds(), 4);
  assert.equal(out.filter((line) => line === 'arena build: still watching').length, 3);
  h.controller.abort();
  assert.equal(await done, 0);
});

test('a plugin added to the config is watched after the next rebuild', async () => {
  const root = project({});
  const h = harness();
  const { io } = captureIo(root);
  const done = watchBuild(optionsOf(root), h.counted, io, h.deps);
  const before = h.live().length;
  mkdirSync(join(root, 'design', 'andina'), { recursive: true });
  writeFileSync(join(root, 'arena.config.json'), JSON.stringify({ stylePlugins: ['default', './design/andina'] }));
  h.live().find((one) => one.dir === root)!.changed('arena.config.json');
  h.flush();
  assert.equal(h.live().length, before + 1);
  assert.ok(h.live().some((one) => one.dir === join(root, 'design', 'andina') && one.recursive));
  h.controller.abort();
  await done;
});

test('a failed watcher is dropped and reopened at the next reconcile', async () => {
  const root = project();
  const h = harness();
  const { io, err } = captureIo(root);
  const done = watchBuild(optionsOf(root), h.counted, io, h.deps);
  const first = h.live().find((one) => one.dir === join(root, 'src'))!;
  first.failed(new Error('gone'));
  assert.equal(first.closed, true);
  assert.ok(err.includes(`arena build: ${join(root, 'src')}: gone`));
  h.live().find((one) => one.dir === root)!.changed('arena.config.json');
  h.flush();
  const again = h.live().filter((one) => one.dir === join(root, 'src'));
  assert.equal(again.length, 1);
  assert.notEqual(again[0], first);
  h.controller.abort();
  await done;
});

for (const root_event of [null, '']) test(`a src dir removed and recreated within the settle window is reopened after its root event (${JSON.stringify(root_event)})`, async () => {
  const root = project();
  const h = harness();
  const { io } = captureIo(root);
  const done = watchBuild(optionsOf(root), h.counted, io, h.deps);
  const first = h.live().find((one) => one.dir === join(root, 'src'))!;
  rmSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'src'));
  first.changed(root_event);
  h.flush();
  assert.equal(h.builds(), 2);
  assert.equal(first.closed, true);
  const again = h.live().filter((one) => one.dir === join(root, 'src'));
  assert.equal(again.length, 1);
  assert.notEqual(again[0], first);
  again[0]!.changed('a.ts');
  assert.equal(h.pending.filter((one) => one.live).length, 1);
  h.controller.abort();
  await done;
});

test('a src dir missing at start is watched through its parent, and creating it rebuilds and swaps in the real watcher', async () => {
  const root = project();
  rmSync(join(root, 'src'), { recursive: true });
  const h = harness();
  const { io } = captureIo(root);
  const done = watchBuild(optionsOf(root), h.counted, io, h.deps);
  assert.equal(h.live().some((one) => one.dir === join(root, 'src')), false);
  const parents = h.live().filter((one) => one.dir === root && !one.recursive);
  assert.equal(parents.length, 2);
  for (const one of parents) one.changed('other.ts');
  assert.equal(h.pending.length, 0);
  mkdirSync(join(root, 'src'));
  for (const one of parents) one.changed('src');
  h.flush();
  assert.equal(h.builds(), 2);
  assert.equal(h.live().filter((one) => one.dir === join(root, 'src') && one.recursive).length, 1);
  assert.equal(h.live().filter((one) => one.dir === root).length, 1);
  h.controller.abort();
  await done;
});

test('a src dir removed while watching is watched through its parent until it comes back', async () => {
  const root = project();
  const h = harness();
  const { io } = captureIo(root);
  const done = watchBuild(optionsOf(root), h.counted, io, h.deps);
  const first = h.live().find((one) => one.dir === join(root, 'src'))!;
  rmSync(join(root, 'src'), { recursive: true });
  first.changed(null);
  h.flush();
  assert.equal(first.closed, true);
  assert.equal(h.live().some((one) => one.dir === join(root, 'src')), false);
  mkdirSync(join(root, 'src'));
  for (const one of h.live().filter((one) => one.dir === root)) one.changed('src');
  h.flush();
  assert.equal(h.builds(), 3);
  assert.equal(h.live().filter((one) => one.dir === join(root, 'src') && one.recursive).length, 1);
  h.controller.abort();
  await done;
});

test('abort closes every watcher, cancels the pending build and resolves 0', async () => {
  const root = project();
  const h = harness();
  const { io } = captureIo(root);
  const done = watchBuild(optionsOf(root), h.counted, io, h.deps);
  h.live().find((one) => one.dir === join(root, 'src'))!.changed('a.ts');
  h.controller.abort();
  assert.equal(await done, 0);
  assert.equal(h.live().length, 0);
  assert.equal(h.pending.every((one) => !one.live), true);
  h.flush();
  assert.equal(h.builds(), 1);
});
