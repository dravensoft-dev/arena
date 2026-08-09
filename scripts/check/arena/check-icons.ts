/* Nine contracts take an icon as a string, and nothing checked that the string names a glyph.
 * A typo is an empty box: no error, no failing gate, and no way to see it except by looking at
 * the page. The truth is read out of the installed @phosphor-icons/web rather than typed here,
 * because a hand-written list of 1500 names ages the first time the package does. EXEMPT is
 * empty and is meant to stay that way: a name Phosphor does not have is a typo, not a case. */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot as ROOT } from '../../lib/arena/repo-root.ts';

export const node = {
  name: 'check:icons',
  reads: [
    'contracts/**', 'frameworks/**', 'assets/**', 'intro/**',
    '!frameworks/react/dist/**', '!frameworks/angular/dist/**', '!frameworks/angular/build/**',
    '!frameworks/react/vendor/**',
  ],
  writes: [],
  feeds: [],
};


export const PHOSPHOR = 'node_modules/@phosphor-icons/web/src';

export const SCANNED_ROOTS = ['frameworks', 'intro', 'contracts', 'docs'];
export const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.html', '.json', '.md', '.css'];
export const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'build', '.git', 'vendor']);

export const ICON_TOKEN = /\bph(?:-[a-z0-9]+)+\b/g;

export const EXEMPT = new Map<string, string>();

export function weightsFrom(root = ROOT) {
  const base = join(root, PHOSPHOR);
  const weights = new Map();
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sheet = join(base, entry.name, 'style.css');
    if (!existsSync(sheet)) continue;
    const css = readFileSync(sheet, 'utf8');
    const prefix = entry.name === 'regular' ? 'ph' : `ph-${entry.name}`;
    const escaped = prefix.replace(/-/g, '\\-');
    const rx = new RegExp(`^\\.${escaped}\\.(ph-[a-z0-9-]+)`, 'gm');
    const glyphs = new Set([...css.matchAll(rx)].map((m) => m[1]));
    if (glyphs.size > 0) weights.set(prefix, glyphs);
  }
  return weights;
}

export function zeroWeightProblems(weights: Map<string, Set<string>>) {
  if (weights.size > 0) return [];
  return [
    `no weight stylesheet under ${PHOSPHOR}: a gate iterating nothing reports every name valid, `
    + 'which is the vacuous pass this check exists to avoid. Install @phosphor-icons/web.',
  ];
}

export function everyGlyph(weights: Map<string, Set<string>>) {
  const all = new Set();
  for (const glyphs of weights.values()) for (const glyph of glyphs) all.add(glyph);
  return all;
}

export function tokenProblems(text: string, where: string, weights: Map<string, Set<string>>) {
  const glyphs = everyGlyph(weights);
  const problems = [];
  for (const line of text.split('\n').entries()) {
    const [index, source] = line;
    const found = [...source.matchAll(ICON_TOKEN)].map((m) => m[0]);
    if (found.length === 0) continue;
    const weight = found.find((token) => weights.has(token));
    for (const token of found) {
      if (weights.has(token) || EXEMPT.has(token)) continue;
      if (!glyphs.has(token)) {
        problems.push(
          `${where}:${index + 1}: "${token}" is not a Phosphor glyph in any weight, so it renders `
          + 'as an empty box. Check the name at phosphoricons.com, or add it to EXEMPT with a reason.',
        );
        continue;
      }
      if (weight && !weights.get(weight)?.has(token)) {
        problems.push(
          `${where}:${index + 1}: "${token}" is a Phosphor glyph but not in the "${weight}" weight, `
          + 'so this pairing renders as an empty box.',
        );
      }
    }
  }
  return problems;
}

export function scannedFiles(root = ROOT) {
  const skip = (name: string) => name.startsWith('.') || SKIPPED_DIRECTORIES.has(name);
  const found: string[] = [];
  for (const name of SCANNED_ROOTS) {
    const dir = join(root, name);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    found.push(...walkFiles(dir, { skip }).filter((p) => SCANNED_EXTENSIONS.some((e) => p.endsWith(e))));
  }
  return found;
}

export function staleExemptions(seen: Set<string>) {
  return [...EXEMPT.keys()]
    .filter((token) => !seen.has(token))
    .map((token) => `EXEMPT names "${token}", which the tree no longer carries -- drop the exemption`);
}

export function collect(root = ROOT) {
  const weights = weightsFrom(root);
  const problems = zeroWeightProblems(weights);
  if (problems.length > 0) return { problems, scanned: 0, names: 0 };

  const seen = new Set<string>();
  let scanned = 0;
  for (const file of scannedFiles(root)) {
    const text = readFileSync(file, 'utf8');
    if (!text.includes('ph-')) continue;
    scanned += 1;
    const where = relPosix(root, file);
    problems.push(...tokenProblems(text, where, weights));
    for (const [token] of text.matchAll(ICON_TOKEN)) seen.add(token);
  }
  problems.push(...staleExemptions(seen));
  return { problems, scanned, names: seen.size, weights: weights.size };
}

function main() {
  const { problems, scanned, names, weights } = collect();
  if (problems.length > 0) {
    for (const problem of problems) console.error(`check-icons: ${problem}`);
    console.error(`\ncheck-icons: ${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log(
    `check-icons: ${names} icon name(s) across ${scanned} file(s) resolve against ${weights} `
    + `installed Phosphor weight(s); ${EXEMPT.size} exempted on the record`,
  );
}

if (isMainModule(import.meta.url)) main();
