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
import { iconManifest, MANIFEST_FILE } from '../../lib/arena/icon-manifest.ts';
import { shippedNames } from '../../generate/core/arena-to-prod/icon-css.ts';
import { carriedFiles, agentManifest } from '../../lib/arena/package-assembly.ts';
import { servedDocs, unquote } from '../../lib/arena/llms-index.ts';
import { record as skillRecord, SKILL_NAME } from '../../generate/core/arena-to-prod/skill.ts';
import {
  frontmatterOf, nameProblems, descriptionProblems, keyProblems, scalarProblems, bodyProblems,
} from './check-skill-spec.ts';
import {
  AGENT_DIR, ROUTER_FILE, MANIFEST_FILE as AGENT_MANIFEST, SUPPORT_FILE, LINK, INLINE,
  isRepoPath,
} from '../../lib/arena/agent-payload.ts';
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

export function iconManifestProblems(pkg: { layer: string; name: string }, dir: string) {
  const at = join(dir, MANIFEST_FILE);
  if (!existsSync(at)) {
    return [`${pkg.name}: no ${MANIFEST_FILE}, so a consumer's build has no way to learn which glyphs `
      + 'Arena draws on their behalf but by reading this package as text, which is what sent every '
      + 'project a rule for a glyph named in a sentence about the API'];
  }
  let shipped;
  try {
    shipped = readJson(at);
  } catch (error) {
    return [`${pkg.name}: ${MANIFEST_FILE} does not parse: ${(error as Error).message}`];
  }
  const fresh = iconManifest(pkg.layer);
  if (shippedNames(fresh).size === 0) {
    return [`${pkg.name}: a fresh read of the renders under frameworks/${pkg.layer}/components names no `
      + 'glyph at all, and an empty result is a failure rather than a clean pass'];
  }
  if (JSON.stringify(shipped) !== JSON.stringify(fresh)) {
    return [`${pkg.name}: ${MANIFEST_FILE} is not what the renders say today. It carries `
      + `${shippedNames(shipped as never).size} glyph(s) and the components draw ${shippedNames(fresh).size}. `
      + 'A list that outlives the renders it was derived from sends every consumer a subset cut to '
      + 'the wrong set: run bun run build:packages'];
  }
  return [];
}

export const SITE_BASE = 'https://arena.dravensoft.org/';

export function targetsIn(text: string) {
  const targets = [...text.matchAll(LINK)].map((one) => one[1] ?? '');
  for (const one of text.matchAll(INLINE)) {
    const inner = one[1] ?? '';
    if (inner.startsWith('http') || inner.startsWith('./') || inner.startsWith('../')) targets.push(inner);
  }
  return targets.filter(Boolean);
}

export function unresolvedTarget(target: string, from: string, agent: string, served: Set<string>) {
  if (target.startsWith(SITE_BASE)) {
    const rel = target.slice(SITE_BASE.length).replace(/[#?].*$/, '');
    if (rel.includes('*') || rel.includes('<')) return null;
    return served.has(rel) || existsSync(join(root, ...rel.split('/')))
      ? null
      : `${rel} is named as a page on the domain and this tree does not carry it, `
        + 'so the site publishes nothing there';
  }
  if (/^[a-z]+:/i.test(target) || target.startsWith('#')) return null;
  if (target.includes('*') || target.includes('<')) return null;
  const at = join(dirname(join(agent, from)), target);
  return existsSync(at) ? null : `${target} resolves to nothing a consumer installs`;
}

export function payloadProblems(pkg: { layer: string; name: string }, dir: string) {
  const agent = join(dir, AGENT_DIR);
  if (!existsSync(agent)) {
    return [`${pkg.name}: no ${AGENT_DIR}/ directory, so the package ships the components and none `
      + 'of the language, and an agent in a project that depends on Arena has nothing to read'];
  }
  const problems = [];
  for (const file of [ROUTER_FILE, AGENT_MANIFEST, SUPPORT_FILE]) {
    if (!existsSync(join(agent, file))) problems.push(`${pkg.name}: ${AGENT_DIR}/ carries no ${file}`);
  }
  if (problems.length > 0) return problems;

  const expected = carriedFiles(pkg.layer);
  for (const rel of expected) {
    if (!existsSync(join(agent, ...rel.split('/')))) {
      problems.push(`${pkg.name}: ${AGENT_DIR}/ is missing ${rel}, which the payload declares it `
        + 'carries. A router whose stop is absent sends a reader nowhere and reports nothing');
    }
  }

  const manifest = readJson(join(agent, AGENT_MANIFEST)) as Record<string, unknown>;
  const fresh = agentManifest(pkg.layer, pkg.name);
  for (const [key, value] of Object.entries(fresh)) {
    if (JSON.stringify(manifest[key]) === JSON.stringify(value)) continue;
    problems.push(`${pkg.name}: ${AGENT_MANIFEST} states ${key} as `
      + `${JSON.stringify(manifest[key])} against ${JSON.stringify(value)}`);
  }

  const routerText = readFileSync(join(agent, ...ROUTER_FILE.split('/')), 'utf8');
  const written = skillRecord(routerText, fresh, 'agent/skills/design', 'arena-to-prod --skill');
  const front = frontmatterOf(written);
  if (front === null) {
    problems.push(`${pkg.name}: the record this payload would write carries no frontmatter, so no `
      + 'scanner discovers it');
  } else {
    const at = `${pkg.name}: the record ${AGENT_DIR}/ would write`;
    problems.push(
      ...nameProblems(`${at}/${SKILL_NAME}/SKILL.md`, unquote(front.values.get('name') ?? '')),
      ...descriptionProblems(at, unquote(front.values.get('description') ?? '')),
      ...keyProblems(at, front.keys),
      ...scalarProblems(at, front.values),
      ...bodyProblems(at, front.body),
    );
  }

  const served = new Set(servedDocs());
  for (const file of walkFiles(agent).filter((one) => one.endsWith('.md'))) {
    const from = relPosix(agent, file);
    const text = readFileSync(file, 'utf8');
    for (const bare of text.matchAll(INLINE)) {
      const inner = bare[1] ?? '';
      if (isRepoPath(inner) && !inner.includes(' ')) {
        problems.push(`${pkg.name}: ${from} still names the repository path ${JSON.stringify(inner)}. `
          + 'A consumer has no such path, so the rewrite left a reader somewhere that does not exist '
          + 'and nothing at install time would say so');
      }
    }
    for (const target of targetsIn(text)) {
      const problem = unresolvedTarget(target, from, agent, served);
      if (problem) problems.push(`${pkg.name}: ${from} names ${problem}`);
    }
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
    problems.push(...iconManifestProblems(pkg, dir));
    problems.push(...componentReachProblems(pkg, dir, declared));
    problems.push(...payloadProblems(pkg, dir));
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
