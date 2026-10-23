/* What a typical Arena screen downloads, held against budgets taken from the start tree (c543cd66, D9). It
 * bundles the twelve components of the spec's screen from the assembled React dist with Arena in a chunk of its
 * own, runs the dist's `arena build` for the sheets, the sprite and the cut fonts, and reads brotli q11 beside
 * the previous build as dictionary. A figure over its budget, or a total over its ceiling, fails. Budgets are
 * start × 1.05; the maintainer raises one, this gate never does. A missing dist stops it, as check:consumer.
 * oneLine is the patch: one line of one file, and an error when that line is not there. */

import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { arenaEnv } from '../../lib/arena/arena-scripts-vars.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { distDir, refuseUnassembled as refuseUnassembledPackages } from './check-packages.ts';
import {
  brotliKB, cssFigures, reactBundle, weightProblems, type Budget, type Ceiling, type Figure, type Patch,
} from '../../lib/arena/weight-measure.ts';

export const node = {
  name: 'check:weight',
  reads: ['frameworks/react/dist/**'],
  writes: [],
  feeds: [],
};

const START = 'the start tree c543cd66, start × 1.05, rounded up to 0.1 KB';

export const BUDGETS: Budget[] = [
  { figure: 'react-js-first-visit', kb: 57.5, reason: `54.74 KB at ${START}` },
  { figure: 'react-js-first-visit-full', kb: 108.8, reason: `103.58 KB at ${START}` },
  { figure: 'react-js-app-release', kb: 0, reason: `0 KB at ${START}` },
  { figure: 'react-js-patch', kb: 0.1, reason: `0.06 KB at ${START}` },
  { figure: 'css-arena-half', kb: 13.1, reason: `12.42 KB at ${START}` },
  { figure: 'css-theme', kb: 13.6, reason: `12.90 KB at ${START}` },
  { figure: 'css-app-release', kb: 0, reason: `0 KB at ${START}` },
  { figure: 'css-patch', kb: 0.1, reason: `0.01 KB at ${START}` },
  { figure: 'sprite', kb: 1.7, reason: `1.55 KB at ${START}` },
  { figure: 'fonts', kb: 54.3, reason: `51.68 KB at ${START}, harfbuzz and wawoff2 (D22)` },
  { figure: 'first-visit-total', kb: 127, reason: `120.87 KB at ${START}, D22` },
];

export const CEILINGS: Ceiling[] = [
  { figure: 'first-visit-total', kb: 145, reason: 'Acceptance: a first visit stays under 145 KB' },
  { figure: 'react-js-app-release', kb: 1, reason: 'Acceptance: an app release re-downloads at most 1 KB of Arena JS' },
  { figure: 'react-js-patch', kb: 1, reason: 'Acceptance: a one-line Arena patch costs at most 1 KB of JS' },
  { figure: 'css-app-release', kb: 0, reason: 'Acceptance: an app release re-downloads no Arena CSS' },
  { figure: 'css-patch', kb: 1, reason: 'Acceptance: a one-line Arena patch costs at most 1 KB of CSS' },
];

export function refuseUnassembled(base = root, env = arenaEnv()) {
  refuseUnassembledPackages('check:weight', base, env, ['react']);
}

export function oneLine(target: string, from: string, to: string): { patch: Patch; applied: () => void } {
  let hit = false;
  return {
    patch: (file, text) => {
      if (file !== target || !text.includes(from)) return text;
      hit = true;
      return text.replace(from, to);
    },
    applied: () => {
      if (!hit) throw new Error(`check-weight: the one-line patch found nothing to change in ${target}: "${from}"`);
    },
  };
}

const sum = (...parts: Uint8Array[]) => Math.round(parts.reduce((total, one) => total + brotliKB(one), 0) * 100) / 100;
const same = (a: Uint8Array, b: Uint8Array) => Buffer.compare(a, b) === 0;

export async function measure(dist: string): Promise<Figure[]> {
  const release: Patch = (file, text) => (file === 'app-logic.js' ? text.replace('Sales dashboard', 'Panel de ventas') : text);
  const typical = await reactBundle(dist, 'typical');
  const full = await reactBundle(dist, 'full');
  const released = await reactBundle(dist, 'typical', release);
  const js = oneLine('components/forms/arena-button/ArenaButton.js', 'type = "button"', 'type = "submit"');
  const patchedJs = await reactBundle(dist, 'typical', js.patch);
  js.applied();

  const css = await cssFigures(dist, 'typical');
  const cssAgain = await cssFigures(dist, 'typical');
  const sheet = oneLine('css/components/arena-button.css', 'display: inline-flex;', 'display: flex;');
  const patchedCss = await cssFigures(dist, 'typical', sheet.patch);
  sheet.applied();

  const fonts = sum(...css.fonts);
  const theme = brotliKB(css.theme);
  const sprite = brotliKB(css.sprite);
  const js1 = sum(typical.app, typical.react, typical.arena);
  return [
    { figure: 'react-js-first-visit', kb: js1 },
    { figure: 'react-js-first-visit-full', kb: sum(full.app, full.react, full.arena) },
    { figure: 'react-js-app-release', kb: same(typical.arena, released.arena) ? 0 : brotliKB(released.arena) },
    { figure: 'react-js-patch', kb: brotliKB(patchedJs.arena, typical.arena) },
    { figure: 'css-arena-half', kb: brotliKB(css.arena) },
    { figure: 'css-theme', kb: theme },
    { figure: 'css-app-release', kb: same(css.arena, cssAgain.arena) ? 0 : brotliKB(cssAgain.arena) },
    { figure: 'css-patch', kb: brotliKB(patchedCss.arena, css.arena) },
    { figure: 'sprite', kb: sprite },
    { figure: 'fonts', kb: fonts },
    { figure: 'first-visit-total', kb: Math.round((js1 + theme + sprite + fonts) * 100) / 100 },
  ];
}

async function main() {
  refuseUnassembled();
  const cache = join(root, '.cache', 'check-weight');
  let figures: Figure[];
  try {
    figures = await measure(distDir('react', root));
  } finally {
    rmSync(cache, { recursive: true, force: true });
  }
  const table = figures.map((f) => {
    const budget = BUDGETS.find((b) => b.figure === f.figure);
    return `  ${f.figure.padEnd(28)} ${String(f.kb).padStart(7)} KB${budget ? `  (budget ${budget.kb})` : ''}`;
  });
  const problems = weightProblems(figures, BUDGETS, CEILINGS);
  if (problems.length > 0) {
    console.error(`check-weight: ${problems.length} problem(s)\n`);
    for (const one of problems) console.error(`  ${one}`);
    console.error(`\n${table.join('\n')}`);
    process.exit(1);
  }
  console.log(`check-weight: a typical Arena screen stays inside its budgets\n${table.join('\n')}`);
}

if (isMainModule(import.meta.url)) await main();
