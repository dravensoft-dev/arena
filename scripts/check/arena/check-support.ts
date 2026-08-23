/* The repertoire against the tree it describes. Three claims: the emitted regions are what a
 * fresh emit produces, so a range moves in one file and lands in every page that states it; no
 * consumer page names a peer at a version the manifests do not declare, which is the way a
 * hand-typed range goes stale without anything failing; and no consumer page hands a reader a
 * runner without an alternative beside it. The third is the anti-regression rule and it is the
 * reason this gate exists at all: bunx was written into five consumer pages while the shipped
 * command was a Node program reading three node modules, so the branch documented a dependency
 * Arena does not have, and nothing on the board could see it. */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { isConsumerDocument } from './check-docs.ts';
import { skips } from './check-routes.ts';
import { AXES, EVIDENCE, PEERS, NODE_ENGINE } from '../../lib/arena/support-matrix.ts';
import { TARGET, emit } from '../../generate/arena/generate-support.ts';

export const node = {
  name: 'check:support',
  reads: [
    TARGET, 'skills/**', 'frameworks/*/PACKAGE.md', 'frameworks/*/INDEX.md',
    'frameworks/*/components/**/*.prompt.md', 'scripts/lib/arena/support-matrix.ts',
  ],
  writes: [],
  feeds: [],
};

export const RUNNERS = [
  ['bunx', /\bbunx\b/],
  ['bun run', /\bbun run\b/],
] as const;

export const ALTERNATIVES = [/\bnpx\b/, /\bpnpm exec\b/, /\byarn dlx\b/, /\bnpm run\b/];

export const RUNNER_EXEMPT = new Map([
  ['bun run', 'the form a prompt uses to open a demo page, which is a command in this repository '
    + 'rather than one a consumer runs, and the pages carrying it are generated from the tree'],
]);

export function documents(base = root) {
  return walkFiles(base, { skip: (name) => skips(name) })
    .filter((path) => path.endsWith('.md'))
    .filter((path) => isConsumerDocument(relPosix(base, path)));
}

export function regionProblems(base = root) {
  const path = join(base, ...TARGET.split('/'));
  if (!existsSync(path)) {
    return [`${TARGET} is not there, and it is the page every other claim here is about`];
  }
  const source = readFileSync(path, 'utf8');
  return emit(source) === source
    ? []
    : [`${TARGET}: a @support region does not match a fresh emit. The repertoire is said once, in `
       + 'support-matrix.ts, so a table edited in the page is a table the next generate overwrites: '
       + 'run bun run generate:support'];
}

export function declaredRanges() {
  const ranges = new Map<string, Set<string>>();
  for (const peers of Object.values(PEERS)) {
    for (const [name, range] of Object.entries(peers)) {
      ranges.set(name, (ranges.get(name) ?? new Set()).add(range));
    }
  }
  return ranges;
}

export function rangeProblems(rel: string, source: string, ranges = declaredRanges()) {
  const problems = [];
  for (const [name, declared] of ranges) {
    const stated = new RegExp(`\`${name.replace(/[/@]/g, '\\$&')}\`[^\\n]{0,24}?\`([^\`\\n]*[\\d][^\`\\n]*)\``, 'g');
    for (const match of source.matchAll(stated)) {
      const written = (match[1] ?? '').replace(/\\\|/g, '|').trim();
      if (declared.has(written)) continue;
      problems.push(
        `${rel}: states ${JSON.stringify(name)} at ${JSON.stringify(written)}, and the packages `
        + `declare ${[...declared].map((r) => JSON.stringify(r)).join(' and ')}. A range typed into `
        + 'prose beside the one a manifest carries is the half that goes stale, and a reader who '
        + 'installs what the page says gets a resolution error rather than a correction',
      );
    }
  }
  return problems;
}

export function engineProblems(rel: string, source: string, engine = NODE_ENGINE) {
  const stated = /node['"]?\s*:\s*['"]([^'"]+)['"]/gi;
  return [...source.matchAll(stated)]
    .map((match) => (match[1] ?? '').trim())
    .filter((written) => written !== engine)
    .map((written) => `${rel}: states a node engine of ${JSON.stringify(written)} against the `
      + `${JSON.stringify(engine)} the packages declare`);
}

export function runnerProblems(rel: string, source: string) {
  const problems = [];
  for (const [runner, pattern] of RUNNERS) {
    if (RUNNER_EXEMPT.has(runner)) continue;
    for (const line of source.split('\n')) {
      if (!pattern.test(line)) continue;
      if (ALTERNATIVES.some((alternative) => alternative.test(line))) continue;
      problems.push(
        `${rel}: hands a reader ${JSON.stringify(runner)} with no alternative on the line. The `
        + 'command this branch ships is a Node program, so naming one runner and no other '
        + 'documents a dependency Arena does not have: name a second, or name the command bare '
        + `and let the repertoire page answer the runner. Line: ${JSON.stringify(line.trim())}`,
      );
    }
  }
  return problems;
}

export function axisProblems(axes = AXES) {
  const problems = [];
  const seen = new Set<string>();
  for (const axis of axes) {
    if (seen.has(axis.axis)) problems.push(`the repertoire declares ${JSON.stringify(axis.axis)} twice`);
    seen.add(axis.axis);
    if (axis.rows.length === 0) {
      problems.push(`${axis.axis}: an axis with no row is a question the page asks and never answers`);
    }
    for (const row of axis.rows) {
      if (Object.hasOwn(EVIDENCE, row.evidence)) continue;
      problems.push(`${axis.axis}: ${JSON.stringify(row.answer)} carries no evidence level, and the `
        + 'level is what separates an answer somebody ran from one nobody has');
    }
  }
  return problems;
}

export function collect(base = root) {
  const ranges = declaredRanges();
  const problems = [...axisProblems(), ...regionProblems(base)];
  const scanned = documents(base);
  for (const path of scanned) {
    const rel = relPosix(base, path);
    const source = readFileSync(path, 'utf8');
    problems.push(
      ...rangeProblems(rel, source, ranges),
      ...engineProblems(rel, source),
      ...runnerProblems(rel, source),
    );
  }
  return { problems, scanned: scanned.length };
}

function main() {
  const { problems, scanned } = collect();
  if (problems.length > 0) {
    console.error(`check-support: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`check-support: ${AXES.length} axes over ${AXES.reduce((n, a) => n + a.rows.length, 0)} `
    + `answer(s), each carrying its evidence, and ${scanned} consumer document(s) state no peer range `
    + 'the manifests do not, no other node engine, and no runner without an alternative');
}

if (isMainModule(import.meta.url)) main();
