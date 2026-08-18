/* Reads the palette from disk inside main() and not at module top level, because the graph
 * collects a node's declaration by importing the script that carries it. A gate doing its work
 * where an import reaches it cannot be collected, and this one exits the process outright. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../lib/core/validate-palette.mjs';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { rampFailed } from '../../generate/core/arena-to-prod/theme-css.ts';

export const PALETTE = 'contracts/design-generated/palette.generated.css';

export const node = {
  name: 'check:ramp',
  reads: [PALETTE],
  writes: [],
  feeds: [],
};

const SLOTS = 8;

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

function main() {
  const css = readFileSync(join(root, PALETTE), 'utf8');
  const themes = rampReport(css);

  for (const { name, surface, rows, warned } of themes) {
    console.log(`\n${name} — ${SLOTS} slots on surface ${surface}`);
    for (const [label, state, detail] of rows) {
      const glyph = state === true || state === 'pass' ? 'PASS' : state === 'floor' || state === 'relief' ? 'WARN' : 'FAIL';
      console.log(`  [${glyph.padEnd(4)}] ${label.padEnd(22)} ${detail}`);
    }
    for (const [label] of warned) console.log(`  → ${label}: WARN is a FAIL for Arena's ramp — no relief rule is allowed.`);
  }

  const ok = themes.every((t) => t.ok);
  console.log(ok ? '\nRamp OK — both themes clear every gate.\n' : '\nRamp FAILED — fix the marked checks.\n');
  process.exit(ok ? 0 : 1);
}

if (isMainModule(import.meta.url)) main();
