/* arena build --watch: one build, then a rebuild after each burst of relevant changes. SETTLE_MS is
 * 100 because an editor saves by truncate, write and rename within a few milliseconds, and the quiet
 * window folds that burst into one build; it bounds no hang, so it is a plain constant, not a deadline. */
import { existsSync, statSync, watch } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import type { Options } from './args.ts';
import { voice } from './io.ts';
import type { Io } from './io.ts';
import { toPosix } from './posix.ts';
import { OUTPUT_SHEETS, SKIPPED_DIRECTORIES, SOURCE_EXTENSIONS, pluginDirs } from './sources.ts';

export const SETTLE_MS = 100;

export type WatchTarget = { dir: string; recursive: boolean; only: string | null };
export type WatchEvent = { target: WatchTarget; filename: string | null };
export type Watcher = { close(): void };
export type WatchDeps = {
  watch(dir: string, recursive: boolean, changed: (filename: string | null) => void, failed: (error: Error) => void): Watcher;
  schedule(run: () => void, ms: number): unknown;
  cancel(handle: unknown): void;
  signal: AbortSignal;
};

const keyOf = (target: WatchTarget) => `${target.dir}|${target.recursive}|${target.only}`;

function awaited(path: string): WatchTarget | null {
  let child = resolve(path);
  let parent = dirname(child);
  while (!existsSync(parent)) {
    if (dirname(parent) === parent) return null;
    child = parent;
    parent = dirname(parent);
  }
  return { dir: parent, recursive: false, only: basename(child) };
}

export function watchTargets(options: Pick<Options, 'config' | 'paths'>): WatchTarget[] {
  const found = new Map<string, WatchTarget>();
  const add = (target: WatchTarget | null) => { if (target && !found.has(keyOf(target))) found.set(keyOf(target), target); };
  const config = resolve(options.config);
  add({ dir: dirname(config), recursive: false, only: basename(config) });
  for (const path of options.paths) {
    if (!existsSync(path)) add(awaited(path));
    else if (statSync(path).isDirectory()) add({ dir: resolve(path), recursive: true, only: null });
    else add({ dir: dirname(resolve(path)), recursive: false, only: basename(path) });
  }
  for (const dir of pluginDirs(options)) add(existsSync(dir) ? { dir, recursive: true, only: null } : awaited(dir));
  return [...found.values()];
}

const rootEvent = (filename: string | null) => filename === null || filename === '';

export function relevant({ target, filename }: WatchEvent, separator?: Parameters<typeof toPosix>[1]): boolean {
  if (rootEvent(filename)) return true;
  const parts = toPosix(filename as string, separator).split('/');
  const name = parts[parts.length - 1] ?? '';
  if (target.only !== null) return name === target.only;
  if (OUTPUT_SHEETS.has(name as never) || parts.some((part) => SKIPPED_DIRECTORIES.has(part))) return false;
  return name.endsWith('.json') || SOURCE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function systemWatch(): WatchDeps {
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  return {
    watch(dir, recursive, changed, failed) {
      const watcher = watch(dir, { recursive }, (_, name) => changed(name?.toString() ?? null));
      watcher.on('error', failed);
      return watcher;
    },
    schedule: (run, ms) => setTimeout(run, ms),
    cancel: (handle) => clearTimeout(handle as NodeJS.Timeout),
    signal: controller.signal,
  };
}

export function watchBuild(options: Options, build: () => number, io: Io, deps: WatchDeps): Promise<number> {
  const say = voice(io, 'build');
  const open = new Map<string, Watcher>();
  const stale = new Set<string>();
  let pending: unknown = null;
  let stopped = false;

  const reconcile = () => {
    const wanted = new Map(watchTargets(options).map((target) => [keyOf(target), target]));
    for (const [key, watcher] of open) {
      if (wanted.has(key) && !stale.has(key)) continue;
      watcher.close();
      open.delete(key);
    }
    stale.clear();
    for (const [key, target] of wanted) {
      if (open.has(key)) continue;
      try {
        open.set(key, deps.watch(target.dir, target.recursive, (filename) => {
          if (stopped || !relevant({ target, filename })) return;
          if (rootEvent(filename)) stale.add(key);
          if (pending !== null) deps.cancel(pending);
          pending = deps.schedule(rebuild, SETTLE_MS);
        }, (error) => {
          say.err(`${target.dir}: ${error.message}`);
          open.get(key)?.close();
          open.delete(key);
        }));
      } catch (error) {
        say.err(`${target.dir}: ${(error as Error).message}`);
      }
    }
  };

  function rebuild() {
    pending = null;
    if (stopped) return;
    try {
      build();
    } catch (error) {
      say.err(`rebuild failed: ${(error as Error).message}`);
    }
    say.out('still watching');
    reconcile();
  }

  try {
    build();
  } catch (error) {
    say.err(`build failed: ${(error as Error).message}`);
  }
  reconcile();
  say.out(`watching ${open.size} location(s); Ctrl-C stops`);
  return new Promise((done) => {
    const stop = () => {
      stopped = true;
      if (pending !== null) deps.cancel(pending);
      pending = null;
      for (const watcher of open.values()) watcher.close();
      open.clear();
      done(0);
    };
    if (deps.signal.aborted) stop();
    else deps.signal.addEventListener('abort', stop, { once: true });
  });
}
