/* Holds the half of a document's fidelity a query can settle: a naming convention it asserts, a
 * command it tells a reader to run, the branch's own filename, and a counting snippet it hands
 * over. Each of the four had a live defect when this landed, and every one of them had stood with
 * every gate green, because the claim is prose and the subject is the tree. A convention is the
 * expensive one: `X.test.mjs` reads as a fact about the directory it sits in, so a migration that
 * renames every file leaves the sentence describing a tree that no longer exists, and a reader
 * looking for the file it names finds nothing and has no way to tell a stale document from their
 * own mistake. Documents under DATED_PROCESS_DOCUMENTS are out of scope, being deleted once
 * executed. */

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import nodePath, { join, dirname, basename } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { hostBinary } from '../../lib/arena/host-binary.ts';
import { relPosix, toPosix, type PathModule } from '../../utils/posix-path.ts';
import { readJson } from '../../utils/read-file.ts';
import { fencedLines } from '../../lib/arena/markdown-prose.ts';
import { SCRIPT_EXTENSIONS, SUITE_EXTENSIONS } from '../../lib/arena/domains.ts';
import { EXEMPT as DELIBERATELY_ABSENT } from './check-citations.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const SKIPPED_ANYWHERE = new Set(['node_modules', '.git']);
export const SKIPPED_UNDER_FRAMEWORKS = new Set(['dist', 'build', 'vendor']);

export const OUT_OF_SCOPE = new Map([
  ['docs/', 'a spec or a plan, which is deleted once executed, so a convention it names is a '
    + 'record of what the tree looked like while the work was in flight'],
]);

export const KNOWN_EXTENSIONS = [
  ...new Set([...SCRIPT_EXTENSIONS, ...SUITE_EXTENSIONS, '.tsx', '.jsx', '.js', '.md', '.json', '.css', '.html']),
];

export const BUILT_INFIX = '.generated.';

export const README_MEANS = new Map([
  ['.github/workflows/AGENTS.md', 'the root README.md, which routes to both branches and belongs '
    + 'to neither. It is named for its artifact list, which a release moves'],
  ['frameworks/PACKAGING.md', 'the README.md each package hands npm, which is what this document '
    + 'is about: it is authored as PACKAGE.md and copied into dist/ under the name npm expects'],
  ['frameworks/react/AGENTS.md', 'the same copy, named at the line where the layer says what the '
    + 'assembly does with its PACKAGE.md on the way into dist/'],
  ['frameworks/angular/AGENTS.md', 'the same copy, named for the same reason at the same point in '
    + 'the Angular layer\'s account of what the assembly emits'],
  ['scripts/check/arena/AGENTS.md', 'the file name check-agents.ts refuses on this branch, and the '
    + 'one check-packages.ts asserts a package ships'],
  ['versioning_steps.md', 'the root README.md, and it is named because that file is one of the '
    + 'surfaces a release moves: check-release.ts finds the plugin version in it by exact regex, '
    + 'so the heading and the label are part of what a release must not reword'],
]);

export type Claim = { rel: string; token: string; suffix: string };

export function skips(name: string, relativeDirectory: string) {
  if (SKIPPED_ANYWHERE.has(name)) return true;
  return SKIPPED_UNDER_FRAMEWORKS.has(name) && relativeDirectory.startsWith('frameworks');
}

export function outOfScope(rel: string) {
  return [...OUT_OF_SCOPE.keys()].some((prefix) => rel.startsWith(prefix));
}

export function treeFiles(base = root) {
  const posix = (path: string) => relPosix(base, path);
  return walkFiles(base, { skip: (name, path) => skips(name, posix(dirname(path))) })
    .map((path) => posix(path));
}

export function versionedFiles(base = root) {
  const git = hostBinary('git', 'to ask which files the tree versions, since a build product is '
    + 'present on one machine and absent on another and only git can tell the two apart');
  const { stdout } = spawnSync(git, ['ls-files', '--cached', '--others', '--exclude-standard'],
    { cwd: base, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return (stdout ?? '').split('\n').filter(Boolean);
}

export function documents(base = root, files = treeFiles(base)) {
  return files.filter((rel) => rel.endsWith('.md') && !outOfScope(rel));
}

export function insideAFence(text: string) {
  return new Set(fencedLines(text).map((one) => one.line));
}

export function unfenced(text: string) {
  const inside = insideAFence(text);
  return text.split('\n').filter((_, i) => !inside.has(i + 1)).join('\n');
}

export function fenced(text: string) {
  const inside = insideAFence(text);
  return text.split('\n').filter((_, i) => inside.has(i + 1)).join('\n');
}

export const METAVARIABLE = /(?<![\w/.-])(?:X|\*|<[A-Za-z][\w-]*>)((?:\.[A-Za-z0-9]+){1,3})(?![\w.])/g;
export const BARE_CONVENTION = /(?<![\w/*<>.-])((?:\.[a-z0-9]+){2,3})(?![\w.])/g;

export function isKnown(suffix: string) {
  return KNOWN_EXTENSIONS.some((ext) => suffix.endsWith(ext));
}

export function claimsIn(text: string, pattern: RegExp) {
  const found = new Set<string>();
  for (const match of unfenced(text).matchAll(pattern)) {
    const suffix = match[1] ?? '';
    if (isKnown(suffix) && !suffix.includes(BUILT_INFIX)) found.add(match[0]);
  }
  return [...found];
}

export function suffixOf(token: string) {
  const at = token.indexOf('.');
  return at === -1 ? token : token.slice(at);
}

export function holds(suffix: string, under: string, files: string[]) {
  const inside = under === '' ? files : files.filter((rel) => rel.startsWith(`${under}/`));
  return inside.some((rel) => basename(rel).endsWith(suffix));
}

export function conventionProblems(base = root, files = treeFiles(base), present = versionedFiles(base)) {
  const problems = [];
  for (const rel of documents(base, files)) {
    const text = readFileSync(join(base, rel), 'utf8');
    const tokens = [...claimsIn(text, METAVARIABLE), ...claimsIn(text, BARE_CONVENTION)];

    for (const token of tokens) {
      const suffix = suffixOf(token);
      if (holds(suffix, '', present)) continue;
      problems.push(
        `${rel}: states the convention ${token}, and no file in the tree ends ${suffix}. A `
        + 'convention names a shape a reader goes looking for, so one the tree stopped having '
        + 'sends them hunting for a file that is not there and gives them no way to tell a stale '
        + 'document from their own mistake. The question a document answers is which tree it '
        + 'describes, so the reach here is the whole one: a gate names the shape it reads and '
        + 'never the shape it sits beside.',
      );
    }
  }
  return problems;
}

export const BARE_FILENAME = /(?<![\w/.-])([A-Za-z][\w-]*(?:\.[A-Za-z0-9]+)+)(?![\w./-])/g;

const THE_CONSUMER_WRITES = 'a file in the reader\'s own project rather than in this tree. The '
  + 'package carries the language and never the skin, so what a consumer declares, and the shell '
  + 'they draw around Arena, are theirs and are named here as an example of one';

const THE_PACKAGE_SHIPS = 'a file the assembled package hands npm, which exists under dist/ after '
  + 'a build and in the consumer\'s node_modules, and never in the versioned tree. The npm page '
  + 'names it because that is where its reader meets it';

export const NAMED_BUT_NOT_HERE = new Map([
  ['arena.config.example.json', THE_PACKAGE_SHIPS],
  ['arena.css', THE_PACKAGE_SHIPS],
  ['arena-button.css', THE_PACKAGE_SHIPS],
  ['arena-stat-card.css', THE_PACKAGE_SHIPS],
  ['components.json', THE_PACKAGE_SHIPS],
  ['icons.json', THE_PACKAGE_SHIPS],
  ['UseDialogModal.js', THE_PACKAGE_SHIPS],
  ['ng-package.json', 'a file the Angular assembly stages under build/, which is git-ignored '
    + 'because it is written by the build rather than by a person'],
  ['tsconfig.lib.json', 'the same staging directory and the same reason'],
  ['index.html', THE_CONSUMER_WRITES],
  ['tsconfig.json', THE_CONSUMER_WRITES],
  ['next-env.d.ts', 'a file the reader\'s framework generates in their own project, named because '
    + 'the declaration it already carries is what saves them writing one'],
  ['Shell.tsx', THE_CONSUMER_WRITES],
  ['fullcalendar-overrides.css', THE_CONSUMER_WRITES],
]);

export function filenameProblems(
  base = root,
  files = treeFiles(base),
  present = versionedFiles(base),
  excused = NAMED_BUT_NOT_HERE,
) {
  const names = [...new Set([...present, ...DELIBERATELY_ABSENT.keys()].map((rel) => basename(rel)))];
  const carries = (token: string) => names.some((name) => name === token || name.endsWith(` ${token}`));
  const problems = [];
  const met = new Set<string>();

  for (const rel of documents(base, files)) {
    const text = unfenced(readFileSync(join(base, rel), 'utf8'));
    for (const match of new Set([...text.matchAll(BARE_FILENAME)].map((m) => m[1] ?? ''))) {
      if (!isKnown(suffixOf(match)) || carries(match)) continue;
      if (match.startsWith('X.') || match.includes(BUILT_INFIX)) continue;
      if (excused.has(match)) { met.add(match); continue; }
      problems.push(
        `${rel}: cites ${match} by its bare name, and no file in the tree is called that. A `
        + 'refactor rewrites a name in every import specifier and nowhere in a sentence, so a '
        + 'sibling cited this way is the citation that rots with every gate green. Cite it as a '
        + 'path, or record it in NAMED_BUT_NOT_HERE with whose file it is.',
      );
    }
  }

  for (const [name, why] of excused)
    if (!met.has(name))
      problems.push(
        `NAMED_BUT_NOT_HERE excuses ${name}, and no document names it any more: ${why}`,
      );

  return problems;
}

export const BUN_RUN = /\bbun run ([a-z][a-z0-9-]*(?::[a-z0-9-]+)*)(?![:\w-])/g;

export const COMMAND_BEARING = ['.ts', '.tsx', '.mjs', '.js'];

export const MODELS_A_FAILURE = new Map([
  ['scripts/check/arena/check-vocabulary.test.ts',
   'this gate\'s own suite, which has to name a script package.json does not declare in order to '
   + 'prove the gate reports one. It is the single file whose command strings are fixtures rather '
   + 'than instructions, and any other suite naming a missing script is naming one for real'],
]);

export function sources(base = root, files = treeFiles(base)) {
  return files.filter((rel) => COMMAND_BEARING.some((ext) => rel.endsWith(ext))
    && !outOfScope(rel) && !MODELS_A_FAILURE.has(rel));
}

export function fixtureProblems(base = root, files = treeFiles(base), excused = MODELS_A_FAILURE) {
  return [...excused].filter(([rel]) => !files.includes(rel)).map(([rel, why]) =>
    `MODELS_A_FAILURE names ${rel}, which is not in the tree, so the allowance outlived the `
    + `fixture it was written for: ${why}`);
}

export function commandProblems(base = root, files = treeFiles(base)) {
  const declared = new Set(Object.keys(readJson(join(base, 'package.json')).scripts ?? {}));
  const problems = [];
  for (const rel of [...documents(base, files), ...sources(base, files)]) {
    const text = readFileSync(join(base, rel), 'utf8');
    const named = new Set([...text.matchAll(BUN_RUN)].map((m) => m[1] ?? ''));
    for (const name of named) {
      if (declared.has(name)) continue;
      problems.push(
        `${rel}: names bun run ${name}, and package.json declares no such script, so the `
        + 'instruction answers "Script not found" to whoever follows it. A gate\'s failure '
        + 'message is read by somebody who has just been stopped, which is the worst moment to '
        + 'hand them a command that does not exist',
      );
    }
  }
  return problems;
}

export const README = /\bREADME\b/;

export function readmeProblems(base = root, files = treeFiles(base), allowed = README_MEANS) {
  const problems = [];
  const met = new Set<string>();
  for (const rel of documents(base, files)) {
    const text = readFileSync(join(base, rel), 'utf8');
    if (!README.test(text)) continue;
    if (allowed.has(rel)) { met.add(rel); continue; }
    problems.push(
      `${rel}: names a README. The contributor branch has one filename, AGENTS.md, and check:agents `
      + 'refuses the other, so a fact routed to a README on this branch is routed to a document '
      + 'nobody will find. If it means the page a package hands npm, name the file it is authored '
      + 'as and record this document in README_MEANS with which README it is.',
    );
  }
  for (const [rel, why] of allowed) {
    if (met.has(rel)) continue;
    problems.push(
      `README_MEANS names ${rel}, and it no longer says README. The allowance outlived what it was `
      + `written for: ${why}`,
    );
  }
  return problems;
}

export const FIND_COMMAND = /\bfind\s+([^\n|)]*)/g;
export const FIND_NAME = /-name\s+'([^']+)'/g;

export function rootsOf(argument: string) {
  return argument.split(/\s+-[a-z]/)[0] ?? '';
}

export function searchRoots(argument: string, rel: string, on: PathModule = nodePath) {
  const at = dirname(rel) === '.' ? '' : dirname(rel);
  return argument.trim().split(/\s+/).filter(Boolean).map((one) => {
    const literal = (one.split('$')[0] ?? '').replace(/\/+$/, '');
    if (literal === '') return null;
    if (literal.includes('/') || existsSync(join(root, literal))) return literal;
    return toPosix(on.join(at, literal), on);
  }).filter((one): one is string => one !== null);
}

export function snippetProblems(base = root, files = treeFiles(base), present = versionedFiles(base)) {
  const problems = [];
  for (const rel of documents(base, files)) {
    const text = fenced(readFileSync(join(base, rel), 'utf8'));
    for (const command of text.matchAll(FIND_COMMAND)) {
      const roots = searchRoots(rootsOf(command[1] ?? ''), rel);
      const patterns = [...(command[1] ?? '').matchAll(FIND_NAME)].map((m) => m[1] ?? '');
      for (const pattern of patterns) {
        const suffix = suffixOf(pattern.replace(/^\*/, ''));
        if (!isKnown(suffix) || suffix.includes(BUILT_INFIX)) continue;
        if (roots.some((under) => holds(suffix, under, present))) continue;
        problems.push(
          `${rel}: hands a reader a search for ${pattern} under ${roots.join(', ') || 'the tree'}, `
          + 'and it matches nothing there. A command that prints zero reads as an answer rather '
          + 'than as a broken query, which is worse than no command at all.',
        );
      }
    }
  }
  return problems;
}

export function zeroScanProblems(files: string[], docs: string[]) {
  const problems = [];
  if (files.length === 0)
    problems.push('walked 0 files, so every convention reads as unheld and every search as empty');
  if (docs.length === 0)
    problems.push('read 0 documents, which is a clean-looking pass over a tree it never opened');
  return problems;
}

export function vocabularyProblems(base = root) {
  const files = treeFiles(base);
  const present = versionedFiles(base);
  const docs = documents(base, files);
  return {
    problems: [
      ...zeroScanProblems(present, docs),
      ...conventionProblems(base, files, present),
      ...filenameProblems(base, files, present),
      ...commandProblems(base, files),
      ...fixtureProblems(base, files),
      ...readmeProblems(base, files),
      ...snippetProblems(base, files, present),
    ],
    scanned: docs.length,
  };
}

function main() {
  const { problems, scanned } = vocabularyProblems();
  if (problems.length > 0) {
    console.error(`check-vocabulary: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(
    `check-vocabulary: ${scanned} document(s) name a convention the tree holds, a command `
    + `package.json declares, ${README_MEANS.size} README(s) that are the npm page, and no search `
    + 'that finds nothing',
  );
}

if (isMainModule(import.meta.url)) main();
