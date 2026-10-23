/* The fixtures the CLI suites share. `removeFixtures` removes every directory `project`, `phosphor`
 * and `hostRoot` made, and a suite importing any of them calls it in its own `after`, so a direct
 * `bun test` leaves nothing behind. */

import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preProcessFile } from 'typescript';
import { PALETTE_KEYS } from './palette-keys.ts';
import { parseArgs } from './args.ts';
import type { Options } from './args.ts';
import type { ComponentMap } from './components.ts';
import type { HostEnvironment } from './host.ts';
import type { Io } from './io.ts';
import { RESERVED } from './style-plugin-rules.ts';

const made: string[] = [];

function track(dir: string) {
  made.push(dir);
  return dir;
}

export function removeFixtures() {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
}

export async function whileHeld<T>(name: string, body: () => T | Promise<T>): Promise<T> {
  RESERVED.set(name, 'ArenaHeld, a name held for one case (spec 00)');
  try {
    return await body();
  } finally {
    RESERVED.delete(name);
  }
}

const HEAT_LADDER = ['#2a2020', '#443838', '#665858', '#8c7e7e', '#b8aaaa'];

export const colors = (overrides: Record<string, string> = {}): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const key of PALETTE_KEYS) out[key] = '#141010';
  HEAT_LADDER.forEach((hex, i) => { out[`heat-${i + 1}`] = hex; });
  return { ...out, ...overrides };
};

export const readable = {
  palettes: [{ name: 'dark', default: true, polarity: 'dark',
    colors: colors({ 'base-content': '#f3ede5',
      'cat-1': '#3c7b0a', 'cat-2': '#3b63be', 'cat-3': '#0a924b', 'cat-4': '#6a59bc',
      'cat-5': '#00a3c0', 'cat-6': '#884da9', 'cat-7': '#00a99a', 'cat-8': '#984697' }) }],
  fonts: {
    display: { family: 'Archivo', src: 'https://example.com/a.woff2' },
    body: { family: 'Familjen Grotesk', src: 'https://example.com/b.woff2' },
    mono: { family: 'Spline Sans Mono', src: 'https://example.com/m.woff2' },
  },
};

export const PHOSPHOR_GLYPHS = ['bell', 'moon', 'sun', 'house'];

export const phosphorSvg = (name: string, weight: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M0 0 ${name} ${weight}"/></svg>`;

export function phosphor(weights: string[] = ['bold', 'fill'], glyphs: string[] = PHOSPHOR_GLYPHS) {
  const root = track(mkdtempSync(join(tmpdir(), 'arena-phosphor-')));
  const core = join(root, 'node_modules', '@phosphor-icons', 'core');
  mkdirSync(core, { recursive: true });
  writeFileSync(join(core, 'package.json'), JSON.stringify({ name: '@phosphor-icons/core' }));
  for (const weight of weights) {
    const dir = join(core, 'assets', weight);
    mkdirSync(dir, { recursive: true });
    for (const name of glyphs) {
      writeFileSync(join(dir, weight === 'regular' ? `${name}.svg` : `${name}-${weight}.svg`), phosphorSvg(name, weight));
    }
  }
  return { root, core };
}

export function project(config: any = readable, files: Record<string, string> = { 'app.html': '<i class="ph-bold ph-bell"></i>' }) {
  const root = track(mkdtempSync(join(tmpdir(), 'arena-')));
  mkdirSync(join(root, 'src'), { recursive: true });
  if (config) writeFileSync(join(root, 'arena.config.json'), JSON.stringify(config));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(root, 'src', name), content);
  return root;
}

export function options(root: string, extra: { importHeader?: boolean } = {}): Options {
  const parsed = parseArgs('build', [
    '--config', join(root, 'arena.config.json'), '--src', join(root, 'src'), '-o', join(root, 'src'),
    ...(extra.importHeader === false ? ['--no-import'] : []),
  ]);
  if (parsed.kind !== 'options') throw new Error('the fixture arguments do not parse');
  return parsed.options;
}

export function quietly(run: () => void) {
  const log = console.log, error = console.error;
  const said: string[] = [];
  console.log = (m) => said.push(m);
  console.error = (m) => said.push(m);
  try { return { code: run(), said }; } finally { console.log = log; console.error = error; }
}

export const MAP: ComponentMap = {
  match: 'selector',
  draws: { 'arena-button': 'button', 'arena-table': 'table', 'arena-bar-chart': null },
  needs: { table: ['pagination', 'select'] },
};

export const SHEETS = { layers: ['css/base.css', 'css/components.css'], components: ['button', 'pagination', 'select', 'table'] };

export const auto = { ...readable, stylesheet: { components: 'auto' } };

export function captureIo(cwd: string, environment: HostEnvironment = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const io: Io = { out: (line) => out.push(line), err: (line) => err.push(line), cwd, environment, node: 'v22.12.0' };
  return { io, out, err };
}

export function hostRoot(name: string, version: string, files: Record<string, string> = {}) {
  const root = track(mkdtempSync(join(tmpdir(), 'arena-host-root-')));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name, version }));
  writeFileSync(join(root, 'arena.config.example.json'), JSON.stringify({ palettes: [] }));
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

export function nodeImportsReachedFrom(file: string): string[] {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
  const seen = new Set<string>();
  const found: string[] = [];
  const visit = (path: string) => {
    if (seen.has(path)) return;
    seen.add(path);
    const text = readFileSync(path, 'utf8');
    for (const { fileName: specifier } of preProcessFile(text, true, true).importedFiles) {
      if (specifier.startsWith('node:')) found.push(`${basename(path)}: ${specifier}`);
      else if (/^\.\.?\/.*\.(?:m?[jt]s)$/.test(specifier)) {
        const next = resolve(dirname(path), specifier);
        if (!existsSync(next)) throw new Error(`${basename(path)} imports ${specifier}, which does not exist`);
        visit(next);
      }
    }
  };
  visit(resolve(root, file));
  return found;
}

function sfntTable(sfnt: Uint8Array, name: string) {
  const view = new DataView(sfnt.buffer, sfnt.byteOffset, sfnt.byteLength);
  for (let i = 0; i < view.getUint16(4); i++) {
    const record = 12 + i * 16;
    const tag = String.fromCharCode(...sfnt.slice(record, record + 4));
    if (tag === name) return { view, at: view.getUint32(record + 8) };
  }
  return null;
}

export function layoutFeatures(sfnt: Uint8Array): string[] {
  const found = new Set<string>();
  for (const name of ['GSUB', 'GPOS']) {
    const gsubOrGpos = sfntTable(sfnt, name);
    if (!gsubOrGpos) continue;
    const { view, at } = gsubOrGpos;
    const list = at + view.getUint16(at + 6);
    for (let i = 0; i < view.getUint16(list); i++) {
      const record = list + 2 + i * 6;
      found.add(String.fromCharCode(...Array.from({ length: 4 }, (_, k) => view.getUint8(record + k))));
    }
  }
  return [...found].sort();
}

export function nameRecords(sfnt: Uint8Array): number {
  const found = sfntTable(sfnt, 'name');
  return found ? found.view.getUint16(found.at + 2) : 0;
}
