import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { comparePatterns } from '../../../scripts/lib/core/behaviour-compliance.ts';
import { loadBinding, loadPatterns, bindingCases, bindingAlso } from '../../../scripts/lib/arena/behaviour-contracts.ts';

const here = dirname(fileURLToPath(import.meta.url));

export const REACT_COMPONENTS = join(here, '..', 'components');

const REPO = join(here, '..', '..', '..');

export const PATTERN_DIR = join(REPO, 'contracts', 'behaviour');

export interface Pattern {
  name: string;
  requires: Record<string, unknown>;
}

export interface BindingCase {
  name: string | null;
  when?: string;
  pattern: string;
  exceptions?: unknown[];
}

const comparePatternsFn = comparePatterns as (options: {
  entries: { pattern: Pattern; exceptions?: unknown[] }[];
  subjects: Record<string, unknown>;
  fallback: unknown;
  behavioural: Record<string, unknown>;
  resolveId: (id: string) => Element | null;
  resolveLabel: (el: Element) => Element | null;
}) => string[];
const loadPatternsFn = loadPatterns as (repo: string) => Map<string, Pattern>;
const bindingAlsoFn = bindingAlso as (binding: unknown) => { pattern?: string; exceptions?: unknown[] }[];
const bindingCasesFn = bindingCases as (binding: unknown) => BindingCase[];

export type Subject = Element | Element[] | null | undefined;

export interface PatternSubjects {
  [requirement: string]: Subject;
}

export interface PatternBehavioural {
  [requirement: string]: unknown;
}

export interface AssertPatternOptions {
  root: Element;
  bindingPath: string;
  subjects?: PatternSubjects;
  behavioural?: PatternBehavioural;
}

export interface PatternCase {
  root: Element;
  subjects?: PatternSubjects;
  behavioural?: PatternBehavioural;
}

export interface AssertPatternCasesOptions {
  bindingPath: string;
  cases: Record<string, () => PatternCase>;
}

let patternCache: Map<string, Pattern> | null = null;

function resolverFor(root: Element) {
  return (id: string): Element | null => {
    if (root.getAttribute && root.getAttribute('id') === id) return root;
    for (const el of root.querySelectorAll('[id]')) {
      if (el.getAttribute('id') === id) return el;
    }
    return null;
  };
}

function labelResolverFor(root: Element) {
  return (el: Element): Element | null => {
    const id = el.getAttribute('id');
    if (id) {
      for (const candidate of root.querySelectorAll('label[for]')) {
        if (candidate.getAttribute('for') === id) return candidate;
      }
    }
    return el.closest('label');
  };
}

interface CompareOneOptions extends PatternCase {
  subjects: PatternSubjects;
  behavioural: PatternBehavioural;
  pattern: Pattern;
  exceptions: unknown[] | undefined;
  binding: unknown;
}

function alsoEntries(binding: unknown, bindingPath: string): { pattern: Pattern; exceptions?: unknown[] }[] {
  patternCache ??= loadPatternsFn(REPO);
  return bindingAlsoFn(binding).map((entry) => {
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
  const fallback = 'default' in subjects ? fallbackSubject : root.firstElementChild;
  return comparePatternsFn({
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
  patternCache ??= loadPatternsFn(REPO);
  const pattern = patternCache.get(binding.pattern);
  if (!pattern) {

    throw new Error(`${bindingPath}\n  names pattern "${binding.pattern}", which has no file in ${PATTERN_DIR}`);
  }
  const problems = compareOne({ root, subjects, behavioural, pattern, exceptions: binding.exceptions, binding }, bindingPath);

  if (problems.length) {
    throw new Error(`${bindingPath}\n  pattern: ${pattern.name}\n  - ${problems.join('\n  - ')}`);
  }
}

export function assertPatternCases({ bindingPath, cases }: AssertPatternCasesOptions): void {
  const binding = loadBinding(bindingPath);
  const declared = bindingCasesFn(binding);
  if (declared.length === 1 && declared[0]?.name === null) {
    throw new Error(`${bindingPath}\n  declares no cases — assert it with assertPattern instead.`);
  }

  const want = declared.map((c) => c.name).filter((n): n is string => n !== null);
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const n of want) {
    if (seen.has(n)) dupes.add(n);
    seen.add(n);
  }
  if (dupes.size) {
    throw new Error(`${bindingPath}\n  declares the same case name more than once: ${[...dupes].join(', ')}`);
  }
  const got = Object.keys(cases);
  const missing = want.filter((n) => !got.includes(n));
  const unknown = got.filter((n) => !want.includes(n));
  if (missing.length || unknown.length) {
    throw new Error(
      `${bindingPath}\n  the suite must render every declared case, and only those.\n` +
      (missing.length ? `  - never rendered: ${missing.join(', ')}\n` : '') +
      (unknown.length ? `  - not declared in the binding: ${unknown.join(', ')}\n` : '') +
      `  declared: ${want.join(', ')}`,
    );
  }

  patternCache ??= loadPatternsFn(REPO);
  const problems: string[] = [];
  for (const c of declared) {
    const pattern = patternCache.get(c.pattern);
    if (!pattern) {
      throw new Error(`${bindingPath}\n  case "${c.name}" names pattern "${c.pattern}", which has no file in ${PATTERN_DIR}`);
    }
    const render = c.name === null ? undefined : cases[c.name];
    if (!render) throw new Error(`${bindingPath}\n  case "${c.name}" has no render thunk`);
    const { root, subjects = {}, behavioural = {} } = render();
    const found = compareOne({ root, subjects, behavioural, pattern, exceptions: c.exceptions, binding }, bindingPath);
    for (const p of found) problems.push(`case "${c.name}" (${c.when}): ${p}`);
  }
  if (problems.length) {
    throw new Error(`${bindingPath}\n  - ${problems.join('\n  - ')}`);
  }
}
