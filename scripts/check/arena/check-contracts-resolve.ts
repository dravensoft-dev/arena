/* Every design token the contracts package carries resolves inside that package alone. This is not
 * a second check:dtcg: that one asks whether a value is well formed here, where the whole tree is
 * present, and this one asks whether a reference still points at something once the CSS chain, the
 * generated emission and everything else the package leaves behind are gone. A reference that
 * resolves in this tree only through a file the package does not carry is the defect that lands in
 * somebody else's generator and that nobody here would ever see. Both branches of a resolver's
 * behaviour are asserted, because an unresolved reference either raises or is left as literal
 * braces in the output depending on the tool, and the failure has to be ours either way. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { childEntries, isToken } from '../../lib/core/dtcg-shapes.ts';
import type { DtcgNode } from '../../lib/core/dtcg-shapes.ts';
import { EXCLUDED } from '../core/check-dtcg.ts';
import { expectedCarried } from './check-contracts-package.ts';

export const node = {
  name: 'check:contracts-resolve',
  reads: ['contracts/design/*.json'],
  writes: [],
  feeds: [],
};

export const DESIGN_DIR = 'contracts/design/';
export const REFERENCE = /\{([a-zA-Z0-9_.-]+)\}/g;

export function carriedDesign(repo = root, files = expectedCarried(repo)) {
  return files.filter((rel) => rel.startsWith(DESIGN_DIR) && !EXCLUDED.has(rel.slice(DESIGN_DIR.length)));
}

export type Held = { path: string; value: unknown; file: string };

export function tokensOf(tree: DtcgNode, file: string) {
  const held: Held[] = [];
  const walk = (n: DtcgNode, path: string[]) => {
    if (isToken(n)) return void held.push({ path: path.join('.'), value: n.$value, file });
    for (const [name, child] of childEntries(n)) walk(child, [...path, name]);
  };
  walk(tree, []);
  return held;
}

export function referencesIn(value: unknown): string[] {
  if (typeof value === 'string') return [...value.matchAll(REFERENCE)].map((m) => m[1] as string);
  if (Array.isArray(value)) return value.flatMap(referencesIn);
  if (value && typeof value === 'object') return Object.values(value).flatMap(referencesIn);
  return [];
}

export function unresolvedProblems(held: Held[]) {
  const names = new Set(held.map((h) => h.path));
  const problems: string[] = [];
  for (const token of held) {
    for (const ref of referencesIn(token.value)) {
      if (names.has(ref)) continue;
      problems.push(`${token.file}:${token.path} references {${ref}}, which no token in the carried `
        + 'set defines. A resolver either raises on it or leaves the braces in its output, and both '
        + 'are a broken value on a platform nobody here builds');
    }
  }
  return problems;
}

export function cycleProblems(held: Held[]) {
  const byName = new Map(held.map((h) => [h.path, h]));
  const problems: string[] = [];
  for (const start of held) {
    const seen = new Set<string>([start.path]);
    let frontier = referencesIn(start.value);
    while (frontier.length) {
      const next: string[] = [];
      for (const ref of frontier) {
        if (seen.has(ref)) {
          if (ref === start.path) {
            problems.push(`${start.file}:${start.path} resolves to itself through ${[...seen].join(' -> ')}, `
              + 'so a resolver walking it never terminates');
          }
          continue;
        }
        seen.add(ref);
        const target = byName.get(ref);
        if (target) next.push(...referencesIn(target.value));
      }
      frontier = next;
    }
  }
  return problems;
}

export function zeroWalkProblems(tokens: number, references: number) {
  const problems: string[] = [];
  if (tokens === 0) {
    problems.push('read 0 design tokens out of the carried set, so every reference below was '
      + 'resolved against nothing; a walk that finds no token is a failure rather than a clean pass');
  }
  if (references === 0) {
    problems.push('found 0 references in the carried set, so this gate resolved nothing. The rhythm '
      + 'steps and the chart paddings are authored as aliases on purpose, so none at all means the '
      + 'walk is looking in the wrong place rather than that the tree stopped using them');
  }
  return problems;
}

export function collect(repo = root) {
  const files = carriedDesign(repo);
  const held = files.flatMap((rel) => tokensOf(JSON.parse(readFileSync(join(repo, rel), 'utf8')), rel));
  const references = held.flatMap((h) => referencesIn(h.value));
  return {
    files,
    held,
    references,
    problems: [
      ...zeroWalkProblems(held.length, references.length),
      ...unresolvedProblems(held),
      ...cycleProblems(held),
    ],
  };
}

function main() {
  const { files, held, references, problems } = collect();
  if (problems.length) {
    console.error(`check-contracts-resolve: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-contracts-resolve: ${references.length} reference(s) across ${held.length} `
    + `token(s) in ${files.length} carried file(s) resolve inside the package, with no cycle`);
}

if (isMainModule(import.meta.url)) main();
