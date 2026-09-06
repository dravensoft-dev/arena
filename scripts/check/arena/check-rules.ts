/* Holds the rules of the language to one statement, and each rule to a true claim about whether a
 * gate reads the reader's own sources for it. Four surfaces said them and none was emitted from
 * another, so the router could say no gate reads your application while the shipped audit already
 * did, with every gate green: the sentence and the check had no common source and nothing could
 * compare them. A rule names the audit tag that reports it, or says why a source text cannot show
 * it, and this gate refuses a tag the module does not emit. The emitted surfaces are compared
 * against a fresh emit, which is what keeps a hand edit from surviving in a copy. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { RULES, type LanguageRule } from '../../lib/arena/language-rules.ts';
import { RULE_TAGS } from '../../generate/core/arena-to-prod/audit.ts';
import {
  TARGETS, MARKED, CONTEXT7, renderTarget, renderIndex,
} from '../../generate/arena/generate-rules.ts';

export const SOURCE = 'scripts/lib/arena/language-rules.ts';
export const AUDIT = 'scripts/generate/core/arena-to-prod/audit.ts';
export const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const node = {
  name: 'check:rules',
  reads: [SOURCE, AUDIT, ...TARGETS],
  writes: [],
  feeds: [],
};

export function emitProblems(base = root) {
  const problems = [];
  for (const target of TARGETS) {
    const before = readFileSync(join(base, target), 'utf8');
    let after;
    try {
      after = target === CONTEXT7 ? renderIndex(before) : renderTarget(target, before);
    } catch (error) {
      problems.push(`${target}: ${(error as Error).message}`);
      continue;
    }
    if (after !== before)
      problems.push(
        `${target}: its statement of the rules does not match a fresh emit. Every surface that `
        + `states a rule is written once, in ${SOURCE}, because four of them were written by hand `
        + 'and one of them claimed an enforcement the shipped module did not carry. Edit that '
        + 'declaration and run bun run generate:rules',
      );
  }
  return problems;
}

export function heldProblems(rules: LanguageRule[] = RULES) {
  const problems = [];
  const tags = new Set<string>(RULE_TAGS);
  for (const rule of rules) {
    if (rule.held !== null && rule.unheld !== null)
      problems.push(`${rule.id}: names the tag ${rule.held} and also says why no gate reads it. A `
        + 'rule is one or the other, and carrying both is how a page keeps a reason nobody needs '
        + 'beside a claim that answers it');
    if (rule.held === null && (rule.unheld === null || rule.unheld === ''))
      problems.push(`${rule.id}: no gate holds it and it says nothing about why. A reader who has `
        + 'run the audit and seen nothing is owed the reason rather than left to wonder whether '
        + 'the rule or the run is at fault');
    if (rule.held !== null && !tags.has(rule.held))
      problems.push(`${rule.id}: claims the audit reports it under ${rule.held}, and the shipped `
        + `module emits no such tag. ${AUDIT} declares every one it emits in RULE_TAGS, so a rule `
        + 'naming another is a page promising a report nobody gets');
  }
  return problems;
}

export function shapeProblems(rules: LanguageRule[] = RULES) {
  const problems = [];
  const seen = new Set<string>();
  for (const rule of rules) {
    if (!ID.test(rule.id)) problems.push(`${rule.id}: is not a kebab-case identifier`);
    if (seen.has(rule.id)) problems.push(`${rule.id}: is declared twice`);
    seen.add(rule.id);
    if (!rule.short.endsWith('.'))
      problems.push(`${rule.id}: its short half does not end in a full stop. That half is quoted `
        + 'alone into the Context7 index and is held there to being a span of the router, so it '
        + 'is written to stand as a sentence by itself');
  }
  return problems;
}

export function zeroScanProblems(rules: LanguageRule[] = RULES, targets = TARGETS) {
  const problems = [];
  if (rules.length === 0)
    problems.push('no rule is declared, so every claim below passed over nothing');
  if (targets.length === 0)
    problems.push('no surface states the rules, so a fresh emit was compared against nothing');
  if (MARKED.length === 0)
    problems.push('no marked surface is declared, so the region comparison read nothing');
  return problems;
}

export function collect(base = root) {
  return [
    ...zeroScanProblems(),
    ...shapeProblems(),
    ...heldProblems(),
    ...emitProblems(base),
  ];
}

function main() {
  const problems = collect();
  for (const problem of problems) console.error(`check-rules: ${problem}`);
  if (problems.length) process.exit(1);
  const held = RULES.filter((rule) => rule.held !== null).length;
  console.log(`check-rules: ${RULES.length} rule(s) reach ${TARGETS.length} surface(s) from one `
    + `declaration, ${held} of them naming the tag the shipped audit reports them under and the `
    + `rest saying why a source text cannot show them`);
}

if (isMainModule(import.meta.url)) main();
