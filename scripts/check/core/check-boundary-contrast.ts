/* WCAG 1.4.11 asks 3:1 of the visual boundary of a user interface component. The hairline is one
 * answer, so where a border is drawn the question never arises; an answer that sets a control's
 * border to zero has moved it onto the fill difference, and this gate is where that claim is
 * measured rather than assumed. It reads the style plugin, because a border width is an answer
 * and the role declaration carries none. A surface is deliberately not asked about: 1.4.11 is
 * about components and a card is not one, so bw-surface may go to zero where bw-field may not. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrast } from '../../lib/core/validate-palette.mjs';
import { paletteBlock, readHex, THEMES } from '../../lib/core/palette-read.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { readJson } from '../../utils/read-file.ts';
import { answeredColour, catalogueEntries, paletteColours, roleDefaults } from './check-text-contrast.ts';
import { CATALOGUE } from './check-catalogue.ts';

export const node = {
  name: 'check:boundary-contrast',
  reads: [
    'plugin-style-store/default/plugin.tokens.json',
    'plugin-style-store/complete/plugin.tokens.json',
    'plugin-style-store/catalogue/*/plugin.tokens.json',
    'plugin-style-store/catalogue/*/arena.config.json',
    'contracts/design/roles.json',
    'contracts/design-generated/palette.generated.css',
  ],
  writes: [],
  feeds: [],
};

export const PLUGIN_DIR = 'plugin-style-store/default';
const ANSWER_DIR = join(repoRoot, PLUGIN_DIR);
export const ANSWERS = 'plugin.tokens.json';
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
  where: string, removed: string[], theme: string, hexes: Record<string, string>,
) {
  const problems = [];
  for (const role of removed) {
    const boundary = BOUNDARIES.find((b) => b.role === role);
    if (!boundary) continue;
    const ratio = contrast(hexes[boundary.fill], hexes[boundary.surround]);
    if (ratio < MIN_RATIO)
      problems.push(
        `${where} sets --${role} to 0 and ${theme} does not carry the boundary that border was drawing: `
        + `--${boundary.fill} against --${boundary.surround} is ${ratio.toFixed(2)}:1, under the 3:1 WCAG 1.4.11 asks of `
        + `a component's boundary. ${boundary.why}. Either keep the border or move the two surfaces apart.`,
      );
  }
  return problems;
}

export type AxisHexes = { axis: string; separator: string; page: string };

export function axisProblems(where: string, theme: string, hexes: AxisHexes) {
  const axis = contrast(hexes.axis, hexes.page);
  const separator = contrast(hexes.separator, hexes.page);
  if (axis > separator) return [];
  return [`${where} answers --edge-axis lighter than --edge-separator in the ${theme} theme `
    + `(${axis.toFixed(2)}:1 against ${separator.toFixed(2)}:1 on base-100), so a chart's axis reads `
    + 'fainter than its grid. Answer edge-axis with a heavier neutral.'];
}

type Answers = Record<string, { $value?: unknown } | undefined>;
type Scope = { where: string; theme: string; colors: Record<string, string> };

export function axisScopes(): Scope[] {
  const palette = readFileSync(join(repoRoot, PALETTE), 'utf8');
  const generated = THEMES.map((theme) => ({
    theme: theme.name, colors: paletteColours(paletteBlock(palette, theme.selector, PALETTE)),
  }));
  const dir = join(repoRoot, CATALOGUE);
  return [
    ...['default', 'complete'].flatMap((name) => generated.map((one) => ({
      where: `plugin-style-store/${name}/${ANSWERS}`, ...one,
    }))),
    ...catalogueEntries().flatMap((entry) => {
      const config = readJson(join(dir, entry, 'arena.config.json')) as
        { palettes?: { name?: string; polarity?: string; colors?: Record<string, string> }[] };
      return (config.palettes ?? []).map((one) => ({
        where: `${CATALOGUE}/${entry}/${ANSWERS}`,
        theme: one.polarity ?? 'dark', colors: one.colors ?? {},
      }));
    }),
  ];
}

export function collectAxis(scopes = axisScopes()) {
  const defaults = roleDefaults(repoRoot);
  return scopes.flatMap(({ where, theme, colors }) => {
    const answers = readJson(join(repoRoot, where)) as Answers & { light?: Answers };
    const colour = (role: string) => answeredColour(
      role, answers, (answers.light ?? {}) as Answers, defaults, colors, theme,
    );
    const hexes = { axis: colour('edge-axis'), separator: colour('edge-separator'), page: colors['base-100'] };
    if (!hexes.axis || !hexes.separator || !hexes.page) {
      return [`${where}: edge-axis or edge-separator does not resolve to a palette colour `
        + `in the ${theme} theme`];
    }
    return axisProblems(where, theme, hexes as AxisHexes);
  });
}

export function zeroBoundaryProblems(count: number) {
  if (count > 0) return [];
  return ['measured 0 boundary(ies) -- an empty result set is a failure, not a clean pass; check the '
    + 'discovery path'];
}

export function collect(dir = ANSWER_DIR, file = ANSWERS) {
  const palette = readFileSync(join(repoRoot, PALETTE), 'utf8');
  const removed = removedBorders(readJson(join(dir, file)));
  if (!removed.length) return [];
  const problems = [];
  for (const theme of THEMES) {
    const body = paletteBlock(palette, theme.selector, PALETTE);
    const hexes = Object.fromEntries(
      [...new Set(BOUNDARIES.flatMap((b) => [b.fill, b.surround]))].map((k) => [k, readHex(body, k)]),
    );
    problems.push(...boundaryProblems(`${PLUGIN_DIR}/${file}`, removed, theme.name, hexes));
  }
  return problems;
}

function main() {
  const zero = zeroBoundaryProblems(BOUNDARIES.length);
  const problems = [...zero, ...(zero.length ? [] : [...collect(), ...collectAxis()])];
  if (problems.length) {
    console.error(`check-boundary-contrast: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-boundary-contrast: ${BOUNDARIES.length} control boundary(ies) in `
    + `${PLUGIN_DIR}/${ANSWERS}, measured in both themes, and every plugin Arena ships draws a chart's axis heavier than its grid`);
}

if (isMainModule(import.meta.url)) main();
