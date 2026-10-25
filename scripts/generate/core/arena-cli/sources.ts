/* The walk over a consumer's own source trees: which files count, which directories and which of
 * the command's own output sheets it never reads, and what each step reads out of them. The output
 * sheets and the sprite module are skipped so the run is a function of the sources alone; the sprite
 * is named by its hash, so spriteFilesIn finds it by that shape. Ships beside the command, so it
 * spells its own byCodeUnit rather than importing one from scripts/. */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { THEME_SHEET, PACKAGE_SHEET, PLUGIN_SHEET, RUNTIME_DATA, SPRITE_MODULE, SPRITE_TYPES, SPRITE_SOURCE, SPRITE_STEM } from './sheets.ts';
import { DEFAULT_PLUGIN } from './theme-css.ts';
import { sourceScope } from './audit.ts';

export const DEFAULT_SOURCE = 'src';

export const SOURCE_EXTENSIONS = ['.html', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css'];
export const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', '.git', '.angular', 'coverage']);
export const RETIRED_ICONS_SHEET = 'icons.generated.css';
export const OUTPUT_SHEETS = new Set([THEME_SHEET, PACKAGE_SHEET, RETIRED_ICONS_SHEET, PLUGIN_SHEET, RUNTIME_DATA, SPRITE_MODULE, SPRITE_TYPES, SPRITE_SOURCE]);
export const SPRITE_FILE = new RegExp(`^${SPRITE_STEM}-[0-9a-f]{10}\\.svg$`);

const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function sourceFiles(path: string) {
  const found: string[] = [];
  const walk = (at: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) => byCodeUnit(a.name, b.name))) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const full = join(at, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (OUTPUT_SHEETS.has(entry.name)) continue;
      if (SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) found.push(full);
    }
  };
  if (!existsSync(path)) return null;
  if (statSync(path).isDirectory()) walk(path); else found.push(path);
  return found;
}

export function spriteFilesIn(dir: string) {
  try {
    return readdirSync(dir).filter((name) => SPRITE_FILE.test(name)).sort(byCodeUnit);
  } catch {
    return [];
  }
}

export function fontFilesIn(dir: string, stems: string[]) {
  const mine = stems.map((stem) => new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[0-9a-f]{10}\\.woff2$`));
  try {
    return readdirSync(dir).filter((name) => mine.some((one) => one.test(name))).sort(byCodeUnit);
  } catch {
    return [];
  }
}

const WRITTEN_FONT = /url\(\s*'\.\/([^'/]+)-[0-9a-f]{10}\.woff2'\s*\)/g;

export function writtenFontStems(dir: string) {
  try {
    return [...new Set([...readFileSync(join(dir, THEME_SHEET), 'utf8').matchAll(WRITTEN_FONT)].map((m) => m[1] as string))];
  } catch {
    return [];
  }
}

export function readSources(paths: string[]) {
  const sources = [];
  for (const path of paths) {
    for (const file of sourceFiles(path) ?? []) sources.push(readFileSync(file, 'utf8'));
  }
  return sources;
}

export function readPluginDirs(path: string, required: boolean): { dirs: string[] } | { error: string } {
  if (!required && !existsSync(path)) return { dirs: [] };
  let config;
  try {
    config = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return { error: `cannot read ${path}: ${(error as Error).message}` };
  }
  const declared = Array.isArray(config?.stylePlugins) ? config.stylePlugins : [];
  return { dirs: declared
    .filter((entry: unknown): entry is string => typeof entry === 'string' && entry.trim() !== DEFAULT_PLUGIN)
    .map((entry: string) => resolve(dirname(resolve(path)), entry.trim())) };
}

export function pluginDirs(options: { config: string }) {
  const read = readPluginDirs(options.config, false);
  return 'dirs' in read ? read.dirs : [];
}

export function auditFiles(paths: string[], dirs: string[]) {
  const seen = new Set<string>();
  const files: string[] = [];
  for (const path of [...paths, ...dirs])
    for (const file of sourceFiles(path) ?? []) {
      const at = resolve(file);
      if (seen.has(at)) continue;
      seen.add(at);
      files.push(file);
    }
  return files;
}

export function owningPlugin(file: string, dirs: string[]) {
  const at = dirs
    .filter((dir) => sourceScope(file, [dir]) === 'plugin')
    .sort((one, two) => two.length - one.length);
  return at[0] ?? null;
}

export function missingSource(paths: string[]) {
  return paths.find((path) => !existsSync(path)) ?? null;
}
