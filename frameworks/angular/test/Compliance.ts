/* The shared evaluator is reached by DYNAMIC import of an absolute file URL, computed
 * from REPO above. A static relative specifier resolves against the importing FILE, so
 * it points at the source tree from here and at nothing from frameworks/angular/build/test/ — and a
 * suite that fails to LOAD turns the run red without naming what dropped. */

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));

function findRepoRoot(from: string): string {
  let dir = from;
  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`no package.json above ${from} -- cannot locate the repository root`);
    dir = parent;
  }
  return dir;
}

export const REPO = findRepoRoot(here);


export const SCRIPTS = join(REPO, 'scripts');
export const LIB = join(SCRIPTS, 'lib');
export const UTILS = join(SCRIPTS, 'utils');
export const CHECKS = join(SCRIPTS, 'check');
const { comparePatterns, isFocusable } = await import(pathToFileURL(join(LIB, 'core', 'behaviour-compliance.ts')).href);
const { loadBinding, loadPatterns, bindingCases, bindingAlso } = await import(pathToFileURL(join(LIB, 'arena', 'behaviour-contracts.ts')).href);

export { isFocusable };

export const ANGULAR_COMPONENTS = join(REPO, 'frameworks', 'angular', 'components');

export const TAILWIND_COMPONENTS = join(REPO, 'frameworks', 'tailwind', 'components');

export const PATTERN_DIR = join(REPO, 'contracts', 'behaviour');

let patternCache: Map<string, PatternFile> | null = null;

interface PatternFile {
  name: string;
  requires: Record<string, unknown>;
}

export interface AssertPatternOptions {

  root: Element;

  bindingPath: string;

  subjects?: Record<string, Element | Element[] | null>;

  behavioural?: Record<string, boolean>;
}

function resolverFor(root: Element): (id: string) => Element | null {
  return (id: string) => {
    if (root.getAttribute && root.getAttribute('id') === id) return root;
    for (const el of Array.from(root.querySelectorAll('[id]'))) {
      if (el.getAttribute('id') === id) return el;
    }
    return null;
  };
}

interface CompareOneOptions {
  root: Element;
  subjects: Record<string, Element | Element[] | null>;
  behavioural: Record<string, boolean>;
  pattern: PatternFile;
  exceptions: unknown[] | undefined;
  binding: unknown;
}

function labelResolverFor(root: Element): (el: Element) => Element | null {
  return (el: Element) => {
    const id = el.getAttribute('id');
    if (id) {
      for (const candidate of Array.from(root.querySelectorAll('label[for]'))) {
        if (candidate.getAttribute('for') === id) return candidate;
      }
    }
    return typeof el.closest === 'function' ? el.closest('label') : null;
  };
}

function alsoEntries(binding: unknown, bindingPath: string): { pattern: PatternFile; exceptions?: unknown[] }[] {
  patternCache ??= loadPatterns(REPO) as Map<string, PatternFile>;
  return (bindingAlso(binding) as { pattern?: string; exceptions?: unknown[] }[]).map((entry) => {
    const pattern = patternCache!.get(entry.pattern ?? '');
    if (!pattern) {
      throw new Error(`${bindingPath}\n  names pattern "${entry.pattern}" in \`also\`, which has no file in ${PATTERN_DIR}`);
    }
    return { pattern, exceptions: entry.exceptions };
  });
}

function compareOne(
  { root, subjects, behavioural, pattern, exceptions, binding }: CompareOneOptions, bindingPath: string,
): string[] {
  const { default: fallbackSubject, ...perRequirement } = subjects;
  const fallback = 'default' in subjects ? fallbackSubject : root;
  return comparePatterns({
    entries: [{ pattern, exceptions }, ...alsoEntries(binding, bindingPath)],
    subjects: perRequirement,
    fallback,
    behavioural,
    resolveId: resolverFor(root),
    resolveLabel: labelResolverFor(root),
  });
}

export function assertPattern({ root, bindingPath, subjects = {}, behavioural = {} }: AssertPatternOptions): void {
  const binding = loadBinding(bindingPath);
  patternCache ??= loadPatterns(REPO) as Map<string, PatternFile>;
  const pattern = patternCache.get(binding.pattern);
  if (!pattern) {

    throw new Error(`${bindingPath}\n  names pattern "${binding.pattern}", which has no file in ${PATTERN_DIR}`);
  }
  const problems = compareOne({ root, subjects, behavioural, pattern, exceptions: binding.exceptions, binding }, bindingPath);

  if (problems.length) {
    throw new Error(`${bindingPath}\n  pattern: ${pattern.name}\n  - ${problems.join('\n  - ')}`);
  }
}

interface BindingCase {
  name: string | null;
  when: string | null;
  pattern: string;
  reason: string | null;
  exceptions: unknown[];
}

export interface AssertPatternCasesOptions {

  bindingPath: string;

  cases: Record<string, () => { root: Element; subjects?: Record<string, Element | Element[] | null>; behavioural?: Record<string, boolean> }>;
}

export function assertPatternCases({ bindingPath, cases }: AssertPatternCasesOptions): void {
  const binding = loadBinding(bindingPath);
  const declared: BindingCase[] = bindingCases(binding);
  if (declared.length === 1 && declared[0].name === null) {
    throw new Error(`${bindingPath}\n  declares no cases — assert it with assertPattern instead.`);
  }

  const want = declared.map((c) => c.name);
  const seen = new Set<string | null>();
  const dupes = new Set<string | null>();
  for (const n of want) {
    if (seen.has(n)) dupes.add(n);
    seen.add(n);
  }
  if (dupes.size) {
    throw new Error(`${bindingPath}\n  declares the same case name more than once: ${[...dupes].join(', ')}`);
  }
  const got = Object.keys(cases);

  const missing = want.filter((n) => !got.includes(n as string));
  const unknown = got.filter((n) => !want.includes(n));
  if (missing.length || unknown.length) {
    throw new Error(
      `${bindingPath}\n  the suite must render every declared case, and only those.\n` +
      (missing.length ? `  - never rendered: ${missing.join(', ')}\n` : '') +
      (unknown.length ? `  - not declared in the binding: ${unknown.join(', ')}\n` : '') +
      `  declared: ${want.join(', ')}`,
    );
  }

  patternCache ??= loadPatterns(REPO) as Map<string, PatternFile>;
  const problems: string[] = [];
  for (const c of declared) {
    const pattern = patternCache.get(c.pattern);
    if (!pattern) {
      throw new Error(`${bindingPath}\n  case "${c.name}" names pattern "${c.pattern}", which has no file in ${PATTERN_DIR}`);
    }

    const { root, subjects = {}, behavioural = {} } = cases[c.name as string]();
    const found = compareOne({ root, subjects, behavioural, pattern, exceptions: c.exceptions, binding }, bindingPath);
    for (const p of found) problems.push(`case "${c.name}" (${c.when}): ${p}`);
  }
  if (problems.length) {
    throw new Error(`${bindingPath}\n  - ${problems.join('\n  - ')}`);
  }
}
