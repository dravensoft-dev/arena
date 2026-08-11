/* Holds every .md to the repository paths it names, and to the bare document names too, that
 * second shape being the one a rename rewrites in every import specifier and in no sentence.
 * A match is judged only when it names a FILE, carrying an extension, since prose shortens a
 * path freely (`intro/Arena`) and a shortened one is not a claim; a leading slash is a URL
 * from a site root rather than a repo path; and a `.generated.` name is skipped, because a
 * fresh clone has none. The roots come from the tree, so a new top-level directory is covered the
 * day it lands, and finding none fails rather than reporting every path missing. EXEMPT carries
 * what is absent on purpose, and a stale entry fails. Use `<Name>` for a metavariable: an
 * `X.prompt.md` reads as a claim. The member half of a `path:member()` citation is held too,
 * since one naming the wrong file with the right member is confident and empty. */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { hostBinary } from '../../lib/arena/host-binary.ts';
import { basename, dirname, join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const SKIPPED_ANYWHERE = new Set(['node_modules', '.git']);

export const SKIPPED_UNDER_FRAMEWORKS = new Set(['dist', 'build', 'vendor']);

export function skips(name: string, relativeDirectory: string) {
  if (SKIPPED_ANYWHERE.has(name)) return true;
  return SKIPPED_UNDER_FRAMEWORKS.has(name) && relativeDirectory.startsWith('frameworks');
}

export const EXEMPT = new Map([
  ['frameworks/angular/BehaviourDelegated.json',
   'the file records a component one layer lacks, and every component exists in both layers, so '
   + 'it correctly does not exist. The prose that names it says so, and check:behaviour reads it '
   + 'only when present, which is what keeps the next absence loud.'],
]);

const EXTENSION = /\.[A-Za-z0-9]{1,6}$/;
const TRAILING_PUNCTUATION = /[.,;:)]+$/;

export function presentRoots(base = root) {
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !SKIPPED_ANYWHERE.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

export function ignoredRoots(base = root, names = presentRoots(base)) {
  if (names.length === 0) return new Set<string>();
  const git = hostBinary('git', 'to ask which top-level directories it ignores, so this gate reads '
    + 'the same tree on a clone as on the machine a scratch directory happens to sit');
  const asked = spawnSync(git, ['check-ignore', '--stdin'],
    { cwd: base, encoding: 'utf8', input: names.map((name) => `${name}/`).join('\n') });
  return new Set((asked.stdout ?? '').split('\n').filter(Boolean).map((line) => line.replace(/\/$/, '')));
}

export function repoRoots(base = root, ignored = ignoredRoots(base)) {
  return presentRoots(base).filter((name) => !ignored.has(name));
}

export function pathPattern(roots: string[]) {
  if (roots.length === 0) return /(?!)/g;
  const alternation = roots.map((name: string) => name.replace(/\./g, '\\.')).join('|');
  return new RegExp(
    `(?<![A-Za-z0-9._/-])(?:${alternation})\\/[A-Za-z0-9._-]+(?:\\/[A-Za-z0-9._-]+)*`,
    'g',
  );
}

const entrySkip = (base: string, ignored: Set<string>) => (name: string, path: string) => {
  const relativeDirectory = relPosix(base, dirname(path));
  if (relativeDirectory === '' && ignored.has(name)) return true;
  return skips(name, relativeDirectory);
};

export function documents(base = root, ignored = ignoredRoots(base)) {
  return walkFiles(base, { skip: entrySkip(base, ignored) }).filter((path) => path.endsWith('.md'));
}

export function namesAFile(cited: string) {
  return EXTENSION.test(cited);
}

export const BARE_DOCUMENT = /(?<![A-Za-z0-9._/-])[A-Za-z][A-Za-z0-9-]*(?:\.[a-z0-9-]+)*\.md\b/g;

export function basenames(base = root, ignored = ignoredRoots(base)) {
  return new Set(walkFiles(base, { skip: entrySkip(base, ignored) }).map((path) => basename(path)));
}

export function bareDocumentProblems(base = root, files = documents(base), names = basenames(base)) {
  const problems = [];
  for (const path of files) {
    const rel = relPosix(base, path);
    for (const [line, text] of readFileSync(path, 'utf8').split('\n').entries()) {
      for (const cited of text.match(BARE_DOCUMENT) ?? []) {
        if (names.has(cited)) continue;
        problems.push(
          `${rel}:${line + 1}: names ${cited}, and no document in the tree is called that. `
          + 'A sibling cited by its bare filename is the one shape a rename rewrites in every '
          + 'import specifier and in no sentence.',
        );
      }
    }
  }
  return problems;
}

export function citationProblems(base = root, files = documents(base), exempt = EXEMPT) {
  const pattern = pathPattern(repoRoots(base));
  const problems = [];
  const met = new Set();
  for (const path of files) {
    const rel = relPosix(base, path);
    for (const [line, text] of readFileSync(path, 'utf8').split('\n').entries()) {
      for (const raw of text.match(pattern) ?? []) {
        const cited = raw.replace(TRAILING_PUNCTUATION, '');
        if (!namesAFile(cited)) continue;
        if (exempt.has(cited)) { met.add(cited); continue; }
        if (cited.includes('.generated.')) continue;
        if (existsSync(join(base, cited))) continue;
        problems.push(`${rel}:${line + 1}: cites ${cited}, and nothing is there`);
      }
    }
  }
  for (const [cited, reason] of exempt) {
    if (met.has(cited)) continue;
    problems.push(
      `EXEMPT names ${cited}, which no document cites any more, so the allowance outlived the `
      + `case it was written for: ${reason}`,
    );
  }
  return problems;
}

export const MEMBER_CITATION = /(?<![A-Za-z0-9._/-])([A-Za-z0-9._/-]+\.[a-z]{2,4}):([A-Za-z_$][\w$]*)\(/g;

export const SOURCE_SUFFIX = /\.(?:ts|tsx|mjs|js|jsx)$/;

export function memberProblems(base = root, files = documents(base)) {
  const problems = [];
  for (const path of files) {
    const rel = relPosix(base, path);
    for (const [line, text] of readFileSync(path, 'utf8').split('\n').entries()) {
      for (const [, cited, member] of text.matchAll(MEMBER_CITATION)) {
        if (!cited || !member || !SOURCE_SUFFIX.test(cited)) continue;
        if (cited.includes('.generated.')) continue;
        const resolved = [cited, join(dirname(rel), cited)]
          .map((candidate) => join(base, candidate))
          .find((candidate) => existsSync(candidate));
        if (!resolved) continue;
        const source = readFileSync(resolved, 'utf8');
        if (new RegExp(`\\b${member}\\b`).test(source)) continue;
        problems.push(
          `${rel}:${line + 1}: cites ${cited}:${member}(), and that file declares no ${member}. `
          + 'The member half of a citation is the half that carries the address, so one naming a '
          + 'file it does not live in sends a reader to the wrong file with the right confidence.',
        );
      }
    }
  }
  return problems;
}

export function ignoredCitationProblems(base = root, files = documents(base), ignored = ignoredRoots(base)) {
  const names = [...ignored].filter((name) => !SKIPPED_ANYWHERE.has(name));
  if (names.length === 0) return [];
  const pattern = pathPattern(names);
  const problems = [];

  for (const path of files) {
    const rel = relPosix(base, path);
    for (const [line, text] of readFileSync(path, 'utf8').split('\n').entries()) {
      for (const raw of text.match(pattern) ?? []) {
        const cited = raw.replace(TRAILING_PUNCTUATION, '');
        if (!namesAFile(cited)) continue;
        problems.push(`${rel}:${line + 1}: cites ${cited}, which git ignores, so no clone can `
          + 'follow it. The path exists here and nowhere else, which is the one failure this gate '
          + 'cannot otherwise see: an ignored root is not in the alternation at all, so the '
          + 'citation passes for the wrong reason.');
      }
    }
  }
  return problems;
}

export function zeroDocumentProblems(files: string[]) {
  return files.length === 0
    ? ['found 0 documents; an empty result set is a failure, not a clean pass, because a walk that '
       + 'reaches nothing reports every path in the tree as valid']
    : [];
}

export function zeroRootProblems(roots: string[]) {
  return roots.length === 0
    ? ['found 0 top-level directories, so nothing would be recognised as a repository path at all. '
       + 'An empty root list fails the other way from an empty document list: the pattern it builds '
       + 'matches every absolute path and reports each one missing']
    : [];
}

function main() {
  const files = documents();
  const problems = [
    ...zeroRootProblems(repoRoots()),
    ...ignoredCitationProblems(),
    ...zeroDocumentProblems(files),
    ...citationProblems(root, files),
    ...bareDocumentProblems(root, files),
    ...memberProblems(root, files),
  ];
  if (problems.length > 0) {
    console.error(`check-citations: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(
    `check-citations: ${files.length} document(s) cite only paths that exist, `
    + `across ${repoRoots().length} top-level directories, with ${EXEMPT.size} deliberate absence(s) on the record`,
  );
}

if (isMainModule(import.meta.url)) main();
