/* WCAG 1.4.11 asks 3:1 of the visual boundary of a user interface component. Arena's default
 * answer is the hairline, so the question never arises; a design extension that sets a control's
 * border to zero has moved the answer onto the fill difference, and this gate is where that claim
 * is measured rather than assumed. A surface is deliberately not asked about: 1.4.11 is about
 * components and a card is not one, which is why showcase may drop bw-surface and not bw-field. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrast } from '../../lib/core/validate-palette.mjs';
import { paletteBlock, readHex, THEMES } from '../../lib/core/palette-read.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { extensionFiles, extensionName } from './check-extensions.ts';
import { readJson } from '../../utils/read-file.ts';

export const node = {
  name: 'check:boundary-contrast',
  reads: ['contracts/design', 'contracts/design-generated/palette.generated.css'],
  writes: [],
  feeds: [],
};

const DESIGN_DIR = join(repoRoot, 'contracts/design');
const PALETTE = 'contracts/design-generated/palette.generated.css';
export const MIN_RATIO = 3;

export const BOUNDARIES = [
  {
    role: 'bw-field',
    fill: 'color-base-300',
    surround: 'color-base-200',
    why: 'a field sits on a card, and with no border the only thing saying where it starts is the step between base-300 and base-200',
  },
  {
    role: 'bw-control',
    fill: 'color-base-200',
    surround: 'color-base-100',
    why: 'a secondary button sits on the page, and with no border the step between base-200 and base-100 is the whole boundary',
  },
];

type Token = { $value?: unknown };

function isZero(value: unknown) {
  return typeof value === 'object' && value !== null
    && (value as { value?: number }).value === 0;
}

export function removedBorders(tokens: Record<string, Token>) {
  return BOUNDARIES.map((b) => b.role).filter((role) => isZero(tokens[role]?.$value));
}

export function boundaryProblems(
  name: string, removed: string[], theme: string, hexes: Record<string, string>,
) {
  const problems = [];
  for (const role of removed) {
    const boundary = BOUNDARIES.find((b) => b.role === role);
    if (!boundary) continue;
    const ratio = contrast(hexes[boundary.fill], hexes[boundary.surround]);
    if (ratio < MIN_RATIO)
      problems.push(
        `extension.${name}.json sets --${role} to 0 and ${theme} does not carry the boundary that border was drawing: `
        + `--${boundary.fill} against --${boundary.surround} is ${ratio.toFixed(2)}:1, under the 3:1 WCAG 1.4.11 asks of `
        + `a component's boundary. ${boundary.why}. Either keep the border or move the two surfaces apart.`,
      );
  }
  return problems;
}

export function collect(dir = DESIGN_DIR) {
  const palette = readFileSync(join(repoRoot, PALETTE), 'utf8');
  const problems = [];
  for (const file of extensionFiles(dir)) {
    const removed = removedBorders(readJson(join(dir, file)));
    if (!removed.length) continue;
    for (const theme of THEMES) {
      const body = paletteBlock(palette, theme.selector, PALETTE);
      const hexes = Object.fromEntries(
        [...new Set(BOUNDARIES.flatMap((b) => [b.fill, b.surround]))].map((k) => [k, readHex(body, k)]),
      );
      problems.push(...boundaryProblems(extensionName(file), removed, theme.name, hexes));
    }
  }
  return problems;
}

function main() {
  const files = extensionFiles();
  if (files.length === 0) {
    console.error('check-boundary-contrast: found 0 extensions -- an empty result set is a failure, not a clean pass; check the discovery path');
    process.exit(1);
  }
  const problems = collect();
  if (problems.length) {
    console.error(`check-boundary-contrast: ${problems.length} boundary(ies) below 3:1\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-boundary-contrast: ${files.length} extension(s), ${BOUNDARIES.length} control boundary(ies) each, measured in both themes`);
}

if (isMainModule(import.meta.url)) main();
