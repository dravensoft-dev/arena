import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { theme, THEMES, PALETTE, HEAT_STEPS, heatTheme, heatReport, cvdRow, rampReport, rampVerdict } from './check-ramp.ts';
import { CVD_KINDS } from '../../lib/core/cvd.ts';
import { validateOrdinal } from '../../lib/core/validate-palette.mjs';
import { derivedColours } from '../../generate/core/arena-cli/theme-css.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

const SLOTS = ['#884da9', '#00a3c0', '#6a59bc', '#c0392b', '#27ae60', '#d35400', '#2980b9', '#8e44ad'];

const sheet = (extra = '') => `:root {\n${
  SLOTS.map((hex, i) => `  --color-cat-${i + 1}: ${hex};`).join('\n')
}\n  --color-base-200: #1d1715;\n${extra}}\n`;

test('a theme is its eight slots and the surface they are measured against', () => {
  assert.deepEqual(theme(sheet(), ':root'), { ramp: SLOTS, surface: '#1d1715' });
});

test('a selector that is not in the sheet is named, never treated as an empty theme', () => {
  assert.throws(() => theme(sheet(), '\\.arena-light'), /no \\.arena-light block found/,
    'an absent theme resolving to no slots would clear every gate by measuring nothing');
});

test('a slot that is not a #rrggbb literal is named by its own custom property', () => {
  const unresolved = sheet().replace('--color-cat-3: #6a59bc;', '--color-cat-3: var(--brand);');
  assert.throws(() => theme(unresolved, ':root'), /--color-cat-3 missing or not a #rrggbb literal/);
});

test('both themes are measured, and the palette they are read from is named once', () => {
  assert.deepEqual(THEMES.map((t) => t.name), ['dark', 'light']);
  assert.deepEqual(THEMES.map((t) => t.mode), ['dark', 'light']);
  assert.match(PALETTE, /^contracts\/design-generated\//,
    'the gate reads the generated palette and never contracts/design/, because the ramp it holds '
    + 'is the one a browser is served');
});

const ARENA = readFileSync(join(root, PALETTE), 'utf8');

const failing = (css: string, theme: string) =>
  heatReport(css).find((t) => t.name === theme)!.rows.filter(([, s]) => s !== true && s !== 'pass').map(([label]) => label);

const withStep = (css: string, step: number, hex: string) =>
  css.replace(new RegExp(`(:root\\s*\\{[^}]*--color-heat-${step}\\s*:\\s*)#[0-9a-fA-F]{6}`), `$1${hex}`);

const okOf = (css: string, name: string) => heatReport(css).find((t) => t.name === name)!.ok;

const darkStep = (step: number) => heatTheme(ARENA, ':root').steps[step - 1]!;

test('Arena\'s generated heat ladder clears every heat row in both themes', () => {
  for (const one of heatReport(ARENA)) assert.equal(one.ok, true, `${one.name}: ${JSON.stringify(one.rows)}`);
});

test('a heat theme is its five steps and the surface they are measured against', () => {
  const { steps, surface } = heatTheme(ARENA, ':root');
  assert.equal(steps.length, HEAT_STEPS);
  assert.equal(surface, theme(ARENA, ':root').surface);
});

test('a step equal to the one below it fails the adjacent gap in that theme only', () => {
  const css = withStep(ARENA, 3, darkStep(2));
  assert.ok(failing(css, 'dark').includes('Adjacent ΔL'));
  assert.equal(okOf(css, 'dark'), false);
  assert.deepEqual(failing(css, 'light'), []);
  assert.equal(okOf(css, 'light'), true);
});

test('a first step equal to the surface fails the light-end floor', () => {
  const css = withStep(ARENA, 1, heatTheme(ARENA, ':root').surface);
  assert.ok(failing(css, 'dark').includes('Light-end contrast'));
  assert.equal(okOf(css, 'dark'), false);
});

test('a ladder out of order fails monotone, under normal vision and under every deficiency', () => {
  const css = withStep(withStep(ARENA, 2, darkStep(4)), 4, darkStep(2));
  const failed = failing(css, 'dark');
  assert.ok(failed.includes('Lightness monotone'));
  assert.equal(okOf(css, 'dark'), false);
  for (const kind of CVD_KINDS) assert.ok(failed.includes(`CVD ${kind}`), `${kind} is out of order too`);
});

test('one deficiency row is reported per kind, after the ordinal rows', () => {
  for (const one of heatReport(ARENA)) {
    assert.deepEqual(one.rows.slice(-CVD_KINDS.length).map(([label]) => label), CVD_KINDS.map((k) => `CVD ${k}`));
  }
});

test('a deficiency row fails a gap under the floor even when the order holds', () => {
  const [, ok] = cvdRow(['#404040', '#424242', '#808080', '#a0a0a0', '#c0c0c0'], 'deutan');
  assert.equal(ok, false);
});

test('the verdict fails on a red heat row even when every categorical row passes', () => {
  const css = withStep(ARENA, 3, darkStep(2));
  const themes = rampReport(css);
  assert.ok(themes.every((t) => t.ok), 'the categorical ramp is untouched');
  assert.equal(rampVerdict(themes, heatReport(css)), false);
  assert.equal(rampVerdict(rampReport(ARENA), heatReport(ARENA)), true);
});

const CATALOGUE = join(root, 'plugin-style-store/catalogue');

const cataloguePalettes = () => readdirSync(CATALOGUE, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap(({ name }) => {
    const config = JSON.parse(readFileSync(join(CATALOGUE, name, 'arena.config.json'), 'utf8'));
    return (config.palettes as { polarity: string; colors: Record<string, string> }[])
      .map((palette) => ({ name: `${name} ${palette.polarity}`, ...palette }));
  });

test('every catalogue palette\'s derived heat ladder clears the heat rows in both themes', () => {
  const palettes = cataloguePalettes();
  assert.deepEqual([...new Set(palettes.map((p) => p.polarity))].sort(), ['dark', 'light']);
  for (const { name, polarity, colors } of palettes) {
    const derived = derivedColours(colors, polarity);
    const steps = Array.from({ length: HEAT_STEPS }, (_, i) => derived[`heat-${i + 1}`]!);
    const options = { mode: polarity, surface: colors['base-200'] };
    const rows = [
      ...(validateOrdinal(steps, options).report as [string, boolean, string][]),
      ...CVD_KINDS.map((kind) => cvdRow(steps, kind)),
    ];
    assert.deepEqual(rows.filter(([, ok]) => ok !== true).map(([label, , detail]) => `${label}: ${detail}`), [],
      `${name}: ${steps.join(' ')}; a shipped plugin answers each heat step with the palette's heat key`);
  }
});
