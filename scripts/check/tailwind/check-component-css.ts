/* Five claims about the CSS a component renders, none of which needs a browser. Every class
 * a manifest names has a rule, and every rule came from a manifest, so a renamed slot cannot
 * leave a component drawing a class nothing defines. No emitted file reads a Tailwind theme
 * property, which is the assertion that the strip ran and therefore that an adopter's own
 * `--spacing` cannot reach in. And every property the CSS does read resolves to a token Arena
 * ships, so a rule cannot quietly depend on something no package carries. The seven `arena-*`
 * animation utilities are excluded by name because `Animations.css` already owns that
 * namespace and they are rules no manifest can derive. The fifth is the specimen's: a page
 * links one sheet per manifest it fetches, since a missing link renders that part unstyled
 * and nothing opens the page to see it. */

import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { parseDecls } from '../../lib/arena/css-decls.ts';
import { arenaTokenNames } from '../../lib/core/arena-tokens.ts';
import { layerManifests } from '../../lib/tailwind/tailwind-compile.ts';
import { applyRules } from '../../lib/tailwind/component-css.ts';
import { PRELUDE, sheetPath } from '../../build/tailwind/build-tailwind.ts';
import { CONSUME, MANIFESTS } from '../../build/tailwind/build-tailwind.ts';

export const node = {
  name: 'check:component-css',
  reads: [
    MANIFESTS, `${CONSUME}/**/*.css`, 'frameworks/tailwind/components/**/*.card.html',
    'contracts/design/environment.css', 'contracts/design/colors.css',
    'contracts/design-generated/*.generated.css',
  ],
  writes: [],
  feeds: [],
};
import type { Manifests } from '../../lib/tailwind/manifest-shapes.ts';

export const THEME_NAMESPACES = [
  'spacing', 'radius', 'text', 'z-index', 'leading', 'tracking', 'container',
  'font-weight', 'breakpoint', 'aspect', 'perspective', 'drop-shadow', 'inset-shadow',
];

export const EXTERNAL_PROPERTIES = new Map([
  ['picker-invert', 'written by arena-to-prod into the consuming project\'s own stylesheet, never by the package'],
]);

export function selectorsIn(css: string) {
  return new Set([...css.matchAll(/\.(arena-[a-z0-9_-]+)/g)].map((m) => m[1]));
}

export function propertiesIn(css: string) {
  return new Set([...css.matchAll(/var\(\s*--([a-z0-9-]+)/g)].map((m) => m[1]));
}

export function themeLeaks(css: string) {
  const leaked = new Set();
  for (const name of propertiesIn(css)) {
    if (name === undefined) continue;
    const namespace = THEME_NAMESPACES.find((ns) => name === ns || name.startsWith(`${ns}-`));
    if (namespace) leaked.add(name);
  }
  return [...leaked].sort();
}

export function sheetProblems(manifests: Manifests, base = root) {
  const problems = [];
  const tokens = arenaTokenNames(base);
  for (const decls of parseDecls(readFileSync(join(base, 'contracts/design/environment.css'), 'utf8')).values())
    for (const name of decls.keys()) tokens.add(name);

  for (const [file, manifest] of manifests) {
    const path = join(base, sheetPath(file));
    if (!existsSync(path)) {
      problems.push(`${manifest.component}: ${sheetPath(file)} was never emitted, so every class it `
        + 'renders resolves to nothing and the component draws unstyled');
      continue;
    }
    const css = readFileSync(path, 'utf8');
    const emitted = selectorsIn(css);
    const derived = new Set(applyRules(manifest).map((rule) => rule.selector));

    for (const name of derived) {
      if (!emitted.has(name)) problems.push(`${manifest.component}: the manifest names .${name}, which has no rule`);
    }
    for (const name of emitted) {
      if (name !== undefined && !derived.has(name)) problems.push(`${manifest.component}: .${name} has a rule no manifest derives`);
    }
    for (const leak of themeLeaks(css)) {
      problems.push(`${manifest.component}: reads --${leak}, a Tailwind theme property, so the strip `
        + 'did not run over it and an adopter who declares that property rescales this component silently');
    }
    for (const name of propertiesIn(css)) {
      if (name === undefined) continue;
      if (tokens.has(name) || name.startsWith('tw-') || EXTERNAL_PROPERTIES.has(name)) continue;
      problems.push(`${manifest.component}: reads --${name}, which is no Arena token and is not `
        + 'declared external, so nothing in either package defines it');
    }
  }
  return problems;
}

export function preludeProblems(base = root) {
  const path = join(base, PRELUDE);
  if (!existsSync(path)) {
    return [`${PRELUDE} was never emitted; without it every border and every focus ring is invalid `
      + 'at computed-value time and simply does not paint'];
  }
  const css = readFileSync(path, 'utf8');
  const problems = [];
  if (!/@property --tw-border-style/.test(css)) problems.push(`${PRELUDE}: no --tw-border-style registration, so every border disappears`);
  if (!/@property --tw-shadow\b/.test(css)) problems.push(`${PRELUDE}: no --tw-shadow registration, so every shadow and the focus ring disappear`);
  if (!/@keyframes/.test(css)) problems.push(`${PRELUDE}: no @keyframes, so every animation the component CSS names does not play`);
  if (!/^@layer theme, base, components, utilities;$/m.test(css)) {
    problems.push(`${PRELUDE}: no layer order declaration, so Tailwind's own property fallbacks sort above everything`);
  }
  for (const directive of ['@apply', '@utility', '@reference', '@source', '@theme']) {
    if (css.includes(directive)) problems.push(`${PRELUDE}: carries ${directive}, a compile-time directive a browser cannot read`);
  }
  return problems;
}

export const MANIFEST_FETCH = /fetch\(\s*['"]([^'"]*?([A-Za-z]+)\.manifest\.json)['"]/g;

export function specimenProblems(manifests: Manifests, base = root) {
  const problems = [];
  for (const file of manifests.keys()) {
    const specimen = file.replace(/\.manifest\.json$/, '.card.html');
    const path = join(base, specimen);
    if (!existsSync(path)) {
      problems.push(`${specimen} is missing, so the surface beside it renders nowhere without a build`);
      continue;
    }
    const html = readFileSync(path, 'utf8');
    for (const [, , component] of html.matchAll(MANIFEST_FETCH)) {
      const sheet = basename(sheetPath(`${component}.manifest.json`));
      if (html.includes(`/${sheet}"`)) continue;
      problems.push(`${specimen} renders ${component}'s classes and links no ${sheet}, so that part of `
        + 'the page draws unstyled, which no gate reads as a failure unless it happens to overrun the '
        + 'declared card box');
    }
  }
  return problems;
}

export function collect(base = root) {
  const manifests = layerManifests(base);
  if (manifests.size === 0) {
    return { manifests, problems: ['no manifest was found at all, so this gate proves nothing'] };
  }
  return {
    manifests,
    problems: [...sheetProblems(manifests, base), ...preludeProblems(base), ...specimenProblems(manifests, base)],
  };
}

function main() {
  const { manifests, problems } = collect();
  if (problems.length > 0) {
    for (const problem of problems) console.error(`check-component-css: ${problem}`);
    process.exit(1);
  }
  console.log(`check-component-css: ${manifests.size} manifest(s) each have a stylesheet whose every rule `
    + 'they derive, reading Arena tokens alone');
}

if (isMainModule(import.meta.url)) main();
