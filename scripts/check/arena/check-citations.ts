/* Holds every prose passage in the tree to the paths it names, to the bare document names too,
 * and to the member half of a `path:member()` citation, which is the half that goes wrong
 * quietly. Three surfaces carry prose: a line of a .md, a prose value in a .json, and the one
 * header comment scripts and tests are allowed; a member doc under a component directory is
 * covered at the contract check:api keeps it equal to. A match is judged only when it names a
 * FILE, since prose shortens a path freely and a shortened one is not a claim, a leading slash
 * is a URL from a site root, and a `.generated.` name is skipped because a fresh clone has none.
 * The roots come from the tree, and finding none fails rather than reporting every path missing.
 * EXEMPT carries a path absent on purpose, BARE_EXEMPT a name that is not a document at all, and
 * a stale entry of either fails. Write a metavariable as <Name>: a concrete one reads as a claim. */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { hostBinary } from '../../lib/arena/host-binary.ts';
import { basename, dirname, join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { findComments } from '../../lib/arena/comments.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { allowsHeader } from './check-docs.ts';
import { strands } from './check-contracts-neutrality.ts';

export const SKIPPED_ANYWHERE = new Set(['node_modules', '.git', '.claude']);

export const SKIPPED_UNDER_FRAMEWORKS = new Set(['dist', 'build', 'vendor']);

export function skips(name: string, relativeDirectory: string) {
  if (SKIPPED_ANYWHERE.has(name)) return true;
  return SKIPPED_UNDER_FRAMEWORKS.has(name) && relativeDirectory.startsWith('frameworks');
}

export const EXEMPT = new Map([
  ['skills/arena/SKILL.md',
   'the discovery stub, which exists at that path inside each PUBLISHED package and nowhere in '
   + 'this tree. It is emitted by the package assembly rather than tracked, because a tracked one '
   + 'would be a second file under the reserved name and check:skill-spec fails on exactly that. '
   + 'Its presence in both packages is check:packages\' claim, over the assembled directory.'],
  ['frameworks/angular/BehaviourDelegated.json',
   'the file records a component one layer lacks, and every component exists in both layers, so '
   + 'it correctly does not exist. The prose that names it says so, and check:behaviour reads it '
   + 'only when present, which is what keeps the next absence loud.'],
]);

export const BARE_EXEMPT = new Map([
  ['r.md',
   'the medium step of the radius scale, which a role description names beside r.lg. A scale step '
   + 'is a value a component reads and never a page anybody opens, and the collision is only that '
   + 'a step spelled for a size is spelled the way a document extension is.'],
]);

const EXTENSION = /\.[A-Za-z0-9]{1,6}$/;
const TRAILING_PUNCTUATION = /[.,;:)]+$/;

export const GENERATED_INFIX = '.generated.';

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

export function records(base = root, ignored = ignoredRoots(base)) {
  return walkFiles(base, { skip: entrySkip(base, ignored) })
    .filter((path) => path.endsWith('.json') && !path.includes(GENERATED_INFIX));
}

export const HEADED_SUFFIX = /\.(?:ts|tsx|mjs|js|jsx)$/;

export function headed(base = root, ignored = ignoredRoots(base)) {
  return walkFiles(base, { skip: entrySkip(base, ignored) })
    .filter((path) => HEADED_SUFFIX.test(path)
      && !path.includes(GENERATED_INFIX)
      && allowsHeader(relPosix(base, path)));
}

export type Passage = { rel: string; at: string; text: string };

export function documentPassages(base = root, files = documents(base)): Passage[] {
  return files.flatMap((path) => {
    const rel = relPosix(base, path);
    return readFileSync(path, 'utf8').split('\n')
      .map((text, index) => ({ rel, at: String(index + 1), text }));
  });
}

export function parsedRecord(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

export function recordPassages(base = root, files = records(base)): Passage[] {
  return files.flatMap((path) => {
    const rel = relPosix(base, path);
    const tree = parsedRecord(path);
    if (tree === undefined) return [];
    return strands(rel, tree)
      .filter((strand) => strand.prose)
      .map((strand) => ({ rel, at: strand.path, text: strand.text }));
  });
}

export function headerPassages(base = root, files = headed(base)): Passage[] {
  return files.flatMap((path) => {
    const rel = relPosix(base, path);
    return findComments(readFileSync(path, 'utf8')).flatMap((comment) => comment.text.split('\n')
      .map((text, index) => ({ rel, at: String(comment.line + index), text })));
  });
}

export function passages(base = root, ignored = ignoredRoots(base)): Passage[] {
  return [
    ...documentPassages(base, documents(base, ignored)),
    ...recordPassages(base, records(base, ignored)),
    ...headerPassages(base, headed(base, ignored)),
  ];
}

export function namesAFile(cited: string) {
  return EXTENSION.test(cited);
}

export const BARE_DOCUMENT = /(?<![A-Za-z0-9._/-])[A-Za-z][A-Za-z0-9-]*(?:\.[a-z0-9-]+)*\.md\b/g;

export function basenames(base = root, ignored = ignoredRoots(base)) {
  return new Set(walkFiles(base, { skip: entrySkip(base, ignored) }).map((path) => basename(path)));
}

export function unreadableRecordProblems(base = root, files = records(base)) {
  return files
    .filter((path) => parsedRecord(path) === undefined)
    .map((path) => `${relPosix(base, path)}: is not readable as JSON, so its prose contributes no `
      + 'passage at all. A file this gate cannot open is a hole in the walk rather than a document '
      + 'with nothing to say.');
}

export function bareDocumentProblems(
  base = root,
  texts = passages(base),
  names = basenames(base),
  exempt = BARE_EXEMPT,
) {
  const problems = [];
  const met = new Set();
  for (const { rel, at, text } of texts) {
    for (const cited of text.match(BARE_DOCUMENT) ?? []) {
      if (names.has(cited)) continue;
      if (exempt.has(cited)) { met.add(cited); continue; }
      problems.push(
        `${rel}:${at}: names ${cited}, and no document in the tree is called that. `
        + 'A sibling cited by its bare filename is the one shape a rename rewrites in every '
        + 'import specifier and in no sentence.',
      );
    }
  }
  for (const [cited, reason] of exempt) {
    if (met.has(cited)) continue;
    problems.push(
      `BARE_EXEMPT names ${cited}, which no prose in the tree names any more, so the allowance `
      + `outlived the case it was written for: ${reason}`,
    );
  }
  return problems;
}

export function citationProblems(base = root, texts = passages(base), exempt = EXEMPT) {
  const pattern = pathPattern(repoRoots(base));
  const problems = [];
  const met = new Set();
  for (const { rel, at, text } of texts) {
    for (const raw of text.match(pattern) ?? []) {
      const cited = raw.replace(TRAILING_PUNCTUATION, '');
      if (!namesAFile(cited)) continue;
      if (exempt.has(cited)) { met.add(cited); continue; }
      if (cited.includes(GENERATED_INFIX)) continue;
      if (existsSync(join(base, cited))) continue;
      problems.push(`${rel}:${at}: cites ${cited}, and nothing is there`);
    }
  }
  for (const [cited, reason] of exempt) {
    if (met.has(cited)) continue;
    problems.push(
      `EXEMPT names ${cited}, which no prose in the tree cites any more, so the allowance outlived `
      + `the case it was written for: ${reason}`,
    );
  }
  return problems;
}

export const MEMBER_CITATION = /(?<![A-Za-z0-9._/-])([A-Za-z0-9._/-]+\.[a-z]{2,4}):([A-Za-z_$][\w$]*)\(/g;

export const SOURCE_SUFFIX = /\.(?:ts|tsx|mjs|js|jsx)$/;

export function memberProblems(base = root, texts = passages(base)) {
  const problems = [];
  for (const { rel, at, text } of texts) {
    for (const [, cited, member] of text.matchAll(MEMBER_CITATION)) {
      if (!cited || !member || !SOURCE_SUFFIX.test(cited)) continue;
      if (cited.includes(GENERATED_INFIX)) continue;
      const resolved = [cited, join(dirname(rel), cited)]
        .map((candidate) => join(base, candidate))
        .find((candidate) => existsSync(candidate));
      if (!resolved) continue;
      const source = readFileSync(resolved, 'utf8');
      if (new RegExp(`\\b${member}\\b`).test(source)) continue;
      problems.push(
        `${rel}:${at}: cites ${cited}:${member}(), and that file declares no ${member}. `
        + 'The member half of a citation is the half that carries the address, so one naming a '
        + 'file it does not live in sends a reader to the wrong file with the right confidence.',
      );
    }
  }
  return problems;
}

export function ignoredCitationProblems(base = root, texts = passages(base), ignored = ignoredRoots(base)) {
  const names = [...ignored].filter((name) => !SKIPPED_ANYWHERE.has(name));
  if (names.length === 0) return [];
  const pattern = pathPattern(names);
  const problems = [];

  for (const { rel, at, text } of texts) {
    for (const raw of text.match(pattern) ?? []) {
      const cited = raw.replace(TRAILING_PUNCTUATION, '');
      if (!namesAFile(cited)) continue;
      problems.push(`${rel}:${at}: cites ${cited}, which git ignores, so no clone can `
        + 'follow it. The path exists here and nowhere else, which is the one failure this gate '
        + 'cannot otherwise see: an ignored root is not in the alternation at all, so the '
        + 'citation passes for the wrong reason.');
    }
  }
  return problems;
}

export const SURFACE_EMPTINESS = new Map([
  ['document', 'every path in the tree would be reported valid, because nothing would be read to '
    + 'contradict it'],
  ['record', 'a path named inside a type description or a behaviour reason would be held by '
    + 'nothing, which is the reach this gate was short by'],
  ['header', 'a path named in the one comment a script or a suite is allowed would be held by '
    + 'nothing, and that comment is where a measurement and a cross-reference are kept'],
]);

export function zeroSurfaceProblems(counts: Record<string, number>) {
  return [...SURFACE_EMPTINESS]
    .filter(([surface]) => (counts[surface] ?? 0) === 0)
    .map(([surface, cost]) => `found 0 ${surface}(s); an empty surface is a failure, not a clean `
      + `pass: ${cost}`);
}

export function zeroRootProblems(roots: string[]) {
  return roots.length === 0
    ? ['found 0 top-level directories, so nothing would be recognised as a repository path at all. '
       + 'An empty root list fails the other way from an empty document list: the pattern it builds '
       + 'matches every absolute path and reports each one missing']
    : [];
}

function main() {
  const ignored = ignoredRoots();
  const counts = {
    document: documents(root, ignored).length,
    record: records(root, ignored).length,
    header: headed(root, ignored).length,
  };
  const texts = passages(root, ignored);
  const problems = [
    ...zeroRootProblems(repoRoots(root, ignored)),
    ...ignoredCitationProblems(root, texts, ignored),
    ...zeroSurfaceProblems(counts),
    ...unreadableRecordProblems(root, records(root, ignored)),
    ...citationProblems(root, texts),
    ...bareDocumentProblems(root, texts),
    ...memberProblems(root, texts),
  ];
  if (problems.length > 0) {
    console.error(`check-citations: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(
    `check-citations: ${counts.document} document(s), ${counts.record} record(s) and `
    + `${counts.header} header(s) cite only paths that exist, across `
    + `${repoRoots(root, ignored).length} top-level directories, with ${EXEMPT.size} deliberate `
    + `absence(s) and ${BARE_EXEMPT.size} name(s) that are not documents on the record`,
  );
}

if (isMainModule(import.meta.url)) main();
