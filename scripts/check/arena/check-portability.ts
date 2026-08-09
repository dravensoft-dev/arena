/* No script assumes one operating system. Every rule is a BAN with a named owner, never a
 * judgement about whether a construct is correct, which is what keeps the false-positive rate
 * zero: it does not ask whether spawning a bare name is wise, it asks where that may live. A
 * stale owner fails too, so an exception cannot outlive its argument. The subject is scripts and
 * not suites -- a suite naming win32 and a C: path is doing its job, and the win32 branches are
 * covered from Linux because it does. Matches go through the lexer check:docs uses, so a
 * construct named in a comment or a string is described rather than performed, except for the
 * two whose construct IS a string, which declare that themselves because skipping literals there
 * would skip the rule. It also holds the matrix in portability.yml equal to the declared OS
 * list, a rule living only in YAML being a rule nothing tests. */

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { toPosix } from '../../utils/posix-path.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { findComments, insideLiteral, literalRanges } from '../../lib/arena/comments.ts';
import { isScript, isSuite } from '../../lib/arena/domains.ts';
import { SUPPORTED_OS_NAMES } from '../../ci/arena/supported-os.ts';

export const node = {
  name: 'check:portability',
  reads: ['scripts/**', '.github/workflows/**'],
  writes: [],
  feeds: [],
};

export const WORKFLOWS = '.github/workflows';

export type Rule = {
  id: string;
  pattern: RegExp;
  owners: string[];
  why: string;
  written?: 'as a string';
};

export const RULES: Rule[] = [
  {
    id: 'platform-branch',
    pattern: /process\.platform|\bos\.platform\(\)|\bplatform\(\)\s*===/g,
    owners: ['scripts/lib/arena/platform.ts'],
    why: 'a platform branch lives in one module, and everywhere else takes the answer as a '
      + 'parameter, which is what makes a branch written for Windows testable from Linux',
  },
  {
    id: 'absolute-os-path',
    pattern: /(?:'|")(?:\/usr\/|\/opt\/|\/snap\/|\/Applications\/|\/Library\/|\/mnt\/[a-z]\/|[A-Za-z]:\\\\)/g,
    owners: ['scripts/lib/arena/chromium.ts'],
    why: 'an absolute path names one operating system, and the only list of them Arena keeps is '
      + 'the browser candidate table, which is keyed by platform and says so',
    written: 'as a string',
  },
  {
    id: 'bare-name-spawn',
    pattern: /\b(?:spawnSync|spawn|execFileSync|execFile|execSync|exec)\(\s*(?:'|")[^'"/\\]+(?:'|")/g,
    owners: ['scripts/lib/arena/host-binary.ts'],
    why: 'a binary is spawned by resolved path: there is no git on Windows, there is git.exe, '
      + 'and which suffixes count is PATHEXT answer rather than node one',
  },
  {
    id: 'dot-bin-shim',
    pattern: /node_modules[/\\]\.bin/g,
    owners: ['scripts/lib/arena/node-bin.ts'],
    why: 'that directory holds an extensionless shell script on POSIX and a .CMD plus a .ps1 on '
      + 'Windows, so the entry comes from the dependency package.json instead',
    written: 'as a string',
  },
  {
    id: 'process-group-signal',
    pattern: /detached\s*:|process\.kill\(\s*-|SIGKILL|taskkill/g,
    owners: ['scripts/lib/arena/chromium.ts'],
    why: 'a process group is a POSIX idea and a negative pid means nothing on Windows, so the one '
      + 'place that reaps a tree is the one that launched it',
  },
  {
    id: 'raw-symlink',
    pattern: /\bsymlinkSync\s*\(/g,
    owners: ['scripts/lib/arena/platform.ts'],
    why: 'a directory symlink needs Developer Mode or elevation on Windows and a junction needs '
      + 'neither, so linkDir is what decides which one this is',
  },
  {
    id: 'locale-ordering',
    pattern: /localeCompare|Intl\.Collator|toLocale(?:Upper|Lower)Case/g,
    owners: [],
    why: 'ordering that reaches a file is by code unit: localeCompare puts a before B under en-US '
      + 'and after it by code unit, so a generator emits two different files on two machines',
  },
  {
    id: 'second-separator-spelling',
    pattern: /split\(\s*'\\\\'\s*\)|replace\(\s*\/\\\\\/g/g,
    owners: ['scripts/utils/posix-path.ts'],
    why: 'toPosix is the one spelling of a separator conversion, and a second one is a second '
      + 'decision the day either is fixed',
  },
  {
    id: 'prefix-containment',
    pattern: /startsWith\([^)]*\+\s*(?:'|"|`)[/\\]/g,
    owners: ['scripts/utils/posix-path.ts'],
    why: 'whether a path is under another is isInside, asked through relative: a string prefix is '
      + 'fail-open without a separator boundary and fail-closed with a hardcoded one',
  },
];

export function inScope(path: string) {
  const rel = toPosix(relative(root, path));
  if (!rel.startsWith('scripts/')) return false;
  const name = rel.slice(rel.lastIndexOf('/') + 1);
  return isScript(name) && !isSuite(name);
}

export function scriptFiles(base = root) {
  return walkFiles(join(base, 'scripts')).filter(inScope);
}

export function commentRanges(source: string): [number, number][] {
  const ranges: [number, number][] = [];
  let at = 0;
  for (const comment of findComments(source)) {
    const from = source.indexOf(comment.text, at);
    if (from === -1) continue;
    ranges.push([from, from + comment.text.length]);
    at = from + comment.text.length;
  }
  return ranges;
}

export function violations(rel: string, source: string, rules = RULES) {
  const literals = literalRanges(source);
  const comments = commentRanges(source);
  const found: { rule: Rule; line: number; text: string }[] = [];

  for (const rule of rules) {
    const owned = rule.owners.includes(rel);
    for (const match of source.matchAll(new RegExp(rule.pattern.source, 'g'))) {
      const at = match.index ?? 0;
      if (insideLiteral(comments, at)) continue;
      if (!rule.written && insideLiteral(literals, at)) continue;
      if (owned) continue;
      found.push({ rule, line: source.slice(0, at).split('\n').length, text: match[0] });
    }
  }
  return found;
}

export function staleOwners(files: string[], base = root, rules = RULES) {
  const present = new Set(files.map((file) => toPosix(relative(base, file))));
  return rules.flatMap((rule) => rule.owners
    .filter((owner) => !present.has(owner))
    .map((owner) => `${rule.id} names ${owner} as its owner, and no script in scope is there. `
      + 'An exception cannot outlive the thing it was written for.'));
}

export function matrixProblems(base = root, supported = SUPPORTED_OS_NAMES) {
  const path = join(base, WORKFLOWS, 'portability.yml');
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return [`${WORKFLOWS}/portability.yml is missing, so nothing runs on a second operating system`];
  }
  const matched = /os:\s*\[([^\]]+)\]/.exec(text);
  if (!matched) return [`${WORKFLOWS}/portability.yml declares no os matrix`];

  const legs = (matched[1] ?? '').split(',').map((one) => one.trim()).filter(Boolean);
  const missing = supported.filter((one) => !legs.includes(one));
  const extra = legs.filter((one) => !supported.includes(one));
  return [
    ...missing.map((one) => `supported-os.ts names ${one} and the matrix does not run it`),
    ...extra.map((one) => `the matrix runs ${one} and supported-os.ts does not name it, so nothing `
      + 'says what that leg buys'),
  ];
}

export function browserPathProblems(base = root) {
  const dir = join(base, WORKFLOWS);
  const naming = walkFiles(dir)
    .filter((file) => file.endsWith('.yml'))
    .filter((file) => /^\s*CHROME_PATH:/m.test(readFileSync(file, 'utf8')))
    .map((file) => toPosix(relative(base, file)));

  if (naming.length === 1) return [];
  if (naming.length === 0) {
    return ['no workflow names CHROME_PATH, so nothing exercises the terminal-override branch'];
  }
  return [`${naming.join(', ')} all name CHROME_PATH. Exporting it everywhere is what made the `
    + 'candidate list unreachable, so exactly one workflow names a browser and the rest prove '
    + 'discovery finds one.'];
}

export function portabilityProblems(base = root) {
  const files = scriptFiles(base);
  const problems: string[] = [];

  for (const file of files) {
    const rel = toPosix(relative(base, file));
    for (const { rule, line, text } of violations(rel, readFileSync(file, 'utf8'))) {
      const owner = rule.owners.length === 0 ? 'nowhere' : rule.owners.join(' or ');
      problems.push(`${rel}:${line}: ${JSON.stringify(text)} breaks ${rule.id}, which lives in `
        + `${owner}. ${rule.why}.`);
    }
  }

  problems.push(...staleOwners(files, base));
  problems.push(...matrixProblems(base));
  problems.push(...browserPathProblems(base));

  return { problems, scanned: files.length, rules: RULES.length };
}

function main() {
  const { problems, scanned, rules } = portabilityProblems();

  if (scanned === 0) {
    console.error('check-portability: scanned 0 script(s); the tree moved under this gate');
    process.exit(1);
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`check-portability: ${problem}`);
    console.error(`\ncheck-portability: ${problems.length} problem(s)`);
    process.exit(1);
  }

  console.log(`check-portability: ${scanned} script(s) hold to ${rules} rule(s), every exception `
    + `names a module that is there, and the matrix runs exactly ${SUPPORTED_OS_NAMES.length} `
    + 'declared operating system(s)');
}

if (isMainModule(import.meta.url)) main();
