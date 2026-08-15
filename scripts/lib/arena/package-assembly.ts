/* What both package builds share: the exclusion list that decides what never ships, the
 * copy that honours it, the CSS chain each package carries, and the manifest templates.
 * `arena` because it reads two framework layers and the repository root. Nothing here
 * compiles anything; each layer's own builder does that with its own toolchain. sheetPath is
 * given the repo-relative posix key it documents rather than the absolute path walkFiles
 * answers: finding its prefix inside an absolute path worked only because a posix one contains
 * that prefix, and a native one does not, so the sheet would be looked for beside the manifest. */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { join, dirname, relative, basename } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from './repo-root.ts';
import { kebab } from '../../utils/case.ts';
import { componentMap, MAP_FILE } from './component-map.ts';
import { manifestFiles } from '../tailwind/tailwind-compile.ts';
import { CONSUME, sheetPath } from '../../build/tailwind/build-tailwind.ts';
import { parseDecls } from './css-decls.ts';
import { CSS_TARGETS } from '../../generate/arena/generate-tokens.ts';
import { ARENA_EXT } from '../core/dtcg-shapes.ts';

export const EXCLUDED_NAMES = new Set(['node_modules', 'dist', 'vendor', 'test', 'build']);

export const EXCLUDED_PATTERNS = [
  /\.test\.(mjs|[jt]sx?)$/,
  /\.card\.html$/,
  /\.card\.entry\.[jt]sx?$/,
  /\.demo\.generated\.html$/,
  /\.demo\.entry\.generated\.[jt]sx?$/,
  /\.behaviour\.json$/,
  /\.prompt\.md$/,
  /\.generated\.js$/,
  /^tsconfig\..*\.json$/,
  /^BehaviourDelegated\.json$/,
];

export type CssChainEntry = { to: string; from?: string; content?: string; linked?: boolean };

export const CSS_CHAIN: CssChainEntry[] = [
  { from: 'contracts/design/reset.css', to: 'css/reset.css' },
  { from: 'contracts/design-generated/typography.generated.css', to: 'css/typography.css' },
  { from: 'contracts/design-generated/spacing.generated.css', to: 'css/spacing.css' },
  { from: 'contracts/design-generated/effects.generated.css', to: 'css/effects.css' },
  { from: 'contracts/design-generated/style-plugin.default.generated.css', to: 'css/style-plugin-default.css' },
  { from: 'contracts/design/colors.css', to: 'css/colors.css' },
  { from: 'contracts/design/environment.css', to: 'css/environment.css' },
];

export const arenaCssHeader = (name: string) => [
  `/* ${name} -- the invariant half of Arena's stylesheet.`,
  '   Import this FIRST, then the file arena-to-prod wrote from your arena.config.json,',
  '   whose palette and font values are meant to win. reset.css leads so anything can',
  '   override it, and colors.css derives its muted levels from --color-base-content,',
  '   so it follows the palette rather than defining one. environment.css composes the',
  "   device's safe-area insets with the spacing scale and defines no length of its own.",
  '   style-plugin-default.css is the appearance rather than the language, and it is the one',
  '   entry a project replaces: write your own style plugin and it takes this one\'s place. */',
].join('\n');

export function excluded(name: string) {
  return EXCLUDED_NAMES.has(name) || EXCLUDED_PATTERNS.some((p) => p.test(name));
}

export function collectFiles(dir: string, keep: (path: string) => boolean = () => true) {
  if (!existsSync(dir)) return [];
  return walkFiles(dir, { skip: (name) => excluded(name) || name.startsWith('.') }).filter(keep);
}

export function reset(dir: string) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

export function write(dir: string, rel: string, content: string) {
  const full = join(dir, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
  return full;
}

export function copy(from: string, dir: string, rel: string) {
  const full = join(dir, rel);
  mkdirSync(dirname(full), { recursive: true });
  copyFileSync(from, full);
  return full;
}

export function copyTree(from: string, dir: string, rel: string, keep?: (path: string) => boolean) {
  const written = [];
  for (const file of collectFiles(from, keep)) {
    written.push(copy(file, dir, `${rel}/${relPosix(from, file)}`));
  }
  return written;
}

export function writeCssChain(dir: string, name: string, extra: CssChainEntry[] = [], root = repoRoot) {
  const chain = [...CSS_CHAIN, ...extra];
  for (const entry of chain) {
    if (entry.content !== undefined) write(dir, entry.to, entry.content);
    else if (entry.from !== undefined) copy(join(root, entry.from), dir, entry.to);
  }
  const imports = chain
    .filter(({ linked }) => linked !== false)
    .map(({ to }) => `@import './${to}';`);
  write(dir, 'arena.css', `${arenaCssHeader(name)}\n${imports.join('\n')}\n`);
  return chain.map((c) => c.to);
}

export const SHEET_BANNERS = {
  base: [
    '/* Tailwind\'s preflight, and nothing of Arena\'s own.',
    '   Arena needs it: a form control that inherits nothing falls back to 13.33px Arial, and a',
    '   <button> styled that way is 20% off in every measurement that matters.',
    '   If your project already runs Tailwind, its preflight does the same job and you may import',
    "   './css/components.css' alone instead of './arena.css' to avoid a second copy. Doing that",
    '   makes the order yours to get right: this half must come before Arena\'s components. */',
  ].join('\n'),
  components: [
    '/* Every component Arena draws, in one import.',
    '   This is never optional: without it a component renders unstyled, silently.',
    '   Import ./css/components/<name>.css instead to pay only for what you render; each of those',
    '   imports ./css/prelude.css itself, so one alone is safe. */',
  ].join('\n'),
};

export function componentSheets(css: string, split: (css: string) => { base: string }, root = repoRoot) {
  const { base } = split(css);
  const dir = join(root, 'frameworks', 'tailwind');
  const consume = join(root, ...CONSUME.split('/'));
  const files = manifestFiles(join(dir, 'components'))
    .map((file) => join(root, sheetPath(relPosix(root, file))));
  if (files.length === 0) {
    throw new Error('package-assembly: no component stylesheet was found, so the package would ship '
      + 'a barrel that imports nothing and every component would render unstyled');
  }
  const named = files.map((file) => ({
    to: `css/components/${kebab(basename(file).split('.')[0] ?? '')}.css`,
    content: readFileSync(file, 'utf8').replace(/@import '(?:\.\.\/)+Prelude\.generated\.css';/, "@import '../prelude.css';"),
    linked: false,
  }));
  const barrel = named.map(({ to }) => `@import './components/${basename(to)}';`).join('\n');
  return [
    { to: 'css/base.css', content: `${SHEET_BANNERS.base}\n${base}` },
    { to: 'css/numerals.css', content: readFileSync(join(dir, 'Numerals.css'), 'utf8') },
    { to: 'css/page.css', content: readFileSync(join(dir, 'Page.css'), 'utf8') },
    { to: 'css/prose.css', content: readFileSync(join(dir, 'Prose.css'), 'utf8') },
    { to: 'css/rhythm.css', content: readFileSync(join(dir, 'Rhythm.css'), 'utf8') },
    { to: 'css/sr-only.css', content: readFileSync(join(dir, 'SrOnly.css'), 'utf8') },
    { to: 'css/prelude.css', content: readFileSync(join(consume, 'Prelude.generated.css'), 'utf8') },
    ...named,
    { to: 'css/components.css', content: `${SHEET_BANNERS.components}\n${barrel}\n` },
  ];
}

export const CATALOGUE_FILE = 'arena.tokens.json';

export function tokenCatalogue(root = repoRoot) {
  const decls = new Map<string, Map<string, string>>();
  for (const target of CSS_TARGETS) {
    for (const [selector, pairs] of parseDecls(readFileSync(join(root, target), 'utf8')))
      decls.set(selector, new Map([...(decls.get(selector) ?? []), ...pairs]));
  }
  const tokens = Object.fromEntries(decls.get(':root') ?? []);

  const roleFile = readJson(join(root, 'contracts', 'design', 'roles.json')) as Record<string, any>;
  const roles = Object.fromEntries(Object.entries(roleFile).map(([name, role]) => [name, {
    type: role.$type,
    ...(role.$extensions?.[ARENA_EXT]?.values ? { values: role.$extensions[ARENA_EXT].values } : {}),
  }]));

  return { tokens, roles };
}

export const CLI_BINS = { 'arena-to-prod': './bin/arena-to-prod.mjs' };

export const SHIPPED_SPECIFIER = /(from\s+')(\.[^']*)\.ts(')/g;

export function emitCli(source: string) {
  const { outputText } = transpileModule(source, {
    compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.ESNext, verbatimModuleSyntax: true },
  });
  return outputText.replace(SHIPPED_SPECIFIER, '$1$2.mjs$3');
}

export function copyCli(dir: string, root = repoRoot) {
  const written: string[] = [];
  for (const name of Object.keys(CLI_BINS)) {
    const from = join(root, 'scripts', 'generate', 'core', name);
    const copied = collectFiles(from, (file) => !excluded(basename(file))).map((file) => {
      const to = `bin/${relPosix(from, file)}`;
      if (!file.endsWith('.ts')) { copy(file, dir, to); return `./${to}`; }
      write(dir, to.replace(/\.ts$/, '.mjs'), emitCli(readFileSync(file, 'utf8')));
      return `./${to.replace(/\.ts$/, '.mjs')}`;
    });
    if (copied.length === 0) throw new Error(`package-assembly: copied 0 files for ${name}; its directory moved`);
    for (const one of copied) {
      if (written.includes(one)) {
        throw new Error(`package-assembly: two CLI trees both hold ${basename(one)}, and bin/ is flat, so one `
          + 'overwrites the other and a command ends up importing a sibling that is not its own');
      }
      written.push(one);
    }
  }
  for (const [name, target] of Object.entries(CLI_BINS)) {
    if (!written.includes(target)) {
      throw new Error(`package-assembly: the manifest declares ${name} at ${target} and nothing was copied there`);
    }
  }
  return written;
}

export function writeComponentMap(dir: string, layer: string, root = repoRoot) {
  const map = componentMap(layer, root);
  const claimed = new Set(Object.values(map.draws).filter(Boolean));
  if (claimed.size === 0) {
    throw new Error(`package-assembly: derived no component sheet for ${layer}, so "components": "auto" `
      + 'would resolve every project to an empty subset and every screen would render unstyled');
  }
  return write(dir, MAP_FILE, `${JSON.stringify(map, null, 2)}\n`);
}

export function version(root = repoRoot) {
  return readJson(join(root, '.claude-plugin', 'plugin.json')).version;
}

export const SHARED_KEYWORDS = [
  'design-system', 'ui', 'ui-components', 'component-library', 'arena', 'dravensoft',
  'design-tokens', 'dtcg', 'css-variables', 'tailwindcss', 'themeable',
  'accessibility', 'a11y', 'wcag', 'claude-code', 'agent-skills', 'ai-agents',
];

export function keywords(...layer: string[]) {
  return [...layer, ...SHARED_KEYWORDS];
}

export function baseManifest(root = repoRoot) {
  const plugin = readJson(join(root, '.claude-plugin', 'plugin.json'));
  return {
    version: plugin.version,
    license: plugin.license,
    homepage: plugin.homepage,
    repository: { type: 'git', url: `git+${plugin.repository}.git` },
    bugs: { url: `${plugin.repository}/issues` },
    author: plugin.author,
    publishConfig: { access: 'public' },
    bin: { ...CLI_BINS },
    engines: { node: '>=26' },
  };
}

export function report(name: string, dir: string, files: string[]) {
  const bytes = files.reduce((total, f) => total + (existsSync(f) ? statSync(f).size : 0), 0);
  return `${name}: ${files.length} file(s), ${(bytes / 1024).toFixed(0)} KiB, in ${relPosix(repoRoot, dir)}`;
}
