/* Where a component's appearance comes from. The adoption half asks that every component in
 * scope renders the manifest that draws its surface, in both layers; the literal half asks
 * that the React layer types no appearance out by hand, and its rule is the migration's own
 * line: a style property whose every branch is a literal belongs in the manifest, one that
 * reads an identifier or an interpolation is a runtime computation and stays. Three blind
 * spots, none closed here: a style object assembled by Object.assign or a computed spread, a
 * literal reached through an unannotated lookup table, and Angular's [style.x]="<literal>",
 * which is the blind spot check-dimension-literals already declares in its own header. */

import { readFileSync, existsSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { blankComments, expressionLeaves, readValue, skipString } from './check-dimension-literals.ts';
import { HAND_DRAWN, categoryOf, inScope, manifestFor } from '../../lib/tailwind/manifest-surfaces.ts';
import { kebab } from '../../utils/case.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

export const node = {
  name: 'check:appearance',
  reads: [
    'frameworks/Components.json',
    'frameworks/react/components/**', 'frameworks/angular/components/**',
    'frameworks/tailwind/components/**',
  ],
  writes: [],
  feeds: [],
};


export const EXEMPT = new Map<string, string>([]);

const REACT_COMPONENTS = join(repoRoot, 'frameworks/react/components');
const ANGULAR_COMPONENTS = join(repoRoot, 'frameworks/angular/components');

const SKIPPED_DIRECTORIES = new Set(['dist', 'node_modules']);
const SKIPPED_INFIXES = ['.test.', '.generated.', '.demo.'];
const SOURCE_EXTENSIONS = ['.tsx', '.jsx', '.ts'];

const STYLE_PROP = /style=\{\{/g;
const ANNOTATION = /:\s*(?:React\.)?CSSProperties\b/g;
const RETURNED_OBJECT = /(?:return\s*|=>\s*\()\{/g;
const ENTRY_STOP = new Set([',', '}']);
const KEY_STOP = new Set([':']);
const LITERAL_LEAF = /^(?:-?\d*\.?\d+|true|false|null|undefined)$/;

function balancedFrom(text: string, open: number) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') { i = skipString(text, i, c); continue; }
    if (c === '{') { depth++; continue; }
    if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function nextBrace(text: string, from: number) {
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') { i = skipString(text, i, c); continue; }
    if (c === '{') return i;
    if (c === ';' || c === '\n') {
      if (c === ';') return -1;
    }
  }
  return -1;
}

function isObjectLiteral(text: string, open: number) {
  for (let i = open - 1; i >= 0; i--) {
    const c = text[i];
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r') continue;
    return c === '=' || c === '(' || c === ',';
  }
  return false;
}

export function styleObjectBodies(rawText: string) {
  const text = blankComments(rawText);
  const bodies: { start: number; text: string }[] = [];
  const seen = new Set();
  const push = (open: number) => {
    if (open < 0 || seen.has(open)) return;
    const close = balancedFrom(text, open);
    if (close < 0) return;
    seen.add(open);
    bodies.push({ start: open + 1, text: text.slice(open + 1, close) });
  };

  for (const m of text.matchAll(STYLE_PROP)) push(m.index + 'style={'.length);

  for (const m of text.matchAll(ANNOTATION)) {
    const open = nextBrace(text, m.index + m[0].length);
    if (open < 0) continue;
    if (isObjectLiteral(text, open)) { push(open); continue; }
    const close = balancedFrom(text, open);
    if (close < 0) continue;
    const body = text.slice(open, close);
    for (const r of body.matchAll(RETURNED_OBJECT)) push(open + r.index + r[0].length - 1);
  }

  return bodies.sort((a, b) => a.start - b.start);
}

export function objectEntries(body: string) {
  const entries = [];
  let i = 0;
  while (i < body.length) {
    const c = body[i];
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === ',') { i++; continue; }
    if (body.startsWith('...', i)) { i = readValue(body, i, ENTRY_STOP).end + 1; continue; }
    const key = readValue(body, i, KEY_STOP);
    if (key.end >= body.length) break;
    const value = readValue(body, key.end + 1, ENTRY_STOP);
    entries.push({ key: key.text.trim().replace(/^['"]|['"]$/g, ''), value: value.text.trim() });
    i = value.end + 1;
  }
  return entries;
}

export function valueIsLiteral(raw: string) {
  const leaves = expressionLeaves(raw);
  if (leaves.length === 0) return false;
  return leaves.every((leaf) => {
    const t = leaf.trim();
    if (t === '') return false;
    if (LITERAL_LEAF.test(t)) return true;
    const quote = t[0];
    if (quote !== "'" && quote !== '"' && quote !== '`') return false;
    if (skipString(t, 0, quote) !== t.length - 1) return false;
    return !(quote === '`' && t.includes('${'));
  });
}

export function literalStyleProblems(rawText: string, path: string) {
  const problems = [];
  for (const body of styleObjectBodies(rawText))
    for (const { key, value } of objectEntries(body.text)) {
      if (!key || /[(){}]/.test(key)) continue;
      if (!valueIsLiteral(value)) continue;
      if (EXEMPT.has(`${path}:${key}:${value}`)) continue;
      problems.push({ path, key, value });
    }
  return problems;
}

export function sourceFiles(dir: string) {
  if (!existsSync(dir)) return [];
  return walkFiles(dir, { skip: (name) => SKIPPED_DIRECTORIES.has(name) })
    .filter((path) => SOURCE_EXTENSIONS.some((e) => path.endsWith(e)))
    .filter((path) => !SKIPPED_INFIXES.some((i) => basename(path).includes(i)));
}

export function reactSource(name: string) {
  const category = categoryOf(name);
  if (!category) return null;
  const path = join(REACT_COMPONENTS, category, kebab(name), `${name}.tsx`);
  return existsSync(path) ? path : null;
}

export function angularSource(name: string) {
  const category = categoryOf(name);
  if (!category) return null;
  const path = join(ANGULAR_COMPONENTS, category, kebab(name), `${name}.ts`);
  return existsSync(path) ? path : null;
}

export function componentDir(name: string) {
  const category = categoryOf(name);
  return category ? join(REACT_COMPONENTS, category, kebab(name)) : null;
}

export function directoryOf(path: string) {
  return path.slice(0, path.lastIndexOf('/'));
}

export function reactRendersManifest(text: string, manifest: string) {
  const throughRecipe = /from '[^']*Tv\.generated/.test(text) && text.includes(`${manifest}.manifest.generated`);
  const throughClasses = /from '[^']*ArenaStyles\.generated/.test(text) && text.includes(`${manifest}.classes.generated`);
  return throughRecipe || throughClasses;
}

export function angularRendersManifest(text: string) {
  return /from '[^']*\.variants'/.test(text);
}

export function adoptionProblems(name: string) {
  const manifest = manifestFor(name);
  if (!manifest) {
    return [`${name}: no manifest draws its surface, and nothing in scope may be left with `
      + 'nothing to render; declare it in HAND_DRAWN or give it a manifest'];
  }
  const problems = [];
  const react = reactSource(name);
  if (react && !reactRendersManifest(readFileSync(react, 'utf8'), manifest)) {
    problems.push(`${name}: ${relative(repoRoot, react)} does not render its manifest -- it has to `
      + `import arenaStyles from ArenaStyles.generated and ${manifest}.classes.generated (or, until it `
      + `is migrated, arenaTv from Tv.generated and ${manifest}.manifest.generated), and draw its slots`);
  }
  const angular = angularSource(name);
  if (angular && !angularRendersManifest(readFileSync(angular, 'utf8'))) {
    problems.push(`${name}: ${relative(repoRoot, angular)} does not render its manifest -- it has to `
      + 'import the recipe built from it, its own .variants or the family parent\'s');
  }
  return problems;
}

export function collect() {
  const scope = inScope();
  const adoption = [];
  const adopted = new Set();
  for (const name of scope) {
    const problems = adoptionProblems(name);
    if (problems.length === 0) adopted.add(name);
    adoption.push(...problems);
  }

  const files = sourceFiles(REACT_COMPONENTS);
  const excused = new Set([...HAND_DRAWN.keys()].map(componentDir).filter(Boolean));
  const literals = [];
  let scanned = 0;
  for (const path of files) {
    if (excused.has(directoryOf(path))) continue;
    scanned += 1;
    const rel = relative(repoRoot, path);
    for (const { key, value } of literalStyleProblems(readFileSync(path, 'utf8'), rel))
      literals.push(`${rel}: ${key}: ${value} is appearance typed out by hand; every branch of it is a `
        + 'literal, so it belongs in the manifest');
  }

  return {
    adoption,
    literals,
    files: files.map((p) => relPosix(repoRoot, p)),
    walked: files.length,
    scanned,
    scope: scope.length,
  };
}

export function zeroProblems({ scope, walked, scanned }: { scope: number; walked: number; scanned: number }) {
  const problems = [];
  if (scope === 0) problems.push('the scope is empty, so the adoption half asked nothing of anybody');
  if (walked === 0) problems.push('the literal half walked 0 files, which is a failure rather than a clean pass');
  if (scanned === 0) {
    problems.push('every walked file was excused by HAND_DRAWN, so the literal half read nothing; '
      + 'a gate whose whole subject is excused reports nothing wrong with everything');
  }
  return problems;
}

function main() {
  const found = collect();
  const problems = [...zeroProblems(found), ...found.adoption, ...found.literals];

  if (problems.length > 0) {
    console.error(`check-appearance: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    console.error('\nA component\'s appearance is its manifest\'s, in every layer. What stays inline is a');
    console.error('value computed at runtime from data or from a measurement, and nothing else.');
    process.exit(1);
  }

  console.log(`check-appearance: ${found.scope} component(s) in scope render their manifest and write no `
    + `appearance by hand, ${HAND_DRAWN.size} draw by hand by charter; ${found.scanned} of `
    + `${found.walked} React source(s) read for a literal`);
}

if (isMainModule(import.meta.url)) main();
