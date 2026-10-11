/* Spawning tsc over a tsconfig, for the gates that do it: check:react-types over
 * the React layer and check:script-types over the tooling itself. It sits in lib/
 * because a gate importing another domain's gate would make the domain grid a lie,
 * and lib/ is the one direction always allowed. Placed in arena/ by the vocabulary
 * rule: tsc and tsconfig belong to no single layer. check:angular keeps its own
 * runner, because ngc is another compiler. One spawn answers both questions a gate asks:
 * `--listFiles` prints the files the program read after the diagnostics, so a gate can prove
 * its project matched something without building the program twice, and a line the listing
 * cannot place is an error rather than a file or a diagnostic. tsc runs through
 * spawnForwarding, so an interrupt of the gate ends it too, and its output is read from a file. */

import { existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot } from './repo-root.ts';
import { endIfInterrupted, spawnForwarding } from './spawn-forwarding.ts';
import { cachedReadingAsync } from './artifact-cache.ts';
import { deadline, type Deadline } from './deadline.ts';

export const TSC_SPAWN: Deadline = deadline('typecheck:spawn', 30_000,
  'spawning tsc over a project is not a five-second operation by nature and this measured '
  + '4527ms warm on a machine with nothing else on it, so a shared runner is a coin toss at '
  + 'the default');

type TypecheckOptions = { root?: string; project?: string };

export function tscBin(root = repoRoot) {
  const bin = join(root, 'node_modules/typescript/lib/tsc.js');
  if (!existsSync(bin))
    throw new Error(`typescript is not installed at ${bin}; run \`bun install\` before a typecheck gate`);
  return bin;
}

async function runTsc(args: string[], root: string) {
  const r = await spawnForwarding(process.execPath, [tscBin(root), ...args], { capture: true });
  endIfInterrupted('typecheck', r);
  if (r.error) throw new Error(`tsc failed to spawn: ${r.error.message || r.error}`);
  if (r.signal) throw new Error(`tsc ended on ${r.signal}, which nothing here sent\n${r.output.trim()}`);
  return { status: r.status ?? 1, output: r.output };
}

export const LISTED = /\.(d\.[cm]?ts|[cm]?[jt]sx?|json)$/;

export function splitListing(output: string, project: string) {
  const lines = output.split('\n').map((line) => line.replace(/\r$/, ''));
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') lines.pop();
  const first = lines.findIndex((line) => isAbsolute(line) && LISTED.test(line));
  if (first === -1) {
    throw new Error(`tsc could not read ${project}: it listed no file it read\n${output.trim()}`);
  }
  const files = lines.slice(first);
  const stray = files.find((line) => !isAbsolute(line) || !LISTED.test(line));
  if (stray !== undefined) {
    throw new Error(`tsc printed ${JSON.stringify(stray)} among the files it read for ${project}, which is `
      + 'neither a file nor a diagnostic printed before them, so the listing cannot be read');
  }
  return { files, diagnostics: lines.slice(0, first).join('\n') };
}

export async function compileListing(opts: TypecheckOptions = {}) {
  const root = opts.root ?? repoRoot;
  if (!opts.project) throw new Error('compileListing: no project given, and checking nothing reports nothing wrong');
  const { status, output } = await runTsc(['--noEmit', '--listFiles', '--pretty', 'false', '-p', join(root, opts.project)], root);
  return { status, ...splitListing(output, opts.project) };
}

export type Verdict = { reach: string[]; status: number; output: string };

export async function verdictFor(project: string, candidates: string[], root = repoRoot): Promise<Verdict> {
  if (candidates.length === 0) {
    throw new Error(`verdictFor: ${project} was handed 0 candidate(s). The reach an entry carries `
      + 'covers what the compiler read LAST time, so the candidates are the only thing that notices '
      + 'a file arriving; with none, a new source would join the project and the held verdict would '
      + 'answer for a tree it never saw');
  }
  return cachedReadingAsync<Verdict>(`typecheck-${project}`, [project, ...candidates], async () => {
    const { status, files, diagnostics } = await compileListing({ project, root });
    const reach = files.map((path) => relPosix(root, path));
    return { value: { reach, status, output: diagnostics }, read: reach, keep: status === 0 };
  }, root);
}

export function zeroProjectProblems(count: number) {
  if (count > 0) return [];
  return ['found 0 projects to typecheck; a gate that compiles nothing reports clean by construction'];
}
