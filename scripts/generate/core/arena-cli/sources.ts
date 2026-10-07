/* The walk over a consumer's own source trees: which files count, which directories and which of
 * the command's own output sheets it never reads, and what each step reads out of them. The output
 * sheets are skipped so the run is a function of the sources alone. Ships beside the command, so it
 * spells its own byCodeUnit rather than importing one from scripts/. */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { THEME_SHEET, ICONS_SHEET, PLUGIN_SHEET } from './sheets.ts';
import { DEFAULT_PLUGIN } from './theme-css.ts';
import { sourceScope } from './audit.ts';

export const DEFAULT_SOURCE = 'src';

export const SOURCE_EXTENSIONS = ['.html', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css'];
export const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', '.git', '.angular', 'coverage']);
export const OUTPUT_SHEETS = new Set([THEME_SHEET, ICONS_SHEET, PLUGIN_SHEET]);

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

export function readSources(paths: string[]) {
  const sources = [];
  for (const path of paths) {
    for (const file of sourceFiles(path) ?? []) sources.push(readFileSync(file, 'utf8'));
  }
  return sources;
}

export function pluginDirs(options: { config: string }) {
  let config;
  try {
    config = JSON.parse(readFileSync(options.config, 'utf8'));
  } catch {
    return [] as string[];
  }
  const declared = Array.isArray(config.stylePlugins) ? config.stylePlugins : [];
  return declared
    .filter((entry: unknown): entry is string => typeof entry === 'string' && entry.trim() !== DEFAULT_PLUGIN)
    .map((entry: string) => resolve(dirname(resolve(options.config)), entry.trim()));
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
