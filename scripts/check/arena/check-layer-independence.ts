/* Every framework layer stands on contracts/ alone. A file under frameworks/<A> may not
 * name layer B nor any of B's source files, and the one edge that survives is a page linking
 * the compiled CSS under frameworks/tailwind/consume/ -- ALLOWED_SPECIFIERS carries it, and a
 * pattern matching nothing is stale, so it fails the day the link goes. A reference is judged
 * by where it LANDS rather than by the string, because `../../../tailwind/` names the layer as
 * surely as `frameworks/tailwind/` and no token would see it. Detection is textual as well,
 * because the coupling this gate exists to kill was almost entirely prose: an import graph was
 * already clean while 88 sentences made one layer normative for another. A token is matched
 * case-sensitively so a gate or script name (check:angular, test:react, build:tailwind) is
 * not mistaken for a citation of the layer itself. */

import { readFileSync } from 'node:fs';
import { join, basename, relative, extname, dirname, resolve } from 'node:path';
import { toPosix, relPosix } from '../../utils/posix-path.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { LAYERS } from '../../lib/arena/layers.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const node = {
  name: 'check:layer-independence',
  reads: [
    'frameworks/react/**', 'frameworks/angular/**', 'frameworks/tailwind/**',
    '!frameworks/angular/build/**', '!frameworks/react/dist/**', '!frameworks/angular/dist/**',
  ],
  writes: [],
  feeds: [],
};


export const LAYER_TOKENS: Record<string, [string, RegExp][]> = {
  react: [
    ['React', /\bReact\b/],
    ['.tsx', /\.tsx\b/],
    ['frameworks/react', /frameworks\/react\b/],
    ['UseDialogModal', /\bUseDialogModal\b/],
  ],
  angular: [
    ['Angular', /\bAngular\b/],
    ['frameworks/angular', /frameworks\/angular\b/],
    ['FocusTrap', /\bFocusTrap\b/],
    ['TestbedEnv', /\bTestbedEnv\b/],
    ['.variants.ts', /\.variants\.ts\b/],
  ],
  tailwind: [
    ['Tailwind', /\bTailwind\b/],
    ['frameworks/tailwind', /frameworks\/tailwind\b/],
    ['.manifest.json', /\.manifest\.json\b/],
  ],
};

export const FORBIDDEN: Record<string, string[]> = {
  react: ['angular', 'tailwind'],
  angular: ['react'],
  tailwind: ['react', 'angular'],
};

export const ALLOWED = new Map<string, string>([]);

export const ALLOWED_SPECIFIERS = new Map([
  [/^frameworks\/tailwind\/consume\//,
    'the compiled CSS every layer renders, which exists once rather than as a byte-identical '
    + 'copy per layer. A page LINKS it and nothing else: no source of another layer is read, no '
    + 'behaviour is derived, and the whole directory is generated, so there is nothing there to '
    + 'make one layer normative for another.'],
]);

export const EXEMPT = new Map<string, string>([]);

const SCAN_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.json', '.css', '.html', '.md']);
export const MODULE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs']);
export const REFERENCE_EXT = new Set([...MODULE_EXT, '.html']);
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'build', 'dist']);

export function layerFiles(layerDir: string): string[] {
  return walkFiles(layerDir, { skip: (name) => SKIP_DIRS.has(name) })
    .filter((path) => SCAN_EXT.has(extname(path)) && !basename(path).includes('.generated.'));
}

export function foreignTokens(layer: string) {
  return (FORBIDDEN[layer] ?? [])
    .flatMap((other) => (LAYER_TOKENS[other] ?? []).map(([token, re]) => ({ other, token, re })));
}

export function textualHits(text: string, tokens: ReturnType<typeof foreignTokens>) {
  const hits = [];
  const lines = text.split('\n');
  for (const [index, line] of lines.entries())
    for (const { other, token, re } of tokens)
      if (re.test(line)) hits.push({ other, token, line: index + 1, text: line.trim() });
  return hits;
}

const SPECIFIER = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
const HTML_REFERENCE = /(?:href|src)\s*=\s*["']([^"']+)["']/g;

export function referencesIn(text: string, ext: string) {
  return [...text.matchAll(MODULE_EXT.has(ext) ? SPECIFIER : HTML_REFERENCE)].map((m) => m[1]);
}

export function escapingSpecifiers(text: string, filePath: string, layer: string) {
  const foreign = (FORBIDDEN[layer] ?? []).concat(layer === 'angular' ? ['tailwind'] : []);
  const found = [];
  for (const spec of referencesIn(text, extname(filePath))) {
    if (!spec || !spec.startsWith('.')) continue;
    const target = relPosix(root, resolve(dirname(filePath), toPosix(spec)));
    if (!foreign.some((other) => target.startsWith(`frameworks/${other}/`))) continue;
    found.push(target);
  }
  return found;
}

export function isAllowedSpecifier(specifier: string) {
  return [...ALLOWED_SPECIFIERS.keys()].some((re) => re.test(specifier));
}

export function collect() {
  const findings = [];
  const matchedKeys = [];
  const allowedHits = [];
  let scanned = 0;

  for (const layer of LAYERS) {
    const layerDir = join(root, 'frameworks', layer);
    const tokens = foreignTokens(layer);
    for (const path of layerFiles(layerDir)) {
      const rel = relPosix(root, toPosix(path));
      const text = readFileSync(path, 'utf8');
      scanned += 1;

      if (REFERENCE_EXT.has(extname(path))) {
        for (const spec of escapingSpecifiers(text, path, layer)) {
          if (isAllowedSpecifier(spec)) { allowedHits.push(spec); continue; }
          findings.push({ kind: 'import', layer, file: rel, detail: spec });
        }
      }

      for (const hit of textualHits(text, tokens)) {
        const key = `${rel}:${hit.token}`;
        matchedKeys.push(key);
        if (EXEMPT.has(key)) continue;
        findings.push({ kind: 'text', layer, file: rel, detail: hit.token, other: hit.other, line: hit.line, text: hit.text });
      }
    }
  }
  return { findings, matchedKeys, allowedHits, scanned };
}

export function staleExemptions(matchedKeys: string[]) {
  const matched = new Set(matchedKeys);
  return [...EXEMPT.keys()].filter((k) => !matched.has(k));
}

export function staleSpecifierAllowances(allowedHits: string[]) {
  return [...ALLOWED_SPECIFIERS.keys()]
    .filter((re) => !allowedHits.some((spec: string) => re.test(spec)))
    .map((re) => `${re} matches nothing any layer references, so it authorises an edge nobody takes`);
}

export function staleLayerTokens(base = root) {
  const stale = [];
  const byLayer = Object.entries(LAYER_TOKENS) as [string, [string, RegExp][]][];
  for (const [layer, tokens] of byLayer) {
    const unseen = new Map(tokens);
    for (const path of layerFiles(join(base, 'frameworks', layer))) {
      if (!unseen.size) break;
      const text = readFileSync(path, 'utf8');
      for (const [token, re] of [...unseen]) if (re.test(text)) unseen.delete(token);
    }
    for (const token of unseen.keys())
      stale.push(`${layer}: "${token}" matches nothing under frameworks/${layer}/, so it identifies `
        + 'that layer nowhere and every other layer may now cite it freely');
  }
  return stale;
}

function main() {
  const { findings, matchedKeys, allowedHits, scanned } = collect();
  const stale = staleExemptions(matchedKeys);
  const staleAllowances = staleSpecifierAllowances(allowedHits);
  const staleTokens = staleLayerTokens();
  let failed = false;

  if (staleTokens.length) {
    failed = true;
    console.error(`check-layer-independence: ${staleTokens.length} stale LAYER_TOKENS entr`
      + `${staleTokens.length === 1 ? 'y' : 'ies'}\n`);
    for (const entry of staleTokens) console.error(`  ${entry}`);
    console.error('');
  }

  if (findings.length) {
    failed = true;
    const byFile = new Map();
    for (const f of findings) {
      if (!byFile.has(f.file)) byFile.set(f.file, []);
      byFile.get(f.file).push(f);
    }
    console.error(`check-layer-independence: ${findings.length} cross-layer reference(s) in ${byFile.size} file(s)\n`);
    for (const [file, hits] of [...byFile].sort()) {
      console.error(`  ${file}`);
      for (const h of hits) {
        if (h.kind === 'import') console.error(`    imports ${h.detail}, which is outside this layer`);
        else console.error(`    ${h.line}: names ${h.other} ("${h.detail}") -- ${h.text.slice(0, 96)}`);
      }
    }
    console.error('\nA layer stands on contracts/ alone. State the fact neutrally in the contract both');
    console.error('layers already obey, and cite that instead. Every authorised edge is on the record:');
    for (const [edge, reason] of ALLOWED) console.error(`  ${edge} -- ${reason}`);
    for (const [pattern, reason] of ALLOWED_SPECIFIERS) console.error(`  ${pattern} -- ${reason}`);
  }

  if (staleAllowances.length) {
    if (failed) console.error('');
    failed = true;
    console.error(`check-layer-independence: ${staleAllowances.length} stale ALLOWED_SPECIFIERS `
      + `entr${staleAllowances.length === 1 ? 'y' : 'ies'}\n`);
    for (const entry of staleAllowances) console.error(`  ${entry}`);
  }

  if (stale.length) {
    if (failed) console.error('');
    failed = true;
    console.error(`check-layer-independence: ${stale.length} stale EXEMPT entr${stale.length === 1 ? 'y' : 'ies'}\n`);
    for (const key of stale) console.error(`  ${key} -- ${EXEMPT.get(key)}`);
  }

  if (failed) process.exit(1);
  console.log(`check-layer-independence: clean -- ${scanned} file(s) scanned, ${EXEMPT.size} exempted `
    + `and ${ALLOWED_SPECIFIERS.size} reference pattern(s) authorised on the record`);
}

if (isMainModule(import.meta.url)) main();
