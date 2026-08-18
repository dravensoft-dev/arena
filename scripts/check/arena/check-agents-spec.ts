/* The contributor branch against the AGENTS.md convention, which fixes three things and no more: a
 * file at the root, plain Markdown with no required field and no schema, and a command an agent
 * will run because the page listed it. The convention publishes no validator, so this gate is the
 * whole of what holds Arena to it, and the tree the convention resolves by proximity is what
 * check-agents.ts holds instead. The commands are derived from package.json rather than listed
 * here, since a script with no colon in its name is an entry point and one with a colon narrows a
 * phase; whether a name a document spells is a script at all is check-vocabulary.ts:BUN_RUN, and
 * is not asked twice. DEPARTURES carries what Arena does differently with the reason it does, and
 * an entry the tree no longer departs on fails as one that outlived what it was written for. */

import { readFileSync, existsSync, lstatSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { hostBinary } from '../../lib/arena/host-binary.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { FRONTMATTER } from '../../lib/arena/llms-index.ts';
import { BUN_RUN } from './check-vocabulary.ts';

export const ROOT = 'AGENTS.md';
export const CONVENTION = 'https://agents.md';
export const COMPANION = 'CLAUDE.md';

export const DEPARTURES = new Map<string, string>([
  [COMPANION,
   'the convention migrates a harness-specific page by renaming it and leaving a symlink, and a '
   + 'symlink here would answer a builder with the contributor branch. Arena is two branches and '
   + `${COMPANION} is the only file a harness loading one name and nothing else reads, so it `
   + 'carries the choice between them and no rule of its own.'],
]);

export function trackedPages(base = root) {
  const git = hostBinary('git', 'to read what the tree tracks, since a page outside the index '
    + 'reaches no clone and a page inside one reaches every reader of the tag');
  const { stdout } = spawnSync(git, ['ls-files'], { cwd: base, encoding: 'utf8' });
  return (stdout ?? '').split('\n').filter((path) => basename(path) === ROOT).sort();
}

export function entryPoints(scripts: Record<string, string>) {
  return Object.keys(scripts).filter((name) => !name.includes(':')).sort();
}

export function zeroPageProblems(paths: string[]) {
  return paths.length === 0
    ? [`found 0 file(s) named ${ROOT} in the index, and an empty result set reports every rule `
       + 'below satisfied over a tree it never opened']
    : [];
}

export function zeroEntryProblems(entries: string[]) {
  return entries.length === 0
    ? ['found 0 entry point(s) in package.json, so the rule that the root page names each of them '
       + 'passes by naming nothing']
    : [];
}

export function rootProblems(paths: string[]) {
  return paths.includes(ROOT)
    ? []
    : [`no ${ROOT} at the repository root, which is the one placement ${CONVENTION} requires: an `
       + 'agent starting anywhere walks up to it, and a tree without it hands every reader whatever '
       + 'page happens to be nearest'];
}

export function frontmatterProblems(path: string, text: string) {
  return FRONTMATTER.test(text)
    ? [`${path}: opens with frontmatter, which is the shape of a skill and not of this branch. `
       + `${CONVENTION} fixes no field at all, so a reader gets a block nothing parses and a page `
       + 'whose first lines say nothing to it']
    : [];
}

export function commandProblems(text: string, scripts: Record<string, string>) {
  const named = [...text.matchAll(BUN_RUN)].map((match) => match[1] ?? '');
  return entryPoints(scripts)
    .filter((entry) => !named.includes(entry))
    .map((entry) => `${ROOT} names no \`bun run ${entry}\`, and ${CONVENTION} says an agent runs `
      + 'the commands a page lists and finds only what is listed. An entry point the root page '
      + 'never names is one nobody is asked to run, so the tree is changed and never exercised.');
}

export function madeDepartures(base = root) {
  const companion = join(base, COMPANION);
  return existsSync(companion) && !lstatSync(companion).isSymbolicLink() ? [COMPANION] : [];
}

export function undeclaredDepartureProblems(made: string[]) {
  return made
    .filter((name) => !DEPARTURES.has(name))
    .map((name) => `${name} departs from ${CONVENTION} and DEPARTURES declares no reason for it. A `
      + 'departure nobody recorded is one the next reader repairs.');
}

export function staleDepartureProblems(made: string[]) {
  return [...DEPARTURES]
    .filter(([name]) => !made.includes(name))
    .map(([name, reason]) => `DEPARTURES declares ${name}, which the tree no longer departs on, so `
      + `the departure outlived what it was written for: ${reason}`);
}

export function collect(base = root, paths = trackedPages(base)) {
  const zero = [...zeroPageProblems(paths), ...rootProblems(paths)];
  if (zero.length > 0) return zero;
  const scripts = readJson(join(base, 'package.json')).scripts ?? {};
  const entries = zeroEntryProblems(entryPoints(scripts));
  if (entries.length > 0) return entries;
  const made = madeDepartures(base);
  return [
    ...paths.flatMap((path) => frontmatterProblems(path, readFileSync(join(base, path), 'utf8'))),
    ...commandProblems(readFileSync(join(base, ROOT), 'utf8'), scripts),
    ...undeclaredDepartureProblems(made),
    ...staleDepartureProblems(made),
  ];
}

function main() {
  const paths = trackedPages();
  const problems = collect(root, paths);
  if (problems.length > 0) {
    console.error(`check-agents-spec: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`check-agents-spec: ${paths.length} page(s) on the contributor branch answer `
    + `${CONVENTION} with ${DEPARTURES.size} declared departure(s)`);
}

if (isMainModule(import.meta.url)) main();
