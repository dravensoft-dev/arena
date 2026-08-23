/* Assembles @dravensoft/arena-react into frameworks/react/dist/. A component source goes
 * through Bun.Transpiler, the same path build-demos.ts uses, and its declaration is EMITTED
 * by tsc rather than copied, so it cannot disagree with the implementation. Every relative
 * specifier lands as .js: tsc's own rewrite does not reach declaration output, and this layer
 * compiles under moduleResolution bundler, where an extension is optional and a consumer's
 * node16 resolver refuses one that is missing. Whether either rewrite was right is not taken
 * on trust; unresolvedProblems resolves every specifier against what was emitted. The manifest
 * states the entry declaration twice, in exports and at the root, because a consumer on
 * moduleResolution node reads no exports and npm's registry page reads only the root field. */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { toPosix, relPosix } from '../../utils/posix-path.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { childOutput } from '../../lib/arena/child-output.ts';
import { tscBin } from '../../lib/arena/typecheck.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { arenaConfig } from '../../lib/core/arena-config.ts';
import {
  collectFiles, reset, write, copy, writeCssChain, componentSheets, copyCli, baseManifest, report,
  CATALOGUE_FILE, tokenCatalogue,
  writeComponentMap, writeIconManifest, keywords,
  NPM_SKILL, npmSkill, copyBehaviourContracts,
} from '../../lib/arena/package-assembly.ts';
import { PEERS } from '../../lib/arena/support-matrix.ts';
import { splitCompiledSheet } from '../../lib/tailwind/sheet-split.ts';
import { captured } from '../../utils/captures.ts';
import { CONSUME } from '../tailwind/build-tailwind.ts';

export const NAME = '@dravensoft/arena-react';
export const LAYER = 'frameworks/react';

export const ROOT_JS = ['Tokens.generated.js'];
export const ROOT_TS = ['AnchorActivation.ts', 'DataVisuals.ts', 'UseArenaContainerWidth.ts', 'UseDialogModal.ts', 'UseArenaToasts.ts', 'ToastClock.ts', 'StructuredData.ts', 'Theme.ts', 'WarnOnce.ts', 'Api.generated.ts', 'ArenaStyles.generated.ts', 'Index.generated.ts'];
export const DIST_PROJECT = 'frameworks/react/tsconfig.dist.json';

export const node = {
  name: 'build:react-package',
  reads: [
    `${LAYER}/**`, '!frameworks/react/dist/**',
    'frameworks/tailwind/Utilities.generated.css', `${CONSUME}/**/*.css`,
    'frameworks/Components.json', '.claude-plugin/plugin.json', 'LICENSE',
    'scripts/generate/core/arena-to-prod/**', '!scripts/generate/core/arena-to-prod/*.test.ts',
  ],
  writes: [`${LAYER}/dist/**`],
  feeds: [
    'check:arbitrary',
    'check:consumer',
    'check:packages',
    'check:react-types',
  ],
  releaseOnly: 'the declaration emit costs more than a development loop should pay for an artefact only a '
    + 'release ships, so bun run build leaves it out and bun run build:packages runs it',
};

export function isSource(path: string) {
  return (path.endsWith('.ts') || path.endsWith('.tsx')) && !path.endsWith('.d.ts');
}

export function distFiles(dir: string, keep: (path: string) => boolean) {
  if (!existsSync(dir)) return [];
  return walkFiles(dir).filter(keep);
}

export function emitDeclarations(root: string, outDir: string) {
  const args = [tscBin(root), '-p', join(root, DIST_PROJECT)];
  if (outDir) args.push('--outDir', outDir);
  const r = childOutput(process.execPath, args);
  if (r.error) throw new Error(`build-react-package: tsc failed to spawn: ${r.error.message || r.error}`);
  if (r.status !== 0)
    throw new Error(`build-react-package: the declaration emit did not typecheck\n${r.output}`);
}

export function untypedProblems(compiled: string[], dir: string) {
  return compiled
    .filter((rel: string) => !existsSync(join(dir, rel.replace(/\.js$/, '.d.ts'))))
    .map((rel: string) => `${rel} ships with no declaration beside it, so the package would ship it untyped`);
}

export const MODULE_EXTENSION = /\.[jt]sx?$/;

export const RELATIVE_SPECIFIER = /(from\s*|import\s*\(\s*)(['"])(\.[^'"]*)(['"])/g;

export function rewriteSourceSpecifiers(code: string) {
  return code.replace(RELATIVE_SPECIFIER, (_whole, keyword, open: string, specifier: string, close) =>
    `${keyword}${open}${specifier.replace(MODULE_EXTENSION, '')}.js${close}`);
}

export function relativeSpecifiers(code: string) {
  return [...code.matchAll(RELATIVE_SPECIFIER)].map((m) => captured(m, 3));
}

export function unresolvedProblems(dir: string) {
  const problems = [];
  for (const path of distFiles(dir, (p: string) => p.endsWith('.js') || p.endsWith('.d.ts'))) {
    for (const specifier of relativeSpecifiers(readFileSync(path, 'utf8'))) {
      if (existsSync(join(dirname(path), specifier))) continue;
      problems.push(`${relPosix(dir, path)} names ${specifier}, which resolves to no file in the package`);
    }
  }
  return problems;
}

export function assembleModules(root: string, dir: string) {
  const layer = join(root, LAYER);
  const written = [];
  const compiled: string[] = [];
  const tsconfig = JSON.stringify({ compilerOptions: { jsx: 'react' } });
  const transpilers = new Map([['tsx', new Bun.Transpiler({ loader: 'tsx', tsconfig })]]);

  const sources = collectFiles(join(layer, 'components'), isSource);
  if (sources.length === 0) throw new Error('build-react-package: found 0 component sources; the layer moved');

  const tsx = transpilers.get('tsx');
  if (!tsx) throw new Error('build-react-package: the tsx transpiler was never constructed');
  const emit = (from: string, rel: string) => {
    written.push(write(dir, rel, rewriteSourceSpecifiers(tsx.transformSync(readFileSync(from, 'utf8')))));
    compiled.push(rel);
  };

  for (const source of sources) {
    const rel = toPosix(join('components', relPosix(join(layer, 'components'), source)));
    emit(source, rel.replace(/\.tsx?$/, '.js'));
  }
  for (const name of ROOT_TS) {
    const from = join(layer, name);
    if (!existsSync(from)) throw new Error(`build-react-package: ${name} is missing from the layer root`);
    emit(from, name.replace(/\.ts$/, '.js'));
  }
  for (const name of ROOT_JS) {
    const from = join(layer, name);
    if (!existsSync(from)) throw new Error(`build-react-package: ${name} is missing from the layer root`);
    written.push(write(dir, name, rewriteSourceSpecifiers(readFileSync(from, 'utf8'))));
  }

  emitDeclarations(root, dir);
  for (const path of distFiles(dir, (p: string) => p.endsWith('.d.ts')))
    writeFileSync(path, rewriteSourceSpecifiers(readFileSync(path, 'utf8')));
  const declarations = distFiles(dir, (p: string) => p.endsWith('.d.ts'));

  const untyped = untypedProblems(compiled, dir);
  if (untyped.length) throw new Error(`build-react-package:\n  ${untyped.join('\n  ')}`);
  const unresolved = unresolvedProblems(dir);
  if (unresolved.length) throw new Error(`build-react-package:\n  ${unresolved.join('\n  ')}`);
  return { written, compiled, declarations };
}

export function manifest(root = repoRoot) {
  return {
    name: NAME,
    description: 'Arena by Dravensoft: React components styled entirely by design tokens, and the '
      + 'same design system Angular gets. Built to be operated by an AI agent.',
    keywords: keywords('react'),
    type: 'module',
    sideEffects: ['*.css'],
    ...baseManifest(root),
    types: './Index.generated.d.ts',
    exports: {
      '.': { types: './Index.generated.d.ts', import: './Index.generated.js' },
      './arena.css': './arena.css',
      './css/*': './css/*',
      './css/components/*': './css/components/*',
      './arena.config.example.json': './arena.config.example.json',
      './arena.tokens.json': './arena.tokens.json',
      './contracts/behaviour/*': './contracts/behaviour/*',
      './package.json': './package.json',
    },
    peerDependencies: PEERS.react,
  };
}

export async function buildReactPackage(root = repoRoot) {
  const dir = join(root, LAYER, 'dist');
  const layer = join(root, LAYER);
  const written = [];

  reset(dir);

  const { written: modules, compiled, declarations } = assembleModules(root, dir);
  written.push(...modules);
  const sources = { length: compiled.length };
  const carried = declarations;

  const sheet = readFileSync(join(root, 'frameworks/tailwind/Utilities.generated.css'), 'utf8');
  for (const to of writeCssChain(dir, NAME, componentSheets(sheet, splitCompiledSheet), root))
    written.push(join(dir, to));
  written.push(join(dir, 'arena.css'));

  for (const rel of copyCli(dir, root)) written.push(join(dir, rel));

  written.push(writeComponentMap(dir, 'react', root));
  written.push(writeIconManifest(dir, 'react', root));
  written.push(write(dir, 'arena.config.example.json', `${JSON.stringify(arenaConfig(root), null, 2)}\n`));
  written.push(write(dir, CATALOGUE_FILE, `${JSON.stringify(tokenCatalogue(root), null, 2)}\n`));
  written.push(copy(join(layer, 'PACKAGE.md'), dir, 'README.md'));
  written.push(write(dir, NPM_SKILL, npmSkill(NAME)));
  written.push(...copyBehaviourContracts(dir, root));
  written.push(copy(join(root, 'LICENSE'), dir, 'LICENSE'));
  written.push(write(dir, 'package.json', `${JSON.stringify(manifest(root), null, 2)}\n`));

  return { dir, written, sources: sources.length, carried: carried.length };
}

async function main() {
  if (!process.versions.bun) {
    console.error('build-react-package: Bun.Transpiler is Bun-only, and this is not running under Bun');
    process.exit(2);
  }
  const { dir, written, sources, carried } = await buildReactPackage();
  console.log(report('build-react-package', dir, written));
  console.log(`build-react-package: ${sources} source(s) compiled, ${carried} declaration(s) emitted`);
}

if (isMainModule(import.meta.url)) await main();
