/* The audit's alias list against the stylesheet that defines the aliases. The rule cannot read
 * that file: it ships inside the package beside the CLI and depends on nothing but its siblings,
 * so the list is a constant there and this is what stops the constant going quietly false. An
 * alias the layer gains and the rule does not name is a step of Arena's ramp a style plugin can
 * assign with nothing reporting it; one the rule names and the layer has dropped is a report about
 * a property nothing declares. Comments are stripped before the parse, because a name written in
 * prose above a block is not a definition. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { COMPAT_ALIASES } from '../../generate/core/arena-to-prod/audit.ts';

export const COLORS = 'contracts/design/colors.css';

export const RULE = 'scripts/generate/core/arena-to-prod/audit.ts';

export const node = {
  name: 'check:compat-aliases',
  reads: [COLORS, RULE],
  writes: [],
  feeds: [],
};

const COMMENT = /\/\*[\s\S]*?\*\//g;

const DEFINED = /--([a-z0-9-]+)\s*:/g;

export function aliasesIn(css: string) {
  const text = css.replace(COMMENT, ' ');
  return [...new Set([...text.matchAll(DEFINED)].map((one) => one[1] ?? ''))].filter(Boolean);
}

export function missing(defined: string[], known: string[]) {
  return defined.filter((name) => !known.includes(name));
}

export function extra(defined: string[], known: string[]) {
  return known.filter((name) => !defined.includes(name));
}

export function zeroAliasProblems(count: number) {
  if (count > 0) return [];
  return [`found 0 alias(es) in ${COLORS} -- an empty result set is a failure, not a clean pass; `
    + 'check the discovery path'];
}

export function collect(base = repoRoot) {
  const defined = aliasesIn(readFileSync(join(base, COLORS), 'utf8'));
  const zero = zeroAliasProblems(defined.length);
  if (zero.length) return zero;
  return [
    ...missing(defined, COMPAT_ALIASES).map((name) =>
      `${COLORS} defines --${name} and COMPAT_ALIASES does not name it, so a style plugin can `
      + 'assign that value with nothing reporting it'),
    ...extra(defined, COMPAT_ALIASES).map((name) =>
      `COMPAT_ALIASES names --${name} and ${COLORS} no longer defines it, so the rule reports on a `
      + 'property nothing declares'),
  ];
}

function main() {
  const problems = collect();
  if (problems.length) {
    console.error(`check-compat-aliases: ${problems.length} problem(s)\n`);
    for (const one of problems) console.error(`  ${one}`);
    process.exit(1);
  }
  console.log(`check-compat-aliases: the audit names every one of the ${COMPAT_ALIASES.length} `
    + 'alias(es) the compatibility layer defines, and none it has stopped defining, so a style '
    + 'plugin reaching around the role tier is reported wherever it reaches');
}

if (isMainModule(import.meta.url)) main();
