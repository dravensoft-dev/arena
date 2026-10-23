/* The Phosphor sprite: one <symbol> per glyph a project draws, read from @phosphor-icons/core, and
 * the content-hashed name the file is written under. Imports only node built-ins, because the CLI
 * ships as bin/*.mjs and carries nothing from outside it. The output is sorted by symbol id and
 * holds no timestamp, so the same glyphs give the same bytes. */

import { createHash } from 'node:crypto';
import { join } from 'node:path';

export function symbolId(weight: string, name: string) {
  return weight === 'regular' ? `ph-${name}` : `ph-${weight}-${name}`;
}

export function glyphFile(core: string, weight: string, name: string) {
  return join(core, 'assets', weight, weight === 'regular' ? `${name}.svg` : `${name}-${weight}.svg`);
}

const inner = (source: string) => source.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '').trim();

const rootFill = (source: string) => /<svg\b[^>]*\sfill="([^"]*)"/.exec(source)?.[1] ?? 'currentColor';

export function spriteSvg(
  glyphs: { weight: string; glyphs: Set<string> }[],
  read: (weight: string, name: string) => string | null,
) {
  const symbols = new Map<string, string>();
  const missing = new Map<string, string[]>();
  for (const { weight, glyphs: names } of glyphs) {
    for (const name of names) {
      const source = read(weight, name);
      if (source === null) {
        missing.set(weight, [...(missing.get(weight) ?? []), name].sort());
        continue;
      }
      const id = symbolId(weight, name);
      symbols.set(id, `<symbol id="${id}" viewBox="0 0 256 256" fill="${rootFill(source)}">${inner(source)}</symbol>`);
    }
  }
  const body = [...symbols.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, symbol]) => symbol);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor">\n${body.join('\n')}\n</svg>\n`;
  return { svg, missing: new Map([...missing].sort(([a], [b]) => (a < b ? -1 : 1))), kept: symbols.size };
}

export function contentName(stem: string, ext: string, bytes: string | Uint8Array) {
  return `${stem}-${createHash('sha256').update(bytes).digest('hex').slice(0, 10)}.${ext}`;
}

export function spriteModule(file: string) {
  return {
    js: `export const ARENA_SPRITE = '${file}';\n`,
    dts: 'export declare const ARENA_SPRITE: string;\n',
  };
}
