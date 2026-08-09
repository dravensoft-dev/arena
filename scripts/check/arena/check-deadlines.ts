/* Holds two claims a derivation cannot. First, that no bare span sits in a wait position: a
 * literal in a suite case timeout, in a withTimeout bound or in a sleep is a number read off
 * whichever machine wrote it. Second, that a suite's budget names every deadline its import
 * closure declares, since deriving a budget makes it right for the deadlines it names and
 * nothing else makes it name the right ones. The closure is read as text by script-closure,
 * never imported, because importing a script to read it runs it. Both maps carry a reason per
 * entry and their suite asserts on them by name, so a stale allowance fails here. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { lineOf } from '../../utils/text.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { isSuite } from '../../lib/arena/domains.ts';
import { scriptClosure } from '../../graph/script-closure.ts';

export const node = {
  name: 'check:deadlines',
  reads: ['scripts/**'],
  writes: [],
  feeds: [],
};

export const WAIT_IMPLEMENTATIONS = new Map([
  ['scripts/lib/arena/wait-for.ts',
   'it IS the polling loop, so the poll interval is written here, and the ban would forbid the '
   + 'one place this tree wants that number to be'],
  ['scripts/utils/with-timeout.ts',
   'it IS the deadline race, and the span it arms is its own parameter rather than a number it '
   + 'chose'],
]);

export const SPANS_AS_DATA = new Map([
  ['scripts/utils/with-timeout.test.ts',
   'the spans here are the parameter of the function under test, so a deadline declared for them '
   + 'would be a bound on nothing'],
  ['scripts/utils/concurrency.test.ts',
   'the span manufactures overlapping in-flight work for the limiter to be observed against, and '
   + 'the assertion is on peak concurrency rather than on anything timed'],
  ['scripts/lib/arena/deadline.test.ts',
   'it declares deadlines and derives budgets as fixtures of the mechanism it is the suite of, so '
   + 'its budgets bound no case and its closure is itself'],
  ['scripts/check/arena/check-deadlines.test.ts',
   'the spans in it are the strings this gate is asked to judge, so every pattern banned below '
   + 'appears in it by construction and a gate that flagged them would be reading its own fixtures'],
]);

const allowed = (rel: string) => WAIT_IMPLEMENTATIONS.has(rel) || SPANS_AS_DATA.has(rel);

const POSITIONS: { position: string; pattern: RegExp }[] = [
  { position: 'a suite case timeout', pattern: /\btimeout:\s*([0-9][0-9_]*)\b/g },
  { position: 'a withTimeout bound', pattern: /\bwithTimeout\([^,]+,\s*([0-9][0-9_]*)\b/g },
  { position: 'a sleep', pattern: /\bsetTimeout\(\s*[A-Za-z_$][\w$]*\s*,\s*([0-9][0-9_]*)\b/g },
];

export function waitPositions(source: string) {
  const found: { position: string; literal: string }[] = [];
  for (const { position, pattern } of POSITIONS) {
    for (const m of source.matchAll(pattern)) found.push({ position, literal: m[1] ?? '' });
  }
  return found;
}

const DECLARATION = /\bconst\s+([A-Za-z_$][\w$]*)\s*(?::\s*Deadline\s*)?=\s*deadline\(/g;

export function declaredDeadlines(source: string) {
  return [...source.matchAll(DECLARATION)].map((m) => m[1] ?? '');
}

const BUDGET = /\bbudgetFor\(([^)]*)\)/;

export function namedInBudget(source: string) {
  const found = BUDGET.exec(source);
  if (!found) return [];
  return (found[1] ?? '').split(',').map((one) => one.trim()).filter(Boolean);
}

export function scriptsUnder(base = root) {
  return walkFiles(join(base, 'scripts')).filter((path) => path.endsWith('.ts'));
}

export function bareDurationProblems(base = root) {
  const problems = [];
  for (const full of scriptsUnder(base)) {
    const rel = relPosix(base, full);
    if (allowed(rel)) continue;
    const source = readFileSync(full, 'utf8');
    for (const { position, literal } of waitPositions(source)) {
      problems.push(`${rel}:${lineOf(source, source.indexOf(literal))}: ${literal} is a bare span `
        + `in ${position}. A duration is a statement about the machine that wrote it, so declare `
        + 'a deadline carrying the reason it is that size and name it here.');
    }
  }
  return problems;
}

export function budgetProblems(base = root) {
  const problems = [];
  for (const full of scriptsUnder(base)) {
    const rel = relPosix(base, full);
    if (!isSuite(rel.split('/').pop() ?? '')) continue;
    if (allowed(rel)) continue;
    const source = readFileSync(full, 'utf8');
    const named = namedInBudget(source);
    if (named.length === 0) continue;
    const reachable = new Set<string>();
    for (const reached of scriptClosure(full, base)) {
      for (const one of declaredDeadlines(readFileSync(join(base, reached), 'utf8'))) {
        reachable.add(one);
      }
    }
    for (const one of [...reachable].sort()) {
      if (named.includes(one)) continue;
      problems.push(`${rel}: the budget names ${named.join(', ')} and its closure declares `
        + `${one}, which a case here can therefore spend. A budget under a deadline it contains `
        + 'abandons the callback with the subject still running, and every file loaded after it '
        + 'then reports an error naming neither.');
    }
  }
  return problems;
}

export function staleAllowances(base = root) {
  const there = new Set(scriptsUnder(base).map((full) => relPosix(base, full)));
  return [...WAIT_IMPLEMENTATIONS.keys(), ...SPANS_AS_DATA.keys()]
    .filter((rel) => !there.has(rel))
    .map((rel) => `an allowance names ${rel}, which is not a script here any more, so it outlived `
      + 'the case it was written for');
}

function main() {
  const problems = [...bareDurationProblems(), ...budgetProblems(), ...staleAllowances()];
  if (problems.length > 0) {
    console.error(`check-deadlines: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log('check-deadlines: every wait position holds a declared deadline, and every derived '
    + 'budget names each deadline its own import closure declares');
}

if (isMainModule(import.meta.url)) main();
