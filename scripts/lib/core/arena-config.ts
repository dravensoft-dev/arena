/* Arena's own skin and the plugin it plugs in, expressed as the arena.config.json a consumer
 * writes. check-packages.ts runs the CLI over it and holds the result equivalent to the Style
 * Dictionary output, and the assembly writes it into each package as the example a consumer
 * starts from. Deriving it beats writing it twice, because the example a reader copies is then
 * the palette the gate proved. The fonts are the woff2 files of assets/fonts, which both packages
 * carry as fonts/ and arena init copies beside the config, so each src is a path the build cuts.
 * googleFontsUrl stays for fetch-fonts.ts: a weight query is a list and never a min..max range,
 * because Google answers 400 for a range outside the family's own axis. */

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

export const FONT_RECORD = 'assets/fonts/Fonts.generated.json';

export const FONTS_DIR = 'fonts';

export function fontEntries(root: string) {
  const record = readJson(join(root, ...FONT_RECORD.split('/'))) as Record<string, { family: string; weights: [number, number] }>;
  const out: Record<string, { family: string; src: string; weight: string }> = {};
  for (const [role, token] of childEntries(typographyContract(root).font)) {
    const family = (token.$value as string[])[0] ?? '';
    const file = `${family.toLowerCase().replace(/\s+/g, '-')}.woff2`;
    const held = record[file];
    if (!held) throw new Error(`arena-config: ${FONT_RECORD} holds no ${file} for fonts.${role} (${family}); run fetch-fonts.ts`);
    out[role] = { family, src: `./${FONTS_DIR}/${file}`, weight: held.weights.join(' ') };
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
