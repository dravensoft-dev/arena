/* arena build --watch: one build, then a rebuild after each burst of relevant changes. SETTLE_MS is
 * 100 because an editor saves by truncate, write and rename within a few milliseconds, and the quiet
 * window folds that burst into one build; it bounds no hang, so it is a plain constant, not a deadline. */
import { existsSync, statSync, watch } from 'node:fs';
import { basename, dirname, resolve, sep } from 'node:path';
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

export function watchTargets(options: Pick<Options, 'config' | 'paths'>): WatchTarget[] {
  const found = new Map<string, WatchTarget>();
  const add = (target: WatchTarget) => { if (!found.has(keyOf(target))) found.set(keyOf(target), target); };
  const config = resolve(options.config);
  add({ dir: dirname(config), recursive: false, only: basename(config) });
  for (const path of options.paths) {
    if (!existsSync(path)) continue;
    if (statSync(path).isDirectory()) add({ dir: resolve(path), recursive: true, only: null });
    else add({ dir: dirname(resolve(path)), recursive: false, only: basename(path) });
  }
  for (const dir of pluginDirs(options)) if (existsSync(dir)) add({ dir, recursive: true, only: null });
  return [...found.values()];
}

export function relevant({ target, filename }: WatchEvent, separator = sep): boolean {
  if (filename === null) return true;
  const parts = toPosix(filename, separator).split('/');
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
  let pending: unknown = null;
  let stopped = false;

  const reconcile = () => {
    const wanted = new Map(watchTargets(options).map((target) => [keyOf(target), target]));
    for (const [key, watcher] of open) {
      if (wanted.has(key)) continue;
      watcher.close();
      open.delete(key);
    }
    for (const [key, target] of wanted) {
      if (open.has(key)) continue;
      try {
        open.set(key, deps.watch(target.dir, target.recursive, (filename) => {
          if (stopped || !relevant({ target, filename })) return;
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

  build();
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
