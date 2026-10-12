/* No script assumes one operating system. Every rule is a BAN with a named owner, never a
 * judgement about whether a construct is correct, which is what keeps the false-positive rate
 * zero: it does not ask whether spawning a bare name is wise, it asks where that may live. A
 * stale owner fails too, so an exception cannot outlive its argument. Most rules read scripts
 * alone, a suite naming win32 and a C: path being one doing its job; the separator rules read
 * suites as well, a native path compared to a posix literal being the same defect wherever it
 * sits. Matches go through the lexer check:docs uses, so a construct in a comment or a string is
 * described rather than performed, bar the two whose construct IS a string and say so. It also
 * holds the workflows: develop.yml's matrix, pr-gate waiting for every other job in pr.yml, one
 * workflow naming a browser, a time limit on every job, and no job layout it cannot read. */

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { findComments, insideLiteral, literalRanges } from '../../lib/arena/comments.ts';
import { isScript, isSuite } from '../../lib/arena/domains.ts';
import { hostBinary } from '../../lib/arena/host-binary.ts';
import { SUPPORTED_OS, SUPPORTED_OS_NAMES } from '../../ci/arena/supported-os.ts';
import { HOST_BINARIES } from '../../lib/arena/host-binaries.ts';

export const node = {
  name: 'check:portability',
  reads: ['scripts/**', '.github/workflows/**'],
  writes: [],
  feeds: [],
};

export const WORKFLOWS = '.github/workflows';

export const PR_WORKFLOW = 'pr.yml';

export const MATRIX_WORKFLOW = 'develop.yml';

export const REQUIRED_JOB = 'pr-gate';

export const SETUP_DOCUMENT = 'scripts/build/AGENTS.md';

export const RESERVED_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`),
]);

export const ILLEGAL_IN_NAME = /[<>:"|?*\u0000-\u001f]/;

export const CLONE_ROOT_BUDGET = 40;

export const MAX_PATH = 260;

export type Rule = {
  id: string;
  pattern: RegExp;
  owners: string[];
  why: string;
  written?: 'as a string';
  reaches?: 'suites as well';
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
    owners: ['scripts/lib/arena/chromium.ts', 'scripts/lib/arena/child-output.ts'],
    why: 'a process group is a POSIX idea and a negative pid means nothing on Windows, so the one '
      + 'place that reaps a tree is the one that launched it; child-output.ts kills a single pid there, '
      + 'a child that ignored SIGTERM, and never a group',
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
    reaches: 'suites as well',
  },
  {
    id: 'native-relative',
    pattern: /(?<![\w$])relative\(/g,
    owners: [
      'scripts/utils/posix-path.ts',
      'scripts/generate/core/arena-cli/posix.ts',
      'scripts/generate/core/arena-mcp/posix.ts',
    ],
    why: 'relative answers in the host separator and relPosix is the one spelling of the answer, '
      + 'because a repo-relative path is read back by something assuming a forward slash: a prefix '
      + 'test that silently matches nothing, a segment count short by the depth, a sort in another '
      + 'order, a citation naming a file nobody can grep. Which shape it is written in does not '
      + 'change that, so the ban is the call. The second owner is the CLI tree copied whole into '
      + 'bin/, which cannot import a helper it would climb out of itself to reach',
    reaches: 'suites as well',
  },
  {
    id: 'called-skip',
    pattern: /(?<![\w$])(?:t|ctx|context)\.skip\(/g,
    owners: [],
    why: 'a case this host cannot run declares its skip in the options object, since bun answers '
      + 't.skip() with NotImplementedError rather than a skip. Every one of these guards a '
      + 'capability the host may lack, a browser, a symlink, a signal, so the machine that fires '
      + 'it is the one that already had the least to say, and what it gets is a runner error in '
      + 'place of the reason somebody wrote for exactly that moment. Decide it before the case: '
      + '`{ skip: WHY_NOT }`, where WHY_NOT is false or the sentence',
    reaches: 'suites as well',
  },
  {
    id: 'host-separator',
    pattern: /import\s*\{[^}]*\bsep\b[^}]*\}\s*from\s*'node:path'|(?<![\w$])\w+\.sep\b/g,
    owners: [
      'scripts/utils/posix-path.ts',
      'scripts/utils/posix-path.test.ts',
      'scripts/generate/core/arena-cli/posix.ts',
      'scripts/generate/core/arena-mcp/posix.ts',
    ],
    why: 'the host separator is a backslash on one machine and a slash on the other, so writing it '
      + 'down anywhere else is a comparison that holds on the machine it was written on: a repo-'
      + 'relative path is posix and splitting it on the host separator returns the whole string as '
      + 'one segment, and a prefix built with it matches nothing. Ask isInside whether a path is '
      + 'under another and relPosix what it is called. The owner\'s own suite is the second, since '
      + 'proving a conversion converts anything means writing a native path down on a machine that '
      + 'has none; the third is the CLI tree copied whole into bin/, which cannot import a helper '
      + 'it would climb out of itself to reach',
    reaches: 'suites as well',
  },
  {
    id: 'sliced-relative',
    pattern: /\.slice\(\s*[\w$]+\.length\s*\+\s*1\s*\)/g,
    owners: [],
    why: 'a repo-relative path is relPosix(base, path) and never the absolute one with the base '
      + 'sliced off its front: the slice keeps whatever separator the host walked with, so the '
      + 'answer is native on Windows and posix here, and every reader that splits it on a forward '
      + 'slash reads one segment. It is also silently wrong the day base arrives with a trailing '
      + 'separator, which relative answers correctly and arithmetic on a length cannot',
    reaches: 'suites as well',
  },
  {
    id: 'slash-index',
    pattern: /lastIndexOf\('\/'\)|lastIndexOf\("\/"\)/g,
    owners: [],
    why: 'the last segment of a path is basename and the rest is dirname, and both read a forward '
      + 'slash on every host, a native one included. Hunting the index of a slash by hand answers '
      + '-1 on the path a Windows walk hands over, so the slice returns the whole string or all '
      + 'but its last character, and the lookup that follows misses in silence',
    reaches: 'suites as well',
  },
  {
    id: 'prefix-containment',
    pattern: /startsWith\([^)]*\+\s*(?:'|"|`)[/\\]/g,
    owners: ['scripts/utils/posix-path.ts'],
    why: 'whether a path is under another is isInside, asked through relative: a string prefix is '
      + 'fail-open without a separator boundary and fail-closed with a hardcoded one',
    reaches: 'suites as well',
  },
];

export function inScope(path: string, base = root) {
  const rel = relPosix(base, path);
  if (!rel.startsWith('scripts/')) return false;
  const name = basename(rel);
  return isScript(name) && !isSuite(name);
}

export function scriptFiles(base = root) {
  return walkFiles(join(base, 'scripts')).filter((path) => inScope(path, base));
}

export const SUITE_RULES = RULES.filter((rule) => rule.reaches === 'suites as well');

export function inSuiteScope(path: string, base = root) {
  const rel = relPosix(base, path);
  if (!rel.startsWith('scripts/')) return false;
  return isSuite(basename(rel));
}

export function suiteFiles(base = root) {
  return walkFiles(join(base, 'scripts')).filter((path) => inSuiteScope(path, base));
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
  const present = new Set(files.map((file) => relPosix(base, file)));
  return rules.flatMap((rule) => rule.owners
    .filter((owner) => !present.has(owner))
    .map((owner) => `${rule.id} names ${owner} as its owner, and no script in scope is there. `
      + 'An exception cannot outlive the thing it was written for.'));
}

export function matrixLegs(text: string) {
  const legs = new Map<string, boolean | undefined>();
  for (const match of text.matchAll(/^\s*-\s*os:\s*(\S+)\s*$(?:\n\s*blocking:\s*(true|false))?/gm)) {
    legs.set(match[1] ?? '', match[2] === undefined ? undefined : match[2] === 'true');
  }
  for (const match of text.matchAll(/^\s*os:\s*\[([^\]]+)\]\s*$/gm)) {
    for (const one of (match[1] ?? '').split(',')) legs.set(one.trim(), undefined);
  }
  legs.delete('');
  return legs;
}

const JOBS_LINE = /^jobs:[ \t]*(?:#.*)?$/m;
const JOB_HEAD = /^ {2}([A-Za-z0-9_-]+):[ \t]*(?:#.*)?$/;

export function jobBlocks(text: string) {
  const blocks = new Map<string, string>();
  const start = text.search(JOBS_LINE);
  if (start === -1) return blocks;

  const rest = text.slice(start);
  const end = rest.search(/\n(?=[^\s#])/);
  const body = end === -1 ? rest : rest.slice(0, end);
  const heads = [...body.matchAll(new RegExp(JOB_HEAD.source, 'gm'))];
  heads.forEach((head, i) => {
    const from = head.index ?? 0;
    const to = i + 1 < heads.length ? heads[i + 1]?.index ?? body.length : body.length;
    blocks.set(head[1] ?? '', body.slice(from, to));
  });
  return blocks;
}

export function jobShapeProblems(file: string, text: string) {
  const lines = text.split('\n');
  const at = lines.findIndex((line) => JOBS_LINE.test(line));
  if (at === -1) {
    return [`${file} has no top-level jobs: line this gate can read, so not one of its jobs is checked`];
  }
  const problems = [];
  let heads = 0;
  for (let i = at + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    if (indent === 0) break;
    if (indent >= 4 && heads > 0) continue;
    if (indent === 2 && JOB_HEAD.test(line)) { heads += 1; continue; }
    problems.push(`${file}:${i + 1}: ${JSON.stringify(line.trim())} sits where a job key goes, in a shape this `
      + 'gate cannot read; a job is a plain key two spaces in, alone on its line, or its steps go unchecked');
  }
  if (heads === 0) problems.push(`${file} declares no job this gate can read, so nothing in it is checked`);
  return problems;
}

export const TIMEOUT_MAX_MINUTES = 360;

export function timeoutProblems(file: string, text: string) {
  return [...jobShapeProblems(file, text), ...jobLimitProblems(file, text)];
}

export function jobLimitProblems(file: string, text: string) {
  const problems: string[] = [];
  for (const [job, block] of jobBlocks(text)) {
    const lines = block.split('\n');
    if (lines.some((line) => /^ {4}uses:/.test(line))) {
      if (lines.some((line) => /^ {4}runs-on:/.test(line))) {
        problems.push(`${file}: job ${job} has both uses: and runs-on:, which GitHub refuses, and this reader `
          + 'cannot say which time limit applies');
      }
      continue;
    }
    if (!lines.some((line) => /^ {4}runs-on:/.test(line))) {
      problems.push(`${file}: job ${job} is a job this reader cannot classify, because it has neither `
        + 'a uses: that calls a reusable workflow nor a runs-on: that runs steps, so its time limit is unchecked');
      continue;
    }
    const at = lines.findIndex((line) => /^ {4}timeout-minutes:/.test(line));
    if (at === -1) {
      problems.push(`${file}: job ${job} does not declare timeout-minutes, so a step that hangs holds `
        + 'a runner for six hours before GitHub ends it');
      continue;
    }
    if (lines.filter((line) => /^ {4}timeout-minutes:/.test(line)).length > 1) {
      problems.push(`${file}: job ${job} declares timeout-minutes more than once, and this reader cannot say `
        + 'which figure a hung step is held to');
      continue;
    }
    const value = (lines[at] ?? '').replace(/^ {4}timeout-minutes:[ \t]*/, '').replace(/[ \t]*#.*$/, '').trim();
    const minutes = /^\d+$/.test(value) ? Number(value) : 0;
    if (minutes < 1 || minutes > TIMEOUT_MAX_MINUTES) {
      problems.push(`${file}: job ${job} sets timeout-minutes to ${JSON.stringify(value)}, and it has to be a `
        + `literal number of minutes from 1 to ${TIMEOUT_MAX_MINUTES}, because an expression or an out-of-range `
        + 'figure leaves a hung step holding a runner for up to six hours');
    }
  }
  return problems;
}

export function workflowFiles(base = root) {
  if (!existsSync(join(base, WORKFLOWS))) return [];
  return walkFiles(join(base, WORKFLOWS)).filter((file) => /\.ya?ml$/.test(file));
}

export function declaredNeeds(block: string): string[] | null {
  const lines = block.split('\n');
  const at = lines.findIndex((one) => /^ {4}needs:/.test(one));
  if (at === -1) return [];
  const value = (lines[at] ?? '').replace(/^ {4}needs:[ \t]*/, '').replace(/[ \t]*#.*$/, '').trim();
  const NAME = /^[A-Za-z0-9_-]+$/;

  const inline = /^\[([^\]]*)\]$/.exec(value);
  if (inline) {
    const names = (inline[1] ?? '').split(',').map((one) => one.trim()).filter(Boolean);
    return names.every((one) => NAME.test(one)) ? names : null;
  }
  if (NAME.test(value)) return [value];
  if (value !== '') return null;

  const names = [];
  for (const line of lines.slice(at + 1)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (line.length - line.trimStart().length <= 4) break;
    const item = /^ {6}- ([^#]*?)[ \t]*(?:#.*)?$/.exec(line)?.[1];
    if (item === undefined || !NAME.test(item)) return null;
    names.push(item);
  }
  return names.length > 0 ? names : null;
}

export function needsProblems(text: string, job = REQUIRED_JOB) {
  const blocks = jobBlocks(text);
  const gate = blocks.get(job);
  if (gate === undefined) {
    return [`${WORKFLOWS}/${PR_WORKFLOW} declares no ${job}, and it is the one required check`];
  }

  const declared = declaredNeeds(gate);
  if (declared === null) {
    return [`${job}'s needs is in a shape this gate cannot read, so it cannot say whether every other job `
      + 'is named; write it as [a, b], as one name, or as a list of - name lines'];
  }
  const named = new Set(declared);
  const missing = [...blocks.keys()].filter((one) => one !== job && !named.has(one));
  const unknown = [...named].filter((one) => !blocks.has(one));

  const problems = [];
  if (missing.length > 0) {
    problems.push(`${job} does not name ${missing.join(', ')}, and a job it does not name is one `
      + 'whose failure the only required check never sees. A green gate over a red job is worse '
      + 'than no gate, so the list is every other job in the file.');
  }
  for (const one of unknown) {
    problems.push(`${job} names ${one} and no job in ${PR_WORKFLOW} is called that, so the gate `
      + 'waits for nothing and says it waited');
  }
  return problems;
}

export function gateProblems(base = root, job = REQUIRED_JOB) {
  const path = join(base, WORKFLOWS, PR_WORKFLOW);
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return [`${WORKFLOWS}/${PR_WORKFLOW} is missing, so nothing guards a merge request`];
  }
  return [...jobShapeProblems(`${WORKFLOWS}/${PR_WORKFLOW}`, text), ...needsProblems(text, job)];
}

export function matrixProblems(base = root, supported = SUPPORTED_OS) {
  const path = join(base, WORKFLOWS, MATRIX_WORKFLOW);
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return [`${WORKFLOWS}/${MATRIX_WORKFLOW} is missing, so nothing runs on a second operating system`];
  }

  const legs = matrixLegs(text);
  if (legs.size === 0) return [`${WORKFLOWS}/${MATRIX_WORKFLOW} declares no os matrix`];

  const problems = [];
  for (const name of Object.keys(supported)) {
    if (!legs.has(name)) { problems.push(`supported-os.ts names ${name} and the matrix does not run it`); continue; }
    const declared = supported[name]?.blocking;
    const inMatrix = legs.get(name);
    if (inMatrix !== declared) {
      problems.push(`supported-os.ts says ${name} is ${declared ? '' : 'not '}blocking and the `
        + `matrix says ${inMatrix === undefined ? 'nothing' : inMatrix}. A leg that reports and `
        + 'does not gate is a decision with a reason, so the two have to agree or one of them is '
        + 'a lie a reader will believe.');
    }
  }
  for (const name of legs.keys()) {
    if (!Object.hasOwn(supported, name)) {
      problems.push(`the matrix runs ${name} and supported-os.ts does not name it, so nothing `
        + 'says what that leg buys');
    }
  }
  return problems;
}

export const BROWSER_INPUT = 'chrome-path';

const CONDUIT = /^\s*CHROME_PATH:[ \t]*\$\{\{[ \t]*inputs\.chrome-path[ \t]*\}\}[ \t]*$/;
const NAMED_ENV = /^\s*CHROME_PATH:/;
const PASSED = /^\s*chrome-path:[ \t]*(.*?)[ \t]*$/;

const MENTION = /chrome[-_]path/i;
const NOT_CODE = /^\s*(?:#|(?:-\s+)?(?:name|description):)/;

const clean = (raw: string) => raw.replace(/[ \t]*#.*$/, '').replace(/^(['"])(.*)\1$/, '$2').trim();
const passedValue = (line: string) => clean(PASSED.exec(line)?.[1] ?? '');

function declaresDefault(lines: string[]) {
  return lines.some((line, at) => {
    const key = /^(\s*)chrome-path:[ \t]*(?:#.*)?$/.exec(line);
    if (!key) return false;
    for (const next of lines.slice(at + 1)) {
      if (next.trim() === '') continue;
      if (next.length - next.trimStart().length <= (key[1] ?? '').length) return false;
      const value = /^\s*default:[ \t]*(.*)$/.exec(next)?.[1];
      if (value !== undefined && clean(value) !== '') return true;
    }
    return false;
  });
}

export function browserNamingProblems(workflows: { file: string; text: string }[]) {
  const naming = [];
  const conduits = [];
  const problems = [];
  for (const { file, text } of workflows) {
    const lines = text.split('\n');
    if (lines.some((line) => CONDUIT.test(line))) conduits.push(file);
    const named = lines.some((line) => NAMED_ENV.test(line) && !CONDUIT.test(line))
      || lines.some((line) => passedValue(line) !== '') || declaresDefault(lines);
    if (named) naming.push(file);
    lines.forEach((line, at) => {
      if (!MENTION.test(line) || NOT_CODE.test(line) || CONDUIT.test(line)) return;
      if (NAMED_ENV.test(line) || PASSED.test(line)) return;
      problems.push(`${file}:${at + 1}: ${JSON.stringify(line.trim())} names the browser in a shape this gate `
        + 'cannot read; write CHROME_PATH or chrome-path as a plain key, or the line goes unchecked');
    });
  }

  if (naming.length === 0) {
    problems.push(`no workflow names a browser, through CHROME_PATH or a ${BROWSER_INPUT} input, so nothing `
      + 'exercises the terminal-override branch');
  }
  if (naming.length > 1) {
    problems.push(`${naming.join(', ')} all name a browser. Exporting it everywhere is what made the `
      + 'candidate list unreachable, so exactly one workflow names a browser and the rest prove '
      + 'discovery finds one.');
  }
  const passing = workflows.filter(({ text }) => text.split('\n').some((line) => passedValue(line) !== ''));
  if (passing.length > 0 && conduits.length === 0) {
    problems.push(`${passing.map((one) => one.file).join(', ')} pass ${BROWSER_INPUT} and no workflow hands it on as `
      + `CHROME_PATH: \${{ inputs.${BROWSER_INPUT} }}, so the browser it names reaches no gate`);
  }
  return problems;
}

export function browserWorkflows(base = root) {
  return workflowFiles(base)
    .map((file) => ({ file: relPosix(base, file), text: readFileSync(file, 'utf8') }));
}

export function browserPathProblems(base = root) {
  return browserNamingProblems(browserWorkflows(base));
}

export function setupProblems(base = root, declared = HOST_BINARIES) {
  const path = join(base, SETUP_DOCUMENT);
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return [`${SETUP_DOCUMENT} is missing, and it is where a contributor is sent to learn what to install`];
  }

  return Object.entries(declared)
    .filter(([, one]) => !text.includes(one.probe))
    .map(([name, one]) => `${SETUP_DOCUMENT} does not name the probe for ${name}, `
      + `\`${one.probe}\`. A contributor is sent there to learn what a machine needs, and a `
      + 'setup document nothing holds is one that goes stale the first time the list moves.');
}

export function trackedPaths(base = root) {
  const git = hostBinary('git', 'to list what a clone would have to check out, which is the only '
    + 'list that answers whether a checkout can happen at all');
  const { stdout } = spawnSync(git, ['ls-files', '-z'], { cwd: base, encoding: 'utf8' });
  return (stdout ?? '').split('\0').filter(Boolean);
}

export function checkoutProblems(paths: string[]) {
  const problems: string[] = [];
  const byLowerCase = new Map<string, string>();

  for (const path of paths) {
    for (const segment of path.split('/')) {
      const stem = (segment.split('.')[0] ?? '').toLowerCase();
      if (RESERVED_NAMES.has(stem)) {
        problems.push(`${path}: the segment "${segment}" is a reserved device name on Windows, `
          + 'so a clone there cannot write it at all, whatever the extension or the case');
      }
      if (ILLEGAL_IN_NAME.test(segment)) {
        problems.push(`${path}: the segment "${segment}" carries a character NTFS refuses`);
      }
      if (/[. ]$/.test(segment)) {
        problems.push(`${path}: the segment "${segment}" ends in a dot or a space, which Windows `
          + 'silently strips, so the checked-out name would not be the tracked one');
      }
    }

    const lower = path.toLowerCase();
    const seen = byLowerCase.get(lower);
    if (seen !== undefined && seen !== path) {
      problems.push(`${path} and ${seen} differ only in case, so a case-insensitive filesystem `
        + 'cannot hold both. On Windows and on macOS one silently overwrites the other, and the '
        + 'clone is quietly wrong rather than loudly broken.');
    }
    byLowerCase.set(lower, path);

    if (CLONE_ROOT_BUDGET + path.length > MAX_PATH) {
      problems.push(`${path} is ${path.length} characters, and ${CLONE_ROOT_BUDGET} for a `
        + `plausible clone root puts it past the ${MAX_PATH} a Windows checkout allows without `
        + 'core.longpaths');
    }
  }
  return problems;
}

export function portabilityProblems(base = root) {
  const files = scriptFiles(base);
  const suites = suiteFiles(base);
  const tracked = trackedPaths(base);
  const problems: string[] = [];

  const scan = (list: string[], rules: Rule[]) => {
    for (const file of list) {
      const rel = relPosix(base, file);
      for (const { rule, line, text } of violations(rel, readFileSync(file, 'utf8'), rules)) {
        const owner = rule.owners.length === 0 ? 'nowhere' : rule.owners.join(' or ');
        problems.push(`${rel}:${line}: ${JSON.stringify(text)} breaks ${rule.id}, which lives in `
          + `${owner}. ${rule.why}.`);
      }
    }
  };
  scan(files, RULES);
  scan(suites, SUITE_RULES);

  problems.push(...staleOwners([...files, ...suites], base));
  problems.push(...matrixProblems(base));
  problems.push(...gateProblems(base));
  problems.push(...browserPathProblems(base));
  const workflows = workflowFiles(base);
  if (workflows.length === 0) {
    problems.push(`${WORKFLOWS} holds no .yml or .yaml workflow this gate can read, so not one job's time limit is checked`);
  }
  let jobs = 0;
  for (const file of workflows) {
    const rel = relPosix(base, file);
    const text = readFileSync(file, 'utf8');
    if (rel !== `${WORKFLOWS}/${PR_WORKFLOW}`) problems.push(...jobShapeProblems(rel, text));
    problems.push(...jobLimitProblems(rel, text));
    jobs += jobBlocks(text).size;
  }
  problems.push(...setupProblems(base));
  problems.push(...checkoutProblems(tracked));

  const longest = tracked.reduce((n, path) => Math.max(n, path.length), 0);
  return {
    problems,
    scanned: files.length,
    covered: suites.length,
    rules: RULES.length,
    tracked: tracked.length,
    longest,
    workflows: workflows.length,
    jobs,
  };
}

export function main(base = root) {
  const { problems, scanned, covered, rules, tracked, longest, workflows, jobs } = portabilityProblems(base);

  if (scanned === 0) {
    console.error('check-portability: scanned 0 script(s); the tree moved under this gate');
    process.exit(1);
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`check-portability: ${problem}`);
    console.error(`\ncheck-portability: ${problems.length} problem(s)`);
    process.exit(1);
  }

  console.log(`check-portability: ${scanned} script(s) hold to ${rules} rule(s) and ${covered} `
    + `suite(s) to the ${SUITE_RULES.length} that read one, every exception `
    + `names a module that is there, ${SETUP_DOCUMENT} names every host prerequisite, `
    + `${workflows} workflow(s) and their ${jobs} job(s) were read for a time limit, `
    + `${MATRIX_WORKFLOW} runs exactly ${SUPPORTED_OS_NAMES.length} declared operating `
    + `system(s), ${REQUIRED_JOB} waits for every other job in ${PR_WORKFLOW}, and ${tracked} `
    + `tracked path(s) are ones a Windows checkout can hold, the longest at ${longest} of the `
    + `${MAX_PATH - CLONE_ROOT_BUDGET} left after a clone root`);
}

if (isMainModule(import.meta.url)) main(process.argv[2]);
