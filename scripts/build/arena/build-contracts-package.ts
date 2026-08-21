/* Assembles @dravensoft/arena-contracts into dist/contracts/. The consumer is a build on another
 * platform fetching a tarball over HTTPS, so the package leans on no npm semantics at all: no bin,
 * no engines, no types, no dependency of any kind, and bare string export targets. It is the arena
 * domain because it reads the repository root for the plugin manifest and the licence, and it
 * writes to dist/ rather than under contracts/ because check-contracts.ts admits an exact set of
 * entries there. NOT_CARRIED is the half worth reading: every exclusion names itself and says why,
 * and a pathspec matching nothing in the tree fails, which is what stops "the CSS chain is web-only"
 * from decaying the day a fourth stylesheet lands beside the three. */

import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import {
  collectFiles, reset, write, copy, copyBehaviourContracts, report, version,
  pluginIdentity, SHARED_KEYWORDS,
} from '../../lib/arena/package-assembly.ts';

export const NAME = '@dravensoft/arena-contracts';
export const DIST = 'dist/contracts';
export const CATALOGUE = 'arena.contracts.json';
export const NPM_PAGE = 'contracts/NPM.md';

export const NOT_SHARED = new Map([
  ['css-variables', 'there is no CSS in this package, and a custom property is the web emission of a '
    + 'value rather than the value'],
  ['tailwindcss', 'the same: Tailwind is how one target authors what it draws, and no target reading '
    + 'this is obliged to have heard of it'],
]);

export function contractKeywords(shared = SHARED_KEYWORDS, notShared = NOT_SHARED) {
  return ['contracts', 'design-tokens-json', 'cross-platform',
    ...shared.filter((word) => !notShared.has(word))];
}

export function unusedNotShared(shared = SHARED_KEYWORDS, notShared = NOT_SHARED) {
  return [...notShared.keys()]
    .filter((word) => !shared.includes(word))
    .map((word) => `NOT_SHARED drops the keyword ${word} and SHARED_KEYWORDS no longer carries it, so `
      + 'the subtraction outlived what it subtracted');
}

export const CARRIED = [
  { from: 'contracts/design', ext: '.json' },
  { from: 'contracts/api/components', ext: '.json' },
  { from: 'contracts/api/types', ext: '.json' },
];

export const NOT_CARRIED = new Map([
  ['contracts/design/*.css',
   'the composition layer, and it is CSS in mechanism rather than in spelling: colors.css derives '
   + 'through color-mix, environment.css through env(), and reset.css reconciles a box model. A '
   + 'target that is not a browser rebuilds all three in its own idiom over the same values.'],
  ['contracts/design-generated/*',
   'the CSS emission of the values this package already carries. Carrying both would ship one '
   + 'answer twice and let the copies disagree.'],
  ['contracts/**/*.md',
   'the contributor branch, which is written for whoever changes Arena and cites paths that do not '
   + 'exist inside a package. The one page a consumer needs is carried as README.md.'],
  ['assets/fonts/*',
   'the self-hosted binaries the @font-face chain points at. Fonts are resources on a native '
   + 'platform rather than a stylesheet, so the bytes belong wherever that platform keeps them.'],
  ['frameworks/Components.json',
   'the registry of which layer ships which component, which is a fact about this repository and '
   + 'not about the contracts.'],
]);

export const node = {
  name: 'build:contracts-package',
  reads: [
    'contracts/design/*.json',
    'contracts/api/components/*.json',
    'contracts/api/types/*.json',
    'contracts/behaviour/*.json',
    'contracts/NPM.md',
    '.claude-plugin/plugin.json',
    'LICENSE',
  ],
  writes: [`${DIST}/**`],
  feeds: ['check:contracts-package'],
  releaseOnly: 'nothing in this repository consumes the assembled artefact, so a development loop pays '
    + 'nothing for it and bun run build:packages is where it is produced',
};

export function manifest(root = repoRoot) {
  return {
    name: NAME,
    description: 'Arena by Dravensoft: the design, API and behaviour contracts every Arena platform '
      + 'target implements. Values in strict DTCG 2025.10, and no code at all.',
    keywords: contractKeywords(),
    ...pluginIdentity(root),
    exports: {
      '.': `./${CATALOGUE}`,
      [`./${CATALOGUE}`]: `./${CATALOGUE}`,
      './contracts/design/*': './contracts/design/*',
      './contracts/api/components/*': './contracts/api/components/*',
      './contracts/api/types/*': './contracts/api/types/*',
      './contracts/behaviour/*': './contracts/behaviour/*',
      './package.json': './package.json',
    },
  };
}

export function carriedFiles(root = repoRoot) {
  const out: string[] = [];
  for (const { from, ext } of CARRIED) {
    const dir = join(root, from);
    const files = collectFiles(dir, (path) => path.endsWith(ext));
    if (files.length === 0) {
      throw new Error(`build-contracts-package: ${from} holds no ${ext} file, so the package would carry `
        + 'a level of the contract that is silently empty and a target reading it would find nothing there');
    }
    out.push(...files.sort());
  }
  return out;
}

export function unmatchedExclusions(root = repoRoot, notCarried = NOT_CARRIED) {
  return [...notCarried.keys()]
    .filter((spec) => matchCount(spec, root) === 0)
    .map((spec) => `NOT_CARRIED names ${spec} and the tree holds nothing it matches, so the exclusion `
      + 'outlived what it excluded and the next file of that shape would be carried with nobody noticing');
}

export function matchCount(spec: string, root = repoRoot) {
  const star = spec.indexOf('*');
  if (star === -1) return existsSync(join(root, spec)) ? 1 : 0;
  const dir = spec.slice(0, spec.lastIndexOf('/', star));
  const tail = spec.slice(spec.lastIndexOf('/', star) + 1);
  const deep = tail.startsWith('**');
  const ext = tail.replace(/^\*+/, '').replace(/^\/\*/, '');
  const base = join(root, dir);
  if (!existsSync(base)) return 0;
  if (deep) return collectFiles(base, (p) => p.endsWith(ext)).length;
  return readdirSync(base).filter((name) => ext === '' || name.endsWith(ext)).length;
}

export function catalogue(carried: string[], root = repoRoot) {
  return { name: NAME, version: version(root), contracts: [...carried].sort() };
}

export function buildContractsPackage(root = repoRoot) {
  const dir = join(root, DIST);
  const stale = [...unmatchedExclusions(root), ...unusedNotShared()];
  if (stale.length) throw new Error(`build-contracts-package: ${stale.join('; ')}`);

  reset(dir);
  const contracts: string[] = [];
  for (const file of carriedFiles(root)) contracts.push(copy(file, dir, relPosix(root, file)));
  contracts.push(...copyBehaviourContracts(dir, root));

  const carried = contracts.map((f) => relPosix(dir, f));
  const written = [...contracts];
  written.push(write(dir, CATALOGUE, `${JSON.stringify(catalogue(carried, root), null, 2)}\n`));
  written.push(copy(join(root, NPM_PAGE), dir, 'README.md'));
  written.push(copy(join(root, 'LICENSE'), dir, 'LICENSE'));
  written.push(write(dir, 'package.json', `${JSON.stringify(manifest(root), null, 2)}\n`));
  return { dir, written, carried };
}

function main() {
  const { dir, written } = buildContractsPackage();
  console.log(report('build-contracts-package', dir, written));
  console.log(`build-contracts-package: ${NOT_CARRIED.size} exclusion(s) on the record, each matching the tree`);
}

if (isMainModule(import.meta.url)) main();
