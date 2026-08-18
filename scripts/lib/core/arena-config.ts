/* Arena's own skin and the plugin it plugs in, expressed as the arena.config.json a consumer
 * writes. Two things read it: check-packages.ts, which runs the CLI over it and holds the result
 * equivalent to the Style Dictionary output, and the assembly, which writes it into each package
 * as the example a consumer starts from. Deriving it beats writing it twice, because the example
 * a reader copies is then the palette the gate proved.
 * A weight query is a list and never a `min..max` range: Google serves a range only when it
 * lies inside that family's own wght axis and answers 400 otherwise, and Arena declares
 * weights up to 900 across families whose axes stop at 700. A list is clamped to the
 * nearest weight the family has, so one query holds for every family. */

import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { childEntries } from './dtcg-shapes.ts';

export const GOOGLE_FONTS = 'https://fonts.googleapis.com/css2';

const skin = (root: string, theme: string) =>
  readJson(join(root, `contracts/design/palette.${theme}.json`)).color;

export function paletteColors(root: string, theme: string) {
  const out: Record<string, string> = {};
  for (const [key, token] of childEntries(skin(root, theme))) {
    out[key] = (token.$value as { hex: string }).hex;
  }
  return out;
}

const typographyContract = (root: string) =>
  readJson(join(root, 'contracts/design/typography.json'));

export function fontWeights(root: string) {
  return childEntries(typographyContract(root).fw)
    .map(([, token]) => token.$value as number)
    .sort((a, b) => a - b);
}

export function googleFontsUrl(family: string, weights: number[]) {
  return `${GOOGLE_FONTS}?family=${family.replace(/ /g, '+')}:wght@${weights.join(';')}&display=swap`;
}

export function fontEntries(root: string) {
  const weights = fontWeights(root);

  const out: Record<string, { family: string; src: string }> = {};
  for (const [role, token] of childEntries(typographyContract(root).font)) {
    const family = (token.$value as string[])[0] ?? '';
    out[role] = { family, src: googleFontsUrl(family, weights) };
  }
  return out;
}

export function arenaConfig(root: string, themes = ['dark', 'light']) {
  return {
    stylePlugins: ['default'],
    palettes: themes.map((theme, i) => ({
      name: theme,
      ...(i === 0 ? { default: true } : {}),
      polarity: theme === 'light' ? 'light' : 'dark',
      colors: paletteColors(root, theme),
    })),
    fonts: fontEntries(root),
  };
}
