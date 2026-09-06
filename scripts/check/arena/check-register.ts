/* Holds the consumer branch to a register a small model can parse. Every claim on that branch was
 * true and most were carried by one long sentence: a rule, its exception, its reason and the
 * distinction it turns on, joined by four clauses and referred to two paragraphs later as "it". A
 * reader holding the whole page resolves that, and a model holding a 32,000 token window and a
 * half written screen does not, so the failure is silent: it produces a screen rather than a
 * question. Three things are measurable and each is measured: how long a sentence runs, how many
 * clauses hang off it, and whether it names its own subject. Only a subordinator counts, because a
 * comma before `and` is as often a list as a claim and a gate calling one the other reports a
 * message that is false. Prose is read the way check:duplication reads it, so a generated region
 * is judged where it is emitted and a fence is what a reader copies. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { unfenced } from '../../lib/arena/markdown-prose.ts';
import { FRONTMATTER } from '../../lib/arena/llms-index.ts';
import { REGION_OPENS, REGION_CLOSES, documents } from './check-duplication.ts';
import { isConsumerDocument, BRANCH_SWITCH } from './check-docs.ts';
import { matchesSpec } from '../../graph/pathspecs.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const MAX_WORDS = 30;
export const MAX_CLAUSES = 1;

export const CLAUSE_OPENERS = [', which', ', so', ', because', ', rather than', ', while',
  ', since', ', though'];

export const BARE_SUBJECTS = ['it', 'they', 'its', 'their'];

export const DEICTIC_SUBJECTS = ['this', 'that', 'these', 'those'];

export const DEICTIC_VERBS = [
  'is', 'are', 'was', 'were', 'does', 'do', 'did', 'has', 'have', 'had', 'will', 'would', 'can',
  'may', 'must', 'means', 'reads', 'says', 'makes', 'leaves', 'takes', 'gives', 'holds', 'costs',
];

export const PAIRED_SUBJECTS = ['the same', 'the other'];

export const CODE_SPAN = /`[^`]*`/g;
export const LINK = /\[([^\]]*)\]\([^)]*\)/g;
export const COMMENT = /<!--[\s\S]*?-->/g;
export const MARKUP = /^[\s>#*+-]+|^\s*\d+\.\s+/;
export const EMPHASIS = /\*\*|__|(?<=\s|^)[*_]|[*_](?=\s|$|[.,;:!?)])/g;
export const SENTENCE_END = /(?<=[.!?])\s+/;

export const EXEMPT = new Map<string, string>([]);

export const NOT_YET_REWRITTEN = new Map<string, string>([
  ['frameworks/*/PACKAGE.md',
   'the two npm pages, whose shared half is emitted from generate-npm-pages.ts and whose other '
   + 'half is written per layer, so the register moves in both halves at once'],
  ['frameworks/INDEX.md',
   'the layer-neutral catalogue, emitted whole from generate-skills.ts, so its register is '
   + 'rewritten in that script and never in the file'],
  ['frameworks/*/INDEX.md',
   'the two layer indexes, emitted from the same script and rewritten with the catalogue above'],
  ['frameworks/*/components/*/INDEX.md',
   'the category indexes, emitted from the same script from one header per category, so all of '
   + 'them move when that header does'],
  ['frameworks/*/components/**/*.prompt.md',
   'the authored half of every component prompt, which is the opening line, the examples and the '
   + 'Do and Don\'t. It is rewritten one component at a time, and the generated halves of the '
   + 'same file are emitted already'],
  ['plugin-style-store/catalogue/*/ENTRY.md',
   'the measured style plugins a project can start from, one card each'],
]);

export const node = {
  name: 'check:register',
  reads: [
    'skills/**/*.md', 'frameworks/**/INDEX.md', 'frameworks/**/PACKAGE.md',
    'frameworks/**/*.prompt.md', 'plugin-style-store/catalogue/*/ENTRY.md',
    '!frameworks/angular/build/**', '!frameworks/react/dist/**', '!frameworks/angular/dist/**',
  ],
  writes: [],
  feeds: [],
};

export function inScope(rel: string) {
  return isConsumerDocument(rel) || Object.hasOwn(BRANCH_SWITCH, rel);
}

export function cells(line: string) {
  return line.startsWith('|') ? line.split('|').map((one) => one.trim()).filter(Boolean) : [line];
}

export function blanked(source: string) {
  return source.replace(FRONTMATTER, (front) => front.replace(/[^\n]/g, ''));
}

export function unregioned(source: string) {
  const kept = [];
  let inside = false;
  for (const line of source.split('\n')) {
    if (!inside && REGION_OPENS.test(line)) { inside = true; kept.push(''); continue; }
    if (inside) { inside = !REGION_CLOSES.test(line); kept.push(''); continue; }
    kept.push(line);
  }
  return kept.join('\n');
}

export function blocks(source: string) {
  const found: { line: number; text: string }[] = [];
  let line = 0;
  let open: { line: number; parts: string[] } | null = null;

  for (const raw of unfenced(unregioned(blanked(source))).split('\n')) {
    line += 1;
    if (raw.trim() === '') { if (open) { found.push({ line: open.line, text: open.parts.join(' ') }); open = null; } continue; }
    if (raw.startsWith('|')) {
      if (open) { found.push({ line: open.line, text: open.parts.join(' ') }); open = null; }
      for (const cell of cells(raw)) found.push({ line, text: cell });
      continue;
    }
    if (!open) open = { line, parts: [] };
    open.parts.push(raw);
  }
  if (open) found.push({ line: open.line, text: open.parts.join(' ') });
  return found;
}

export function plain(text: string) {
  return text
    .replace(COMMENT, ' ')
    .replace(CODE_SPAN, 'CODE')
    .replace(LINK, '$1')
    .replace(MARKUP, '')
    .replace(EMPHASIS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sentencesIn(source: string) {
  const found: { line: number; text: string }[] = [];
  for (const block of blocks(source))
    for (const one of plain(block.text).split(SENTENCE_END)) {
      const text = one.trim();
      if (text !== '') found.push({ line: block.line, text });
    }
  return found;
}

export const words = (text: string) => text.split(' ').filter(Boolean);

export function clauseCount(text: string) {
  const lower = text.toLowerCase();
  return CLAUSE_OPENERS.reduce((count, opener) => count + lower.split(opener).length - 1, 0);
}

export function unnamedSubject(text: string) {
  const said = words(text.toLowerCase());
  const first = said[0] ?? '';
  const second = said[1] ?? '';
  if (BARE_SUBJECTS.includes(first)) return first;
  if (DEICTIC_SUBJECTS.includes(first) && DEICTIC_VERBS.includes(second)) return `${first} ${second}`;
  const pair = `${first} ${second}`;
  return PAIRED_SUBJECTS.includes(pair) ? pair : null;
}

export function sentenceProblems(rel: string, source: string) {
  const problems = [];
  for (const { line, text } of sentencesIn(source)) {
    const said = words(text);
    if (said.length > MAX_WORDS)
      problems.push(`${rel}:${line}: a sentence of ${said.length} words, over ${MAX_WORDS}. Split `
        + `it at the claim it is carrying second: "${said.slice(0, 8).join(' ')}..."`);

    const clauses = clauseCount(text);
    if (clauses > MAX_CLAUSES)
      problems.push(`${rel}:${line}: ${clauses} subordinate clauses hang off one sentence, over `
        + `${MAX_CLAUSES}. Each of them is a claim, and a claim a reader has to hold open is a `
        + `claim they can lose: "${said.slice(0, 8).join(' ')}..."`);

    const unnamed = unnamedSubject(text);
    if (unnamed !== null)
      problems.push(`${rel}:${line}: a sentence opening on "${unnamed}", which names nothing. The `
        + 'antecedent is in a sentence a reader may no longer hold, so name the subject: '
        + `"${said.slice(0, 8).join(' ')}..."`);
  }
  return problems;
}

export function excusedBy(rel: string, specs = [...NOT_YET_REWRITTEN.keys()]) {
  return specs.find((spec) => matchesSpec(spec, rel)) ?? null;
}

export function scoped(base = root, docs = documents(base)) {
  return docs.filter(inScope);
}

export function zeroScanProblems(docs: string[]) {
  return docs.length === 0
    ? ['no consumer document was scanned, so every claim below passed over nothing']
    : [];
}

export function staleExemptProblems(docs: string[]) {
  const known = new Set(docs);
  return [...EXEMPT.keys()]
    .filter((rel) => !known.has(rel))
    .map((rel) => `${rel}: is exempt here and is not a consumer document this gate reads`);
}

export function staleSpecProblems(clean: Map<string, boolean>) {
  const problems = [];
  for (const [spec, reason] of NOT_YET_REWRITTEN) {
    const read = clean.get(spec);
    if (read === undefined)
      problems.push(`${spec}: awaits the rewrite and matches no document this gate reads, so the `
        + `entry excuses nothing: ${reason}`);
    else if (read)
      problems.push(`${spec}: awaits the rewrite and every document it matches already reads in `
        + 'this register. An allowance is not an exemption: drop the entry, or the next paragraph '
        + 'spends a saving nobody argued for');
  }
  return problems;
}

export function collect(base = root) {
  const docs = scoped(base);
  const problems = [...zeroScanProblems(docs), ...staleExemptProblems(docs)];
  const clean = new Map<string, boolean>();
  for (const rel of docs) {
    if (EXEMPT.has(rel)) continue;
    const found = sentenceProblems(rel, readFileSync(join(base, rel), 'utf8'));
    const spec = excusedBy(rel);
    if (spec === null) { problems.push(...found); continue; }
    clean.set(spec, (clean.get(spec) ?? true) && found.length === 0);
  }
  return [...problems, ...staleSpecProblems(clean)];
}

function main() {
  const problems = collect();
  for (const problem of problems) console.error(`check-register: ${problem}`);
  if (problems.length) process.exit(1);
  const docs = scoped();
  const waiting = docs.filter((rel) => excusedBy(rel) !== null).length;
  console.log(`check-register: ${docs.length - waiting} consumer document(s) hold to one claim a `
    + `sentence, ${MAX_WORDS} words and ${MAX_CLAUSES} subordinate clause, and name their own `
    + `subject; ${waiting} await the rewrite under ${NOT_YET_REWRITTEN.size} entr(ies), each with `
    + 'its reason');
}

if (isMainModule(import.meta.url)) main();
