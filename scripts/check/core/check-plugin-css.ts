/* Whether a style plugin's stylesheet is still a stylesheet. Nothing compiles the witness or a
 * catalogue entry's sheet before a reader meets it, and the gates that read them look for a
 * pattern, so a selector left open swallows every rule below it and each of those gates stays
 * green while the sheet stops painting what it claims. This gate parses each sheet with the one
 * reader the shipped command uses, parseBlocks, and reports by file and selector the three shapes
 * a pattern cannot see: a block that never closes, a closing brace with no block to close, and a
 * selector rule written inside another selector rule. A rule inside an at-rule is a rule, so
 * `@media` and `@layer` may hold selectors and a selector may not hold one. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { parseBlocks, selectorPath } from '../../generate/core/arena-cli/css-blocks.ts';
import type { CssBlock } from '../../generate/core/arena-cli/css-blocks.ts';
import { CATALOGUE, SHEET, entries } from './check-catalogue.ts';
import { COMPLETE_CSS } from './check-style-plugin-coverage.ts';

export const node = {
  name: 'check:plugin-css',
  reads: [COMPLETE_CSS, `${CATALOGUE}/*/${SHEET}`],
  writes: [],
  feeds: [],
};

export function sheetsIn(base = repoRoot) {
  return [COMPLETE_CSS, ...entries(base).map((name) => `${CATALOGUE}/${name}/${SHEET}`)];
}

function lineOf(css: string, offset: number) {
  return css.slice(0, offset).split('\n').length;
}

function blanked(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

function inSelectorRule(block: CssBlock) {
  for (let at = block.parent; at; at = at.parent)
    if (at.selector && !at.selector.startsWith('@')) return at;
  return null;
}

function walk(block: CssBlock, visit: (one: CssBlock) => void) {
  for (const child of block.children) {
    visit(child);
    walk(child, visit);
  }
}

export function sheetProblems(where: string, source: string) {
  const css = blanked(source);
  const problems: string[] = [];
  let from = 0;
  let last = '';
  while (from <= css.length) {
    const root = parseBlocks(css, from);
    walk(root, (block) => {
      const path = selectorPath(block);
      if (block.close === css.length)
        problems.push(`${where}:${lineOf(css, block.head)} leaves the block ${path} open to the end of `
          + 'the file. Every rule below it is read as part of it, so the sheet stops painting what it '
          + 'claims while each gate that looks for a pattern still finds one: close the block.');
      const outer = block.selector.startsWith('@') ? null : inSelectorRule(block);
      if (outer)
        problems.push(`${where}:${lineOf(css, block.head)} nests the rule ${block.selector} inside `
          + `${selectorPath(outer)}. A style plugin sheet is flat, so a rule inside a selector rule is `
          + 'one that is either missing a closing brace above it or relying on nesting no reader of '
          + 'this sheet has agreed to: write it as a rule of its own.');
    });
    const tail = root.children.at(-1);
    if (tail) last = selectorPath(tail);
    if (root.close >= css.length) break;
    problems.push(`${where}:${lineOf(css, root.close)} closes a block that was never opened`
      + `${last ? `, after the rule ${last}` : ''}. The brace ends nothing, so the rules around it `
      + 'are grouped differently from what the author meant: remove it or open the block it closes.');
    from = root.close + 1;
  }
  return problems;
}

export function zeroScanProblems(found: string[]) {
  if (found.length > 0) return [];
  return ['no stylesheet was read, so every claim here passed over nothing. A witness and a '
    + 'catalogue are what a style plugin is measured against, and a gate that finds neither is '
    + 'reporting on a tree it never opened.'];
}

export function pluginCssProblems(base = repoRoot) {
  const found = sheetsIn(base);
  const problems = [...zeroScanProblems(found)];
  for (const where of found) problems.push(...sheetProblems(where, readFileSync(join(base, where), 'utf8')));
  return { problems, found };
}

function main() {
  const { problems, found } = pluginCssProblems();
  if (problems.length > 0) {
    console.error(`check-plugin-css: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`check-plugin-css: ${found.length} style plugin stylesheet(s) parse with every block `
    + 'closed, no closing brace left over and no selector rule inside another, so a rule that reads as '
    + 'painting a part is a rule that reaches it');
}

if (isMainModule(import.meta.url)) main();
