/* Arena's Tailwind v4 theme as a consumer's own compile reads it: the @theme blocks of the preset,
 * with their namespace clearing, and every @utility the preset defines. The plain classes the
 * preset imports ship as sheets of their own and the keyframes ship in the prelude, so neither is
 * carried here, and nothing here is an @import: the consumer's Tailwind is the one that compiles. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../arena/repo-root.ts';

export const THEME_SOURCES = {
  theme: ['frameworks/tailwind/Theme.css', 'frameworks/tailwind/Breakpoints.generated.css'],
  utilities: ['frameworks/tailwind/Animations.css', 'frameworks/tailwind/Case.css', 'frameworks/tailwind/Media.css'],
};

const blankComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));

export function topLevelBlocks(css: string, atRule: '@theme' | '@utility'): string[] {
  const text = blankComments(css);
  const blocks: string[] = [];
  let depth = 0;
  for (let at = 0; at < text.length; at += 1) {
    const ch = text[at];
    if (ch === '{') { depth += 1; continue; }
    if (ch === '}') { depth = Math.max(depth - 1, 0); continue; }
    if (depth !== 0 || !text.startsWith(atRule, at)) continue;
    const open = text.indexOf('{', at);
    if (open === -1) break;
    let inner = 1;
    let close = open + 1;
    for (; close < text.length && inner > 0; close += 1) {
      if (text[close] === '{') inner += 1;
      else if (text[close] === '}') inner -= 1;
    }
    blocks.push(css.slice(at, close));
    at = close - 1;
  }
  return blocks;
}

const HEADER = '/* Arena\'s Tailwind v4 theme and utilities. Import it right after Tailwind itself, and\n'
  + ' * declare any key of your own below this import: each namespace is cleared first, so a key\n'
  + ' * declared above it is cleared with Tailwind\'s defaults. */';

export function tailwindThemeSheet(root = repoRoot) {
  const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
  const themes = THEME_SOURCES.theme.flatMap((rel) => topLevelBlocks(read(rel), '@theme'));
  const utilities = THEME_SOURCES.utilities.flatMap((rel) => topLevelBlocks(read(rel), '@utility'));
  if (themes.length === 0) {
    throw new Error('tailwindThemeSheet: found no @theme block, so the sheet would clear nothing and map nothing');
  }
  return `${HEADER}\n\n${[...themes, ...utilities].join('\n\n')}\n`;
}
