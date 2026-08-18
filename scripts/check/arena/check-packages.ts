/* Five claims. First, that the CLI shipped inside both packages emits what Style Dictionary
 * emits: a second emitter exists, so something has to hold the two together. Second, when
 * dist/ has been assembled, that each package is registry-standard: the version comes from
 * plugin.json, every exports target resolves to a file that is there and every wildcard one
 * matches at least one, the entry declaration is advertised at the root, and no peer leaked into
 * dependencies. Third, that the stylesheets resolve, because a sheet that imports 43 files that
 * are not there passes the second claim and fails in the consumer's bundler. Fourth, that the
 * component map is there and reaches every sheet both ways. Fifth is the one the ASSEMBLED CSS is
 * the only honest subject for, since what a consumer installs is this and not an intermediate:
 * supports-blocks.ts states both halves of it. dist/ is git-ignored, so all but the first skip. */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { globToRegExp } from '../../utils/text.ts';
import { relPosix, toPosix } from '../../utils/posix-path.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { parseDecls } from '../../lib/arena/css-decls.ts';
import { arenaConfig } from '../../lib/core/arena-config.ts';
import { themeCss } from '../../generate/core/arena-to-prod/theme-css.ts';
import { MAP_FILE } from '../../lib/arena/component-map.ts';
import { NPM_SKILL } from '../../lib/arena/package-assembly.ts';
import { ROUTER } from '../../lib/arena/llms-index.ts';
import { blindFallbacks, repeatedSupports } from '../../lib/tailwind/supports-blocks.ts';

export const node = {
  name: 'check:packages',
  reads: [
    'frameworks/react/dist/**', 'frameworks/angular/dist/**', 'frameworks/Components.json',
    '.claude-plugin/plugin.json', 'contracts/design/palette.*.json',
    'contracts/design-generated/palette.generated.css',
  ],
  writes: [],
  feeds: [],
};


export type PackageManifest = {
  name?: string;
  version?: string;
  private?: boolean;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  exports?: unknown;
  types?: string;
  typings?: string;
  bin?: Record<string, string>;
};

export const PACKAGES = [
  { layer: 'react', name: '@dravensoft/arena-react' },
  { layer: 'angular', name: '@dravensoft/arena-angular' },
];

export const GENERATED_PALETTE = 'contracts/design-generated/palette.generated.css';

export const distDir = (layer: string, base = root) => join(base, 'frameworks', layer, 'dist');

const isColour = (name: string) => name.startsWith('color-');

export function stripAtStatements(css: string) {
  return css.replace(/^[ \t]*@[a-z-]+[^{}\n]*;[ \t]*$/gim, '');
}

export function paletteEquivalenceProblems(generatedCss: string, cliCss: string) {
  const expected = parseDecls(stripAtStatements(generatedCss));
  const actual = parseDecls(stripAtStatements(cliCss));
  const problems = [];
  let compared = 0;

  for (const [selector, decls] of expected) {
    const mine = actual.get(selector);
    if (!mine) {
      problems.push(`${GENERATED_PALETTE} declares ${selector} and arena-to-prod emits no such block`);
      continue;
    }
    for (const [name, value] of decls) {
      if (!isColour(name)) continue;
      compared += 1;
      if (mine.get(name) !== value) {
        problems.push(`${selector} --${name}: Style Dictionary says ${value}, arena-to-prod says ${mine.get(name) ?? '(nothing)'}`);
      }
    }
    for (const name of mine.keys()) {
      if (isColour(name) && !decls.has(name)) problems.push(`${selector} --${name}: arena-to-prod emits it and Style Dictionary does not`);
    }
  }

  if (compared === 0) {
    problems.push(`compared 0 declarations against ${GENERATED_PALETTE}; a zero-result comparison is a failure, not a pass`);
  }
  return { problems, compared };
}

export function manifestProblems(pkg: { layer: string; name: string }, manifest: PackageManifest, version: string) {
  const problems = [];
  const at = pkg.name;

  if (manifest.name !== pkg.name) problems.push(`${at}: manifest names itself ${manifest.name}`);
  if (manifest.version !== version) {
    problems.push(`${at}: version ${manifest.version}, and .claude-plugin/plugin.json says ${version}`);
  }
  if (manifest.private) problems.push(`${at}: private, so it can never be published`);
  if (manifest.scripts?.postinstall || manifest.scripts?.install || manifest.scripts?.preinstall) {
    problems.push(`${at}: declares an install script, which Bun and npm run differently and consumers disable`);
  }

  for (const name of Object.keys(manifest.dependencies ?? {})) {
    if (Object.hasOwn(manifest.peerDependencies ?? {}, name)) {
      problems.push(`${at}: ${name} is both a dependency and a peer`);
    }
    if (name.startsWith('@dravensoft/')) problems.push(`${at}: ${name} is a dependency; an Arena package is always a peer`);
    if (name === '@phosphor-icons/web') problems.push(`${at}: Phosphor is the consumer's to install, never a dependency`);
  }
  if (!Object.hasOwn(manifest.peerDependencies ?? {}, '@phosphor-icons/web')) {
    problems.push(`${at}: no peer on @phosphor-icons/web, and every component renders ph-* classes`);
  }
  return problems;
}

function exportTargets(exports: unknown) {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === 'string') { out.push(value); return; }
    if (value && typeof value === 'object') for (const v of Object.values(value)) walk(v);
  };
  walk(exports);
  return out;
}

export function globMatches(target: string, dir: string) {
  const rel = target.replace(/^\.\//, '');
  const pattern = globToRegExp(rel);
  if (!existsSync(dir)) return [];
  return walkFiles(dir)
    .map((path) => relPosix(dir, path))
    .filter((path) => pattern.test(path));
}

export function exportProblems(pkg: { layer: string; name: string }, manifest: PackageManifest, dir: string) {
  const problems = [];
  const targets = exportTargets(manifest.exports ?? {});
  if (targets.length === 0) problems.push(`${pkg.name}: no exports target resolves to a file, so the package exposes nothing`);
  for (const target of targets.filter((t) => !t.includes('*'))) {
    if (!existsSync(join(dir, target))) problems.push(`${pkg.name}: exports ${target}, which was never emitted`);
  }
  for (const target of targets.filter((t) => t.includes('*'))) {
    if (globMatches(target, dir).length === 0) {
      problems.push(`${pkg.name}: exports ${target}, which matches nothing that was emitted, so the subpath `
        + 'resolves to a module error for every consumer who imports it');
    }
  }
  const types = manifest.types ?? manifest.typings;
  if (!types) {
    problems.push(`${pkg.name}: no types and no typings at the root, so npm reads the package as untyped and a consumer on moduleResolution: node finds no declarations`);
  } else if (!existsSync(join(dir, types))) {
    problems.push(`${pkg.name}: types ${types}, which was never emitted`);
  }
  for (const [field, value] of Object.entries(manifest.bin ?? {}) as [string, string][]) {
    if (!existsSync(join(dir, value))) problems.push(`${pkg.name}: bin ${field} points at ${value}, which was never emitted`);
  }
  if (!existsSync(join(dir, 'README.md'))) problems.push(`${pkg.name}: no README.md, which is the page npm shows`);
  return problems;
}

export function componentMapProblems(pkg: { layer: string; name: string }, dir: string) {
  const at = join(dir, MAP_FILE);
  if (!existsSync(at)) {
    return [`${pkg.name}: no ${MAP_FILE}, so "components": "auto" has nothing to resolve a template against`];
  }
  let map;
  try {
    map = readJson(at);
  } catch (error) {
    return [`${pkg.name}: ${MAP_FILE} does not parse: ${(error as Error).message}`];
  }
  const sheets = existsSync(join(dir, 'css', 'components'))
    ? readdirSync(join(dir, 'css', 'components')).filter((n) => n.endsWith('.css')).map((n) => basename(n, '.css'))
    : [];
  const claimed = new Set((Object.values(map.draws ?? {}) as string[]).filter(Boolean));
  const problems = [];
  if (!map.match || claimed.size === 0) {
    problems.push(`${pkg.name}: ${MAP_FILE} names no component sheet, so auto would resolve every project to nothing`);
  }
  for (const sheet of [...claimed].sort()) {
    if (!sheets.includes(sheet)) problems.push(`${pkg.name}: ${MAP_FILE} names ${sheet}, and no such sheet was emitted`);
  }
  for (const sheet of sheets.filter((s) => !claimed.has(s)).sort()) {
    problems.push(`${pkg.name}: ${MAP_FILE} reaches no key for ${sheet}, so auto can never put it in a subset`);
  }
  return problems;
}

export function discoveryProblems(pkg: { layer: string; name: string }, dir: string) {
  const at = join(dir, NPM_SKILL);
  if (!existsSync(at)) {
    return [`${pkg.name}: no ${NPM_SKILL}, so the glob the npm skills convention discovers a `
      + 'package by matches nothing here and an agent working in a project that already depends on '
      + 'Arena has no way to learn the language exists'];
  }
  const text = readFileSync(at, 'utf8');
  const problems = [];
  if (!text.startsWith('---\n')) problems.push(`${pkg.name}: ${NPM_SKILL} carries no frontmatter, so it is discovered by nothing`);
  if (!text.includes(pkg.name)) problems.push(`${pkg.name}: ${NPM_SKILL} does not name its own package`);
  if (!text.includes(ROUTER)) {
    problems.push(`${pkg.name}: ${NPM_SKILL} does not name ${ROUTER}, and pointing at the route is `
      + 'the whole of what a stub is for');
  }
  return problems;
}

const RELATIVE_IMPORT = /@import\s+(?:url\(\s*)?['"](\.[^'"]*)['"]/g;

export function importsIn(css: string) {
  return [...css.matchAll(RELATIVE_IMPORT)].map((match) => match[1]);
}

export function styleProblems(pkg: { layer: string; name: string }, dir: string) {
  const problems = [];
  const seen = new Set();
  const queue = ['arena.css'];
  let components = 0;

  while (queue.length) {
    const from = queue.shift();
    if (from === undefined || seen.has(from)) continue;
    seen.add(from);
    if (from.startsWith('css/components/')) components += 1;

    const full = join(dir, from);
    if (!existsSync(full)) continue;
    for (const specifier of importsIn(readFileSync(full, 'utf8'))) {
      const target = toPosix(join(dirname(from), specifier ?? ''));
      if (existsSync(join(dir, target))) queue.push(target);
      else problems.push(`${pkg.name}: ${from} imports ${specifier}, which was never emitted`);
    }
  }

  if (components === 0) {
    problems.push(`${pkg.name}: arena.css reaches no component stylesheet, so every component it ships `
      + 'renders unstyled; a walk that found nothing is a failure, not a clean pass');
  }
  return { problems, walked: seen.size };
}

export function shippedSheets(dir: string) {
  return walkFiles(dir).filter((path) => path.endsWith('.css'));
}

export function bundledCssProblems(pkg: { layer: string; name: string }, dir: string) {
  const sheets = shippedSheets(dir);
  if (sheets.length === 0) {
    return [`${pkg.name}: not one stylesheet was emitted, so this claim read nothing; a walk that `
      + 'found no subject is a failure rather than a clean pass'];
  }
  const problems = [];
  for (const path of sheets) {
    const rel = relPosix(dir, path);
    const css = readFileSync(path, 'utf8');
    for (const blind of blindFallbacks(css)) {
      problems.push(`${pkg.name}: ${rel} falls back to ${blind.property}: var(--${blind.token}) `
        + `at ${blind.selector}, under an ink of the same colour. Wherever color-mix does not `
        + 'resolve, that paints the glyph in the ground it stands on');
    }
    for (const repeated of repeatedSupports(css)) {
      problems.push(`${pkg.name}: ${rel} states ${repeated.condition} ${repeated.count} times at `
        + `${repeated.selector}, and a bundler is free to keep one of them: bun build keeps the `
        + 'first and discards the rest, so every held-back colour after the first leaves the sheet '
        + 'the consumer ends up with');
    }
  }
  return problems;
}

export function declaredComponents(base = root): string[] {
  const declared = readJson(join(base, 'frameworks', 'Components.json')) as Record<string, string[]>;
  return Object.values(declared).flat().sort();
}

export function componentReachProblems(pkg: { layer: string; name: string }, dir: string, declared: string[]) {
  const types = walkFiles(dir).filter((path) => path.endsWith('.d.ts'));
  if (types.length === 0) {
    return [`${pkg.name}: no .d.ts was emitted, so nothing states what the package exposes`];
  }
  const surface = types.map((path) => readFileSync(path, 'utf8')).join('\n');
  const missing = declared.filter((name) => !new RegExp(`\\b${name}\\b`).test(surface));
  if (missing.length === 0) return [];
  return [`${pkg.name}: declared in Components.json and absent from the assembled package: ${missing.join(', ')}. `
    + 'dist/ is git-ignored and no generator rebuilds it, so it goes stale silently while its version stamp stays right. '
    + 'Run bun run build:packages'];
}

export function collect(base = root) {
  const version = readJson(join(base, '.claude-plugin/plugin.json')).version;
  const problems = [];

  const cli = themeCss(arenaConfig(base), { importHeader: false });
  const generated = readFileSync(join(base, GENERATED_PALETTE), 'utf8');
  const equivalence = paletteEquivalenceProblems(generated, cli);
  problems.push(...equivalence.problems);

  const assembled = [];
  const declared = declaredComponents(base);
  let sheets = 0;
  for (const pkg of PACKAGES) {
    const dir = distDir(pkg.layer, base);
    const manifestPath = join(dir, 'package.json');
    if (!existsSync(manifestPath)) continue;
    assembled.push(pkg.name);
    const manifest = readJson(manifestPath);
    problems.push(...manifestProblems(pkg, manifest, version));
    problems.push(...exportProblems(pkg, manifest, dir));
    problems.push(...componentMapProblems(pkg, dir));
    problems.push(...componentReachProblems(pkg, dir, declared));
    problems.push(...discoveryProblems(pkg, dir));
    problems.push(...styleProblems(pkg, dir).problems);
    problems.push(...bundledCssProblems(pkg, dir));
    sheets += shippedSheets(dir).length;
  }

  return { problems, compared: equivalence.compared, assembled, version, sheets };
}

function main() {
  const { problems, compared, assembled, version, sheets } = collect();
  for (const problem of problems) console.error(`check-packages: ${problem}`);

  if (problems.length) {
    console.error(`\ncheck-packages: ${problems.length} problem(s)`);
    process.exit(1);
  }

  const built = assembled.length
    ? `${assembled.length} package(s) assembled at ${version}: ${assembled.join(', ')}, whose `
      + `${sheets} stylesheet(s) carry no fallback painting an ink in its own colour and state `
      + 'each condition once per rule'
    : 'no package assembled; run bun run build:packages to check the manifests too';
  console.log(`check-packages: arena-to-prod matches ${GENERATED_PALETTE} across ${compared} declaration(s); ${built}`);
}

if (isMainModule(import.meta.url)) main();
