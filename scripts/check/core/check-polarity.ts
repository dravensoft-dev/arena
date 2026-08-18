/* The direction a theme points, held between the two files that state it independently.
 * palette-read.ts:THEMES maps a polarity to the selector its palette answers to, and
 * colors.css declares what that selector means to a browser. Neither reads the other, so a
 * scope added to one and not the other is a page whose native furniture points the wrong way
 * with every other gate green: color-scheme is not a custom property, so no token gate sees
 * it, and it is invisible in a render suite because happy-dom paints nothing. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { THEMES } from '../../lib/core/palette-read.ts';
import { POLARITIES, pickerInvert } from '../../generate/core/arena-to-prod/palette-keys.ts';

export const COLORS = 'contracts/design/colors.css';

export const THEME_TABLE = 'scripts/lib/core/palette-read.ts';

export const node = {
  name: 'check:polarity',
  reads: [COLORS, THEME_TABLE],
  writes: [],
  feeds: [],
};

const COMMENT = /\/\*[\s\S]*?\*\//g;

const SCHEME = /(^|[^-\w])color-scheme\s*:\s*([a-z]+)/;

export function blocksIn(css: string) {
  const out = new Map<string, string>();
  for (const m of css.replace(COMMENT, ' ').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (m[1] ?? '').trim();
    out.set(selector, `${out.get(selector) ?? ''}${m[2] ?? ''}`);
  }
  return out;
}

export function schemeOf(body: string) {
  return SCHEME.exec(body)?.[2] ?? null;
}

export function invertOf(body: string) {
  return /--picker-invert\s*:\s*([\d.]+)/.exec(body)?.[1] ?? null;
}

export function vocabularyProblems(themes: typeof THEMES) {
  return themes
    .filter((theme) => !POLARITIES.includes(theme.name))
    .map((theme) => `${THEME_TABLE} names the theme "${theme.name}", which is not one of `
      + `${POLARITIES.join(', ')}. The polarity IS the color-scheme keyword, with no mapping in `
      + 'between, so a third word here is one the property drops as invalid and the browser answers '
      + 'with its own default');
}

export function scopeOf(blocks: Map<string, string>, theme: { selector: string }) {
  const answers = new RegExp(`^${theme.selector}$`);
  return [...blocks.keys()].find((selector) => answers.test(selector)) ?? null;
}

export function declaredProblems(blocks: Map<string, string>, themes: typeof THEMES) {
  const problems = [];
  for (const theme of themes) {
    const selector = scopeOf(blocks, theme);
    const body = selector === null ? undefined : blocks.get(selector);
    if (body === undefined || selector === null) {
      problems.push(`${COLORS} declares no block answering to /${theme.selector}/, and ${THEME_TABLE} `
        + `says that is where a ${theme.name} palette answers, so nothing states which way that theme `
        + 'points');
      continue;
    }
    const scheme = schemeOf(body);
    if (scheme !== theme.name) {
      problems.push(`${selector} declares color-scheme:${scheme ?? '(nothing)'} and ${THEME_TABLE} calls `
        + `it the ${theme.name} theme. The browser draws its scrollbars, its native controls, its `
        + 'autofill and the canvas it paints wherever nothing else does against this one word');
    }
    const invert = invertOf(body);
    if (invert !== String(pickerInvert(theme.name))) {
      problems.push(`${selector} declares --picker-invert:${invert ?? '(nothing)'} and a ${theme.name} `
        + `theme inverts by ${pickerInvert(theme.name)}. The two are one direction stated twice, so a `
        + 'date picker glyph drawn the wrong way round is the same defect as a scrollbar drawn it');
    }
  }
  return problems;
}

export function strayProblems(blocks: Map<string, string>, themes: typeof THEMES) {
  const known = new Set(themes.flatMap((theme) => {
    const selector = scopeOf(blocks, theme);
    return selector === null ? [] : [selector];
  }));
  return [...blocks]
    .filter(([selector, body]) => !known.has(selector) && schemeOf(body) !== null)
    .map(([selector]) => `${selector} declares a color-scheme and ${THEME_TABLE} names no theme for it, `
      + 'so a scope carries a direction nothing else in the tree agrees with. Add it to THEMES, or '
      + 'take the declaration off a selector that answers no polarity');
}

export function zeroProblems(count: number) {
  if (count > 0) return [];
  return [`${THEME_TABLE} names 0 theme(s), so this gate compared nothing; an empty result set is a `
    + 'failure rather than a clean pass'];
}

export function collect(base = repoRoot) {
  const blocks = blocksIn(readFileSync(join(base, COLORS), 'utf8'));
  const zero = zeroProblems(THEMES.length);
  if (zero.length) return { problems: zero, themes: THEMES.length };
  return {
    problems: [
      ...vocabularyProblems(THEMES),
      ...declaredProblems(blocks, THEMES),
      ...strayProblems(blocks, THEMES),
    ],
    themes: THEMES.length,
  };
}

function main() {
  const { problems, themes } = collect();
  if (problems.length > 0) {
    console.error(`check-polarity: ${problems.length} problem(s)\n`);
    for (const one of problems) console.error(`  ${one}`);
    process.exit(1);
  }
  console.log(`check-polarity: ${themes} theme(s) point the same way in ${COLORS} and ${THEME_TABLE}, `
    + 'so the scheme a browser reads and the selector a palette answers to are one decision');
}

if (isMainModule(import.meta.url)) main();
