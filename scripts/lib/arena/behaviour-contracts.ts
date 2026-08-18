import { readdirSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { pascal } from '../../utils/case.ts';

export const PATTERN_DIR = 'contracts/behaviour';

const NONE = 'none';
const ABSENT = 'absent';
const REQUIRES_OPTIONAL = new Set([NONE, ABSENT]);

export function validatePattern(fileStem: string, pattern: any) {
  const problems = [];
  if (pattern.name !== fileStem) {
    problems.push(`${fileStem}: name "${pattern.name}" does not match its filename`);
  }
  if (!pattern.source) {
    problems.push(`${fileStem}: no source — a pattern is adopted, not invented, and must cite where from`);
  }
  const keys = Object.keys(pattern.requires ?? {});
  if (!REQUIRES_OPTIONAL.has(fileStem) && keys.length === 0) {
    problems.push(`${fileStem}: requires is empty — a pattern must state at least one requirement`);
  }
  for (const key of keys) {
    if (!key.includes('.')) {
      problems.push(`${fileStem}: requirement "${key}" must be dotted (group.leaf) so an exception can name exactly one`);
    }
  }
  if ('additive' in pattern && pattern.additive !== true) {
    problems.push(`${fileStem}: "additive" is present and not true. It says a component adds this pattern to the one it already binds, so the only value that means anything is true; omit it for an ordinary pattern rather than declaring it false.`);
  }
  if (pattern.additive === true) {
    if (!pattern.description) {
      problems.push(`${fileStem}: an additive pattern must carry a description. It is bound alongside another pattern rather than instead of one, so nothing else on the page says why a component owes both.`);
    }
    for (const key of keys.filter((k) => k.startsWith('roles.'))) {
      problems.push(`${fileStem}: requires "${key}", and an additive pattern may require nothing in the roles family. Which element a component renders and what names it are answered once, by the pattern it binds; a second pattern answering them again is a contradiction with no way to report which of the two the component broke.`);
    }
  }
  return problems;
}

export function loadPatterns(root: string) {
  const dir = join(root, PATTERN_DIR);
  const out = new Map();
  for (const entry of readdirSync(dir).sort()) {
    if (extname(entry) !== '.json') continue;
    const stem = basename(entry, '.json');
    out.set(stem, readJson(join(dir, entry)));
  }
  return out;
}

export function loadBinding(absPath: string) {
  return readJson(absPath);
}

export type BindingException = { requirement: string; reason?: string };

export type BindingCase = {
  name: string | null;
  when: string | null;
  pattern: string | undefined;
  reason: string | null;
  exceptions: BindingException[];
};

export type BindingAlso = {
  pattern?: string;
  exceptions?: BindingException[];
};

export type BehaviourBinding = {
  component?: string;
  pattern?: string;
  reason?: string;
  divergesFrom?: string;
  delegatedTo?: string;
  exceptions?: BindingException[];
  also?: BindingAlso[];
  cases?: {
    name?: string;
    when?: string;
    pattern?: string;
    reason?: string;
    exceptions?: BindingException[];
  }[];
};

export function bindingAlso(binding: BehaviourBinding): BindingAlso[] {
  return Array.isArray(binding.also) ? binding.also : [];
}

export function bindingCases(binding: BehaviourBinding): BindingCase[] {
  if (!Array.isArray(binding.cases)) {
    return [{
      name: null,
      when: null,
      pattern: binding.pattern,
      reason: binding.reason ?? null,
      exceptions: binding.exceptions ?? [],
    }];
  }
  return binding.cases.map((c: any) => ({
    name: c.name ?? null,
    when: c.when ?? null,
    pattern: c.pattern,
    reason: c.reason ?? binding.reason ?? null,
    exceptions: c.exceptions ?? [],
  }));
}

export function validateBinding(component: string, layer: string, binding: BehaviourBinding, patterns: any) {
  const problems = [];
  const where = `${layer}/${component}`;

  if ('pattern' in binding && Array.isArray(binding.cases)) {
    problems.push(`${where}: declares both "pattern" and "cases" — a binding declares one or the other. Two places for one fact is what deriving IDREF from IDREF_ATTRIBUTES fixed once already.`);
    return problems;
  }
  if (Array.isArray(binding.cases)) {
    const seen = new Set();
    for (const [i, c] of binding.cases.entries()) {
      if (!c.name) {
        problems.push(`${where}: cases[${i}] declares no "name". A case exists to say WHICH render it describes, so a nameless one declares the only thing it is for. It also skips the "when" requirement, because that rule can only fire on a named case.`);
        continue;
      }
      if (seen.has(c.name)) {
        problems.push(`${where}: declares the case name "${c.name}" more than once. crossLayerAgrees builds its per-name map last-write-wins, so only the last declaration would ever be compared across layers, and the earlier ones would be invisible rather than wrong.`);
      }
      seen.add(c.name);
    }
  }
  for (const c of bindingCases(binding)) {
    const label = c.name ? `${where} case "${c.name}"` : where;
    if (c.name !== null && !c.when) {
      problems.push(`${label}: a case must say WHEN it is produced. Prose is enough and prose is all that is possible -- nothing can verify a suite rendered the configuration a case names.`);
    }
    const pattern = patterns.get(c.pattern);
    if (!pattern) {
      problems.push(`${label}: unknown pattern "${c.pattern}" — no such file in ${PATTERN_DIR}`);
      continue;
    }
    if (c.pattern && REQUIRES_OPTIONAL.has(c.pattern) && !c.reason) {
      problems.push(`${label}: binding ${c.pattern} requires a reason — "nothing recorded", "verified presentational" and "does not exist here" must not look alike`);
    }
    for (const e of c.exceptions) {
      if (!(e.requirement in pattern.requires)) {
        problems.push(`${label}: excepts "${e.requirement}", which pattern "${c.pattern}" does not require`);
      }
      if (!e.reason) {
        problems.push(`${label}: exception for "${e.requirement}" has no reason`);
      }
    }
  }
  const alsoSeen = new Set();
  for (const [i, entry] of bindingAlso(binding).entries()) {
    const label = `${where} also[${i}]`;
    const pattern = patterns.get(entry.pattern);
    if (!pattern) {
      problems.push(`${label}: unknown pattern "${entry.pattern}" — no such file in ${PATTERN_DIR}`);
      continue;
    }
    if (pattern.additive !== true) {
      problems.push(`${label}: "${entry.pattern}" is not additive, so it cannot be added to another. A component binds one pattern for what it does, and "also" is for the ones that say something a component owes ON TOP of that; a pattern that answers roles, keys or focus belongs in "pattern" or in a case, where a layer can be held to exactly one of them.`);
      continue;
    }
    if (alsoSeen.has(entry.pattern)) {
      problems.push(`${label}: adds "${entry.pattern}" twice, so one of the two declarations governs nothing and an exception written on the wrong one would be silently ignored.`);
    }
    alsoSeen.add(entry.pattern);
    for (const e of entry.exceptions ?? []) {
      if (!(e.requirement in pattern.requires)) {
        problems.push(`${label}: excepts "${e.requirement}", which pattern "${entry.pattern}" does not require`);
      }
      if (!e.reason) {
        problems.push(`${label}: exception for "${e.requirement}" has no reason`);
      }
    }
  }
  for (const c of bindingCases(binding)) {
    const pattern = patterns.get(c.pattern);
    if (pattern?.additive === true) {
      problems.push(`${where}: binds "${c.pattern}" as its pattern, and that one is additive. It states what a component owes BESIDES the pattern it binds, so on its own it would leave the roles, the keys and the focus unanswered rather than answered as none.`);
    }
  }

  if ('delegatedTo' in binding && !binding.delegatedTo) {
    problems.push(`${where}: delegatedTo must name the third-party control that provides the behaviour, e.g. "SomeLibrary someControl". No entry declares one today; the branch stands so the first that does is checked.`);
  }

  if (layer === 'angular' && !binding.component) {
    problems.push(`${where}: an angular binding must declare "component", naming its React counterpart (e.g. "ArenaStatCard" for stat-card)`);
  }
  return problems;
}

export function crossLayerAgrees(a: BehaviourBinding, b: BehaviourBinding) {
  if (a.pattern === ABSENT || b.pattern === ABSENT) return true;

  const added = (x: BehaviourBinding) => bindingAlso(x).map((e) => e.pattern).sort().join(',');
  if (added(a) !== added(b)) return false;

  const mine = bindingCases(a);
  const theirs = bindingCases(b);

  const patternsOf = (cs: BindingCase[]) => new Set(cs.map((c) => c.pattern));
  if (a.divergesFrom && patternsOf(theirs).has(a.divergesFrom)) return true;
  if (b.divergesFrom && patternsOf(mine).has(b.divergesFrom)) return true;

  const names = (cs: BindingCase[]) => cs.map((c) => c.name).sort().join(',');
  if (names(mine) !== names(theirs)) return false;

  if (Array.isArray(a.cases) || Array.isArray(b.cases)) {
    const byName = (cs: BindingCase[]) => new Map(cs.map((c) => [c.name, c.pattern]));
    const theirsByName = byName(theirs);
    return mine.every((c) => theirsByName.get(c.name) === c.pattern);
  }
  return a.pattern === b.pattern;
}

export function reactComponents(root: string) {
  const base = join(root, 'frameworks/react/components');
  const out = [];
  for (const category of readdirSync(base, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    for (const dir of readdirSync(join(base, category.name), { withFileTypes: true })) {
      if (dir.isDirectory()) out.push(pascal(dir.name));
    }
  }
  return out.sort();
}

export function angularPrimitives(root: string) {
  const base = join(root, 'frameworks/angular/components');
  const out = [];
  for (const category of readdirSync(base, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    for (const dir of readdirSync(join(base, category.name), { withFileTypes: true })) {
      if (dir.isDirectory()) out.push(dir.name);
    }
  }
  return out.sort();
}

export function angularBindingPath(root: string, dir: string) {
  const base = join(root, 'frameworks/angular/components');
  const stem = pascal(dir);
  for (const category of readdirSync(base, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const path = join(base, category.name, dir, `${stem}.behaviour.json`);
    if (existsSync(path)) return { path, stem, tail: `${category.name}/${dir}/${stem}.behaviour.json` };
  }
  return null;
}

export function reactBindingPath(root: string, dir: string) {
  const base = join(root, 'frameworks/react/components');
  const stem = pascal(dir);
  for (const category of readdirSync(base, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const tail = `${category.name}/${dir}/${stem}.behaviour.json`;
    const path = join(base, tail);
    if (existsSync(path)) return { path, stem, tail };
  }
  return null;
}
