/* Assembles @dravensoft/arena-angular into frameworks/angular/dist/. The layer is staged
 * rather than built in place because ng-packagr needs its own `ng-package.json`,
 * `tsconfig.lib.json` and `package.json` at the root it compiles from, and writing those into
 * the tracked layer would leave build files beside the source. It no longer stages anything of
 * another layer: a component composes its own class names, so nothing reaches out. Staging
 * is also where each style factory is marked pure, because the annotation belongs to what
 * ships and a component directory is the one place a bare block comment is refused. */

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, posix } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { nodeBin } from '../../lib/arena/node-bin.ts';
import { arenaConfig } from '../../lib/core/arena-config.ts';
import {
  collectFiles, reset, write, copy, writeCssChain, componentSheets, copyCli, baseManifest, report,
  CATALOGUE_FILE, tokenCatalogue,
  writeComponentMap, CLI_BINS, keywords,
  NPM_SKILL, npmSkill,
} from '../../lib/arena/package-assembly.ts';
import { splitCompiledSheet } from '../../lib/tailwind/sheet-split.ts';
import { CONSUME } from '../tailwind/build-tailwind.ts';

export const NAME = '@dravensoft/arena-angular';
export const LAYER = 'frameworks/angular';
export const STAGING = 'frameworks/angular/build/package';

export const node = {
  name: 'build:angular-package',
  reads: [
    `${LAYER}/**`, '!frameworks/angular/dist/**', '!frameworks/angular/build/**',
    'frameworks/tailwind/Utilities.generated.css', `${CONSUME}/**/*.css`,
    'frameworks/Components.json', '.claude-plugin/plugin.json', 'LICENSE',
    'scripts/generate/core/arena-to-prod/**', '!scripts/generate/core/arena-to-prod/*.test.ts',
  ],
  writes: [`${LAYER}/dist/**`, `${STAGING}/**`],
  feeds: [
    'build:angular-tests',
    'check:angular',
    'check:arbitrary',
    'check:consumer',
    'check:packages',
  ],
  releaseOnly: 'ng-packagr costs more than a development loop should pay for an artefact only a release '
    + 'ships, so bun run build leaves it out and bun run build:packages runs it',
};

export function manifest(root = repoRoot) {
  return {
    name: NAME,
    description: 'Arena by Dravensoft: standalone Angular components styled entirely by design '
      + 'tokens, and the same design system React gets. Built to be operated by an AI agent.',
    keywords: keywords('angular'),
    sideEffects: false,
    ...baseManifest(root),
    peerDependencies: {
      '@angular/core': '>=20',
      '@angular/common': '>=20',
      '@angular/platform-browser': '>=20',
      '@angular/cdk': '>=20',
      '@phosphor-icons/web': '^2.1.2',
    },
    dependencies: RUNTIME_DEPENDENCIES,
  };
}

export const RUNTIME_DEPENDENCIES = {
  tslib: '^2.8.1',
};

export function fromStaging(target: string) {
  return relPosix(STAGING, target);
}

export function ngPackageConfig() {
  return {
    $schema: fromStaging('node_modules/ng-packagr/ng-package.schema.json'),
    dest: fromStaging(`${LAYER}/dist`),
    lib: { entryFile: 'index.ts' },
    allowedNonPeerDependencies: Object.keys(RUNTIME_DEPENDENCIES),
    assets: [] as string[],
  };
}

export function libTsconfig() {
  return {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'bundler',
      lib: ['ES2022', 'DOM'],
      strict: true,
      skipLibCheck: true,
      experimentalDecorators: false,
      useDefineForClassFields: false,
      resolveJsonModule: true,
      esModuleInterop: true,
      declaration: true,
    },
    angularCompilerOptions: { strictTemplates: true, compilationMode: 'partial' },
  };
}

export const VARIANTS = '.variants.ts';
export const STYLE_FACTORY = /^(export const \w+ = )(arenaStyles\()/gm;

export function annotatePure(source: string) {
  return source.replace(STYLE_FACTORY, '$1/*@__PURE__*/$2');
}

function stage(root: string) {
  const dir = join(root, STAGING);
  reset(dir);

  const layer = join(root, LAYER);
  const staged = [];
  let variants = 0;
  let annotated = 0;
  for (const file of collectFiles(layer, (p) => !p.endsWith('.card.html') && !p.includes('/playground/'))) {
    const rel = relPosix(layer, file);
    const source = readFileSync(file, 'utf8');
    if (!rel.endsWith(VARIANTS)) { staged.push(write(dir, rel, source)); continue; }
    const pure = annotatePure(source);
    variants += 1;
    if (pure !== source) annotated += 1;
    staged.push(write(dir, rel, pure));
  }
  if (variants === 0 || annotated !== variants) {
    throw new Error(`build-angular-package: marked ${annotated} of ${variants} style factories pure. `
      + 'What ships is one FESM module, so a factory the bundler must keep drags every class name of a '
      + 'component nobody renders into the consumer\'s initial chunk, and nothing fails.');
  }


  write(dir, 'ng-package.json', `${JSON.stringify(ngPackageConfig(), null, 2)}\n`);
  write(dir, 'tsconfig.lib.json', `${JSON.stringify(libTsconfig(), null, 2)}\n`);
  write(dir, 'package.json', `${JSON.stringify({ ...manifest(root), $schema: undefined }, null, 2)}\n`);
  return { dir, staged };
}

export function ngPackagrBin(root = repoRoot) {
  try { return nodeBin('ng-packagr', undefined, root); } catch { return null; }
}

export function buildAngularPackage(root = repoRoot) {
  const bin = ngPackagrBin(root);
  if (!bin) throw new Error('build-angular-package: ng-packagr is not installed; run bun install');

  const { dir: staging, staged } = stage(root);
  if (staged.length === 0) throw new Error('build-angular-package: staged 0 files; the layer moved');

  const dist = join(root, LAYER, 'dist');
  mkdirSync(dist, { recursive: true });

  const result = spawnSync(process.execPath, [bin, '-p', 'ng-package.json', '-c', 'tsconfig.lib.json'], {
    cwd: staging, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(`build-angular-package: ng-packagr failed\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  }

  const written = [];
  const sheet = readFileSync(join(root, 'frameworks/tailwind/Utilities.generated.css'), 'utf8');
  for (const to of writeCssChain(dist, NAME, [
    ...componentSheets(sheet, splitCompiledSheet),
    { from: 'frameworks/angular/theme/arena-cdk.css', to: 'css/arena-cdk.css' },
  ], root)) written.push(join(dist, to));
  written.push(join(dist, 'arena.css'));

  for (const rel of copyCli(dist, root)) written.push(join(dist, rel));

  written.push(writeComponentMap(dist, 'angular', root));
  written.push(write(dist, 'arena.config.example.json', `${JSON.stringify(arenaConfig(root), null, 2)}\n`));
  written.push(write(dist, CATALOGUE_FILE, `${JSON.stringify(tokenCatalogue(root), null, 2)}\n`));
  written.push(copy(join(root, LAYER, 'PACKAGE.md'), dist, 'README.md'));
  written.push(write(dist, NPM_SKILL, npmSkill(NAME)));
  written.push(copy(join(root, 'LICENSE'), dist, 'LICENSE'));

  const emitted = readJson(join(dist, 'package.json'));
  write(dist, 'package.json', `${JSON.stringify(withAssets(emitted), null, 2)}\n`);

  return { dir: dist, written, staged: staged.length, log: result.stdout };
}

export type NgPackage = {
  exports?: Record<string, unknown>;
  sideEffects?: boolean;
  [key: string]: unknown;
};

export function withAssets(emitted: NgPackage): NgPackage & { exports: Record<string, unknown> } {
  return {
    ...emitted,
    exports: {
      ...emitted.exports,
      './arena.css': { default: './arena.css' },
      './css/*': { default: './css/*' },
      './css/components/*': { default: './css/components/*' },
      './arena.config.example.json': { default: './arena.config.example.json' },
      './arena.tokens.json': { default: './arena.tokens.json' },
    },
    bin: { ...CLI_BINS },
    sideEffects: emitted.sideEffects ?? false,
  };
}

function main() {
  const { dir, written, staged } = buildAngularPackage();
  console.log(report('build-angular-package', dir, written));
  console.log(`build-angular-package: ${staged} source(s) staged and compiled by ng-packagr`);
}

if (isMainModule(import.meta.url)) main();
