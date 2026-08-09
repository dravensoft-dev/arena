/* Holds the generated token modules against the DTCG source and the CSS. LayerConstants
 * is what check:duplicate-constants reads out of a layer: the constants declared at
 * module level, and the names it imported rather than declared, which is how a constant
 * that merely re-exports a token is told from one that shadows it. */

import { readFileSync, readdirSync } from 'node:fs';
import { join, basename, extname, relative } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { readJson } from '../../utils/read-file.ts';
import { buildScriptModules, collectScriptTokens, SCRIPT_TARGETS } from '../../generate/arena/generate-tokens.ts';
import { parseDecls } from '../../lib/arena/css-decls.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { emittedTree } from '../../lib/arena/layers.ts';
import { numericConstants } from './check-duplicate-constants.ts';
import { captured } from '../../utils/captures.ts';
import { relPosix } from '../../utils/posix-path.ts';

export const node = {
  name: 'check:script-tokens',
  reads: [
    'contracts/design/**', 'contracts/design-generated/**', 'contracts/api/types',
    'frameworks/react/**', 'frameworks/angular/**',
    '!frameworks/angular/build/**', '!frameworks/react/dist/**', '!frameworks/angular/dist/**',
  ],
  writes: [],
  feeds: [],
};


const LAYERS_WITH_MODULES = ['react', 'angular'];

export function cssCounterpart(value: string) {
  const m = /^(-?\d+(?:\.\d+)?)(px|ms|%)?$/.exec(value.trim());
  return m ? Number(m[1]) : null;
}

export function importedNames(source: string) {
  const names = new Set<string>();
  const re = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*tokens\.generated(?:\.js|\.ts)?['"]/gi;
  for (const m of source.matchAll(re)) {
    for (const raw of captured(m).split(',')) {
      const name = (raw.trim().split(/\s+as\s+/)[0] ?? '').trim();
      if (name) names.add(name);
    }
  }
  return names;
}

export function catSlotEnumProblems(catSlots: number, values: unknown) {
  const expected = Array.from({ length: catSlots }, (_, i) => i + 1);
  const actual = Array.isArray(values) ? values : [];
  const matches = actual.length === expected.length && expected.every((v, i) => actual[i] === v);
  if (matches) return [];
  return [`contracts/api/types/arena-cat-slot.json: ArenaCatSlot is [${actual.join(', ')}], but the --color-cat-* ramp in contracts/design/palette.dark.json has ${catSlots} slot(s), so it must be [${expected.join(', ')}] — the contract type restates the ramp and has to follow it`];
}

export const SHADOW_EXEMPT = new Map<string, string>([

]);

export type LayerConstants = {
  layer: string;
  imported: Set<string>;
  constants: { name: string; value: string; path: string }[];
};

export function shadowedTokenProblems(
  flagged: { jsName: string; value: unknown }[], layers: LayerConstants[],
) {
  const problems: string[] = [];
  for (const { jsName, value } of flagged) {
    if (!/^-?\d+(\.\d+)?$/.test(String(value))) continue;
    for (const { layer, imported, constants } of layers) {
      if (imported.has(jsName)) continue;
      for (const { name, value: declared, path } of constants) {
        if (!/^-?\d+(\.\d+)?$/.test(declared)) continue;
        if (Number(declared) !== Number(value)) continue;
        const key = `${layer}:${name}`;
        if (SHADOW_EXEMPT.has(key)) continue;
        problems.push(
          `${path}: ${name} is ${declared}, which is the value of the script-readable token ${jsName}, `
          + `and the ${layer} layer does not import it. Import the token or record why this number is not that one. `
          + `The orphan rule above cannot see this: it asks whether SOME layer imports the token, so one layer `
          + `importing it satisfies the gate while another keeps its own copy.`,
        );
      }
    }
  }
  return problems;
}

export function staleShadowExemptions(layers: LayerConstants[]) {
  const declared = new Set(layers.flatMap(({ layer, constants }) =>
    constants.map((c) => `${layer}:${c.name}`)));
  return [...SHADOW_EXEMPT.keys()]
    .filter((key) => !declared.has(key))
    .map((key) => `SHADOW_EXEMPT names "${key}", which declares no module-level numeric constant. Delete the entry.`);
}

export function zeroGeneratedCssProblems(count: number) {
  if (count > 0) return [];
  return ['found 0 .css files in contracts/design-generated — an empty result set is a failure, not a clean pass; check the discovery path'];
}

export function cssDiscoveryProblems(existingProblems: string[], cssFileCount: number) {
  const zeroCss = zeroGeneratedCssProblems(cssFileCount);
  return zeroCss.length ? [...existingProblems, ...zeroCss] : [];
}

const SCAN_EXT = new Set(['.js', '.jsx', '.ts', '.tsx']);

const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist']);

export function sourceFiles(dir: string): string[] {
  const emitted = emittedTree();
  return walkFiles(dir, { skip: (name, path) => SKIP_DIRS.has(name) || path === emitted })
    .filter((path) => SCAN_EXT.has(extname(path)) && !/^tokens\.generated\./i.test(basename(path)));
}

async function main() {
  const problems = [];

  const built = await buildScriptModules();
  for (const [path, expected] of built) {
    let actual;
    try {
      actual = readFileSync(join(root, path), 'utf8');
    } catch {
      problems.push(`${path}: missing — run bun run generate:tokens`);
      continue;
    }
    if (actual !== expected) problems.push(`${path}: stale — run bun run generate:tokens`);
  }

  const cssFiles = readdirSync(join(root, 'contracts', 'design-generated')).filter((f) => extname(f) === '.css');
  const gated = cssDiscoveryProblems(problems, cssFiles.length);
  if (gated.length) {
    console.error(`check-script-tokens: ${gated.length} problem(s)\n`);
    for (const g of gated) console.error(`  ${g}`);
    process.exit(1);
  }
  const cssValues = new Map();
  for (const file of cssFiles) {
    for (const [, decls] of parseDecls(readFileSync(join(root, 'contracts', 'design-generated', file), 'utf8'))) {
      for (const [prop, value] of decls) if (!cssValues.has(prop)) cssValues.set(prop, value);
    }
  }

  const flagged = await collectScriptTokens();

  for (const { cssName, jsName, value } of flagged) {
    if (!cssValues.has(cssName)) {
      problems.push(`${jsName}: exported to JS but --${cssName} is not in any contracts/design-generated/*.css`);
      continue;
    }
    const css = cssCounterpart(cssValues.get(cssName));
    if (css === null) {
      problems.push(`${jsName}: --${cssName} is "${cssValues.get(cssName)}", which is not a bare number — the script flag is wrong`);
    } else if (css !== value) {
      problems.push(`${jsName}: JS has ${value}, --${cssName} has ${css}`);
    }
  }

  const imported = new Set();
  const layers: LayerConstants[] = [];
  for (const layer of LAYERS_WITH_MODULES) {
    const layerImported = new Set<string>();
    const constants: LayerConstants['constants'] = [];
    for (const path of sourceFiles(join(root, 'frameworks', layer))) {
      const source = readFileSync(path, 'utf8');
      for (const name of importedNames(source)) { layerImported.add(name); imported.add(name); }
      for (const [name, value] of numericConstants(source)) {
        constants.push({ name, value, path: relPosix(root, path) });
      }
    }
    layers.push({ layer, imported: layerImported, constants });
  }
  for (const { jsName } of flagged) {
    if (!imported.has(jsName)) {
      problems.push(`${jsName}: flagged script-readable but no framework layer imports it — remove the flag or use the token`);
    }
  }
  problems.push(...shadowedTokenProblems(flagged, layers));
  problems.push(...staleShadowExemptions(layers));

  const first = built.entries().next().value;
  if (!first) throw new Error('check-script-tokens: buildScriptModules emitted no module at all');
  const [, freshModule] = first;
  const catSlots = Number(/^export const catSlots = (\d+);$/m.exec(freshModule)?.[1]);
  if (!Number.isInteger(catSlots)) {
    problems.push('catSlots: the generated module no longer exports a numeric catSlots — ArenaCatSlot cannot be checked against the ramp');
  } else {
    try {
      const catSlot = readJson(join(root, 'contracts/api/types/arena-cat-slot.json'));
      problems.push(...catSlotEnumProblems(catSlots, catSlot.values));
    } catch (err) {
      problems.push(`contracts/api/types/arena-cat-slot.json: unreadable (${(err as Error).message}) — ArenaCatSlot restates the --color-cat-* ramp and must exist`);
    }
  }

  if (problems.length) {
    console.error(`check-script-tokens: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-script-tokens: ${flagged.length} script-readable token(s) in sync across ${SCRIPT_TARGETS.length} layer(s); ArenaCatSlot matches the ${catSlots}-slot ramp`);
}

if (isMainModule(import.meta.url)) await main();
