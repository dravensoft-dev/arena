/* arena build: it writes the sheets a plan answers, and only the ones whose bytes changed, so a
 * bundler watching an untouched sheet does not rebuild. writeOutputs is the one writer of sheets. */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { commandOptions } from './args.ts';
import type { Options } from './args.ts';
import { voice } from './io.ts';
import type { Io } from './io.ts';
import { resolveEnvironment } from './host.ts';
import { plan, sheetStates } from './plan.ts';
import type { PlanEnvironment, SheetOutput } from './plan.ts';
import { systemWatch, watchBuild } from './watch.ts';
import type { WatchDeps } from './watch.ts';

export type WriteLog = { wrote(sheet: SheetOutput): void; removed(path: string): void };

export function writeOutputs(outputs: SheetOutput[], orphans: string[], out = '', log: WriteLog = { wrote() {}, removed() {} }):
  { written: SheetOutput[]; removed: string[] } {
  const written: SheetOutput[] = [];
  const removed: string[] = [];
  const at = (path: string, change: () => void) => {
    try {
      change();
    } catch (error) {
      throw Object.assign(new Error((error as Error).message), { path });
    }
  };
  for (const sheet of outputs) {
    at(sheet.path, () => {
      if (sheetStates([sheet])[0]?.state === 'current') return;
      mkdirSync(dirname(sheet.path), { recursive: true });
      writeFileSync(sheet.path, sheet.content);
      written.push(sheet);
      log.wrote(sheet);
    });
  }
  for (const name of orphans) {
    const path = join(out, name);
    if (!existsSync(path)) continue;
    at(path, () => rmSync(path, { force: true }));
    removed.push(path);
    log.removed(path);
  }
  return { written, removed };
}

export function buildOnce(options: Options, env: PlanEnvironment, io: Io): number {
  const say = voice(io, 'build');
  const p = plan(options, env);
  if (p.fatal.length > 0) {
    for (const line of p.fatal) say.err(line);
    return p.code;
  }
  for (const note of p.notes) say.out(note);
  let result;
  try {
    result = writeOutputs(p.outputs, p.orphans, options.out, {
      wrote: (sheet) => say.out(`wrote ${sheet.path} (${sheet.summary})`),
      removed: (at) => say.out(`removed ${at}, a sheet this config no longer produces`),
    });
  } catch (error) {
    const failure = error as NodeJS.ErrnoException;
    say.err(`cannot write ${failure.path ?? options.out}: ${failure.message}`);
    return 2;
  }
  if (result.written.length === 0 && result.removed.length === 0) say.out('no sheet changed');
  if (p.reports.length > 0) say.err(`${p.reports.length} report(s): arena check names them`);
  return 0;
}

export function run(argv: string[], io: Io, deps: () => WatchDeps = systemWatch): number | Promise<number> {
  const options = commandOptions('build', argv, io);
  if (typeof options === 'number') return options;
  const env = resolveEnvironment(io.environment);
  if (options.watch) return watchBuild(options, () => buildOnce(options, env, io), io, deps());
  return buildOnce(options, env, io);
}
