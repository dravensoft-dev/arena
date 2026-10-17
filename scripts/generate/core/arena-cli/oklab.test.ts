import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { composite, darkenOklab, errorFill, FILL_FALLBACK_KEEP, heatLadder, toOklab } from './oklab.ts';
import { contrast } from './validate-palette.mjs';
import { validateOrdinal } from '../../../lib/core/validate-palette.mjs';
import { CVD_KINDS } from '../../../lib/core/cvd.ts';
import { cvdRow } from '../../../check/core/check-ramp.ts';
import { repoRoot as root } from '../../../lib/arena/repo-root.ts';

test('a level composited over a surface is the colour that ends up painted', () => {
  assert.equal(composite('#ffffff', '#000000', 100), '#ffffff');
  assert.equal(composite('#ffffff', '#000000', 0), '#000000');
  assert.equal(composite('#ffffff', '#000000', 50), '#808080');
});

test('darkening keeps a proportion of every oklab channel', () => {
  assert.equal(darkenOklab('#c0392f', FILL_FALLBACK_KEEP), '#9a2c24');
});

test('a fill derived against white content darkens, which is what Arena wears', () => {
  assert.equal(errorFill('#c0392f', '#ffffff'), '#9a2c24',
    'both Arena themes put white on the filled danger, so both derive downwards');
});

test('a fill derived against dark content moves away from it rather than toward it', () => {
  const error = '#ff7369';
  const content = '#191919';
  const derived = errorFill(error, content);
  assert.ok(contrast(derived, content) >= 4.5,
    `${derived} on ${content} is ${contrast(derived, content).toFixed(2)}:1; a palette whose `
    + 'error-content IS the dark page gets a fill pushed under AA by darkening');
});

const skin = (theme: string) => {
  const json = JSON.parse(readFileSync(join(root, `contracts/design/palette.${theme}.json`), 'utf8')).color;
  return (key: string) => json[key].$value.hex as string;
};

const heatFailures = (steps: string[], mode: string, surface: string) => {
  const options = { mode, surface };
  return [
    ...(validateOrdinal(steps, options).report as [string, boolean, string][]),
    ...CVD_KINDS.map((kind) => cvdRow(steps, kind)),
  ].filter(([, ok]) => ok !== true).map(([label, , detail]) => `${label}: ${detail}`);
};

test('the heat ladder derived from Arena\'s own slot, surface and ink clears the gate\'s rules in both themes', () => {
  for (const theme of ['dark', 'light']) {
    const hex = skin(theme);
    const steps = heatLadder(hex('cat-4'), hex('base-200'), hex('base-content'), theme);
    assert.deepEqual(heatFailures(steps, theme, hex('base-200')), [],
      `${theme}: a palette that pins no heat step gets a ladder check:ramp would hold`);
  }
});

test('the heat ladder Arena pins clears the gate\'s rules in both themes', () => {
  for (const theme of ['dark', 'light']) {
    const hex = skin(theme);
    const steps = ['heat-1', 'heat-2', 'heat-3', 'heat-4', 'heat-5'].map(hex);
    assert.deepEqual(heatFailures(steps, theme, hex('base-200')), [], theme);
  }
});

test('the first derived step sits just past the 2:1 floor from the surface, whatever the slot', () => {
  for (const [slot, surface, ink, theme] of [
    ['#ffc800', '#f7f7f7', '#4b4b4b', 'light'], ['#6a59bc', '#1d1715', '#f3ede5', 'dark'],
  ] as const) {
    const ratio = contrast(heatLadder(slot, surface, ink, theme)[0]!, surface);
    assert.ok(ratio >= 2 && ratio < 2.2, `${slot} on ${surface}: step 1 at ${ratio.toFixed(2)}:1`);
  }
});

test('a pale slot on a pale surface still spreads its five steps by equal lightness gaps', () => {
  const ls = heatLadder('#ffc800', '#f7f7f7', '#4b4b4b', 'light').map((one) => toOklab(one)[0]);
  const gaps = ls.slice(1).map((l, i) => ls[i]! - l);
  for (const gap of gaps) assert.ok(Math.abs(gap - gaps[0]!) < 0.01 && gap >= 0.06, JSON.stringify(gaps));
});

test('an ink too near the floor leaves no room for the gaps, and the five steps still come out ordered', () => {
  const surface = '#f7f7f7';
  const steps = heatLadder('#6a59bc', surface, '#767676', 'light');
  const ls = steps.map((one) => toOklab(one)[0]);
  assert.equal(steps.length, 5);
  assert.ok(ls.slice(1).every((l, i) => l < ls[i]!), JSON.stringify(ls));
  assert.ok(heatFailures(steps, 'light', surface).some((one) => one.startsWith('Adjacent ΔL')),
    'an ink near 4.2:1 sits about 0.19 in lightness past a 2:1 step 1, too little for four gaps of 0.06');
});

test('a heat step is a #rrggbb literal, so the gate and the command read it as a palette colour', () => {
  for (const one of heatLadder('#6a59bc', '#ffffff', '#000000', 'light')) assert.match(one, /^#[0-9a-f]{6}$/);
});
