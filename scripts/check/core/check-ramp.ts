/* Reads the palette from disk inside main() and not at module top level, because the graph
 * collects a node's declaration by importing the script that carries it. A gate doing its work
 * where an import reaches it cannot be collected, and this one exits the process outright.
 * The heat ladder is held here too, repository-only: the vendored validateOrdinal over the five
 * steps, then the same order and gap rules over each step's Machado-simulated lightness, because
 * validateOrdinal simulates no deficiency and a lightness ladder is only worth what it keeps
 * under one. The adopter-facing ramp kind never runs it. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate, validateOrdinal } from '../../lib/core/validate-palette.mjs';
import { CVD_KINDS, simulatedLightness } from '../../lib/core/cvd.ts';
import { ARENA_HEAT_STEPS } from '../../generate/core/arena-cli/palette-keys.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { rampFailed } from '../../generate/core/arena-cli/theme-css.ts';

export const PALETTE = 'contracts/design-generated/palette.generated.css';

export const node = {
  name: 'check:ramp',
  reads: [PALETTE],
  writes: [],
  feeds: [],
};

const SLOTS = 8;

export const HEAT_STEPS = ARENA_HEAT_STEPS;

export const HEAT_MIN_DL = 0.06;

export const THEMES = [
  { name: 'dark', mode: 'dark', selector: ':root' },
  { name: 'light', mode: 'light', selector: '\\.arena-light' },
];

function block(css: string, selector: string) {
  const re = new RegExp(`${selector}\\s*\\{([^}]*)\\}`);
  const m = css.match(re);
  if (!m) throw new Error(`palette.generated.css: no ${selector} block found`);
  return m[1];
}

function readVar(body: string, name: string) {
  const m = body.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`palette.generated.css: --${name} missing or not a #rrggbb literal`);
  return m[1];
}

export function theme(css: string, selector: string) {
  const body = block(css, selector);
  const ramp = Array.from({ length: SLOTS }, (_, i) => readVar(body ?? '', `color-cat-${i + 1}`));
  return { ramp, surface: readVar(body ?? '', 'color-base-200') };
}

export function rampReport(css: string) {
  return THEMES.map((t) => {
    const { ramp, surface } = theme(css, t.selector);
    const options = { mode: t.mode, surface, pairs: 'adjacent' };
    const result = validate(ramp, options);
    const rows = result.report as [string, boolean | string, string][];
    const warned = rows.filter(([, s]) => rampFailed(s) && s !== false && s !== 'fail');
    return { name: t.name, surface, rows, warned, ok: !rows.some(([, s]) => rampFailed(s)) };
  });
}

export function heatTheme(css: string, selector: string) {
  const body = block(css, selector) ?? '';
  const read = (name: string) => readVar(body, name) ?? '';
  const steps = Array.from({ length: HEAT_STEPS }, (_, i) => read(`color-heat-${i + 1}`));
  return { steps, surface: read('color-base-200') };
}

export function cvdRow(steps: readonly string[], kind: (typeof CVD_KINDS)[number]): [string, boolean, string] {
  const ls = steps.map((hex) => simulatedLightness(hex, kind));
  const gaps = ls.slice(1).map((l, i) => l - ls[i]!);
  const rising = gaps.every((g) => g > 0);
  const falling = gaps.every((g) => g < 0);
  const least = Math.min(...gaps.map(Math.abs));
  const ok = (rising || falling) && least >= HEAT_MIN_DL;
  const detail = !(rising || falling)
    ? `out of order: L values ${JSON.stringify(ls.map((l) => +l.toFixed(3)))}`
    : least >= HEAT_MIN_DL ? `monotone, least gap ${least.toFixed(3)}` : `least gap ${least.toFixed(3)} below ${HEAT_MIN_DL}`;
  return [`CVD ${kind}`, ok, detail];
}

export function heatReport(css: string) {
  return THEMES.map((t) => {
    const { steps, surface } = heatTheme(css, t.selector);
    const options = { mode: t.mode, surface };
    const ordinal = validateOrdinal(steps, options).report as [string, boolean | string, string][];
    const rows = [...ordinal, ...CVD_KINDS.map((kind) => cvdRow(steps, kind))];
    return { name: t.name, surface, rows, ok: !rows.some(([, s]) => rampFailed(s)) };
  });
}

export function rampVerdict(themes: readonly { ok: boolean }[], heat: readonly { ok: boolean }[]) {
  return themes.every((t) => t.ok) && heat.every((t) => t.ok);
}

const glyphOf = (state: boolean | string) =>
  (state === true || state === 'pass' ? 'PASS' : state === 'floor' || state === 'relief' ? 'WARN' : 'FAIL');

function main() {
  const css = readFileSync(join(root, PALETTE), 'utf8');
  const themes = rampReport(css);

  for (const { name, surface, rows, warned } of themes) {
    console.log(`\n${name} — ${SLOTS} slots on surface ${surface}`);
    for (const [label, state, detail] of rows) {
      console.log(`  [${glyphOf(state).padEnd(4)}] ${label.padEnd(22)} ${detail}`);
    }
    for (const [label] of warned) console.log(`  → ${label}: WARN is a FAIL for Arena's ramp — no relief rule is allowed.`);
  }

  const heat = heatReport(css);
  for (const { name, surface, rows } of heat) {
    console.log(`\n${name} — ${HEAT_STEPS} heat steps on surface ${surface}`);
    for (const [label, state, detail] of rows) {
      console.log(`  [${glyphOf(state).padEnd(4)}] ${label.padEnd(22)} ${detail}`);
    }
  }

  const ok = rampVerdict(themes, heat);
  console.log(ok ? '\nRamp OK — both themes clear every gate.\n' : '\nRamp FAILED — fix the marked checks.\n');
  process.exit(ok ? 0 : 1);
}

if (isMainModule(import.meta.url)) main();
