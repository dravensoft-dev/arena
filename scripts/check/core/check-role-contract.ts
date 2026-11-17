/* The role file states questions and never answers one. A role carries the type an answer must
 * take, the description that says what is being asked, and, for a keyword, the closed set of words
 * admissible as an answer; the value belongs to a style plugin. It leaves check:dtcg by name for
 * the same reason: a DTCG token without $value is not a DTCG token, so a conformance gate reading
 * this file would be measuring it against a claim it never made. A kernel default is the one
 * answer a role may carry, and only as an alias to a role or to a token the package emits, of the
 * role's own type, so a root plugin silent on the role follows a decision somebody already made.
 * ROSTER is written once from roles.json and never grows: a role outside it carries a default,
 * which is what lets a minor add a role without stopping a build whose root plugin is its own.
 * Every role also declares audience, task and userScale, asks one question and may name its pairs. */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { ARENA_EXT } from '../../lib/core/dtcg-shapes.ts';
import type { DtcgNode } from '../../lib/core/dtcg-shapes.ts';
import { flattenTokens } from '../../lib/core/token-preview.ts';
import { EXCLUDED } from './check-dtcg.ts';
import { AXES } from './check-user-scale.ts';
import { NO_PAINT } from '../../generate/core/arena-cli/style-plugin-rules.ts';

export const ROLES = 'contracts/design/roles.json';

export const ROSTER = 'scripts/check/core/roles-without-default.json';

export const node = {
  name: 'check:role-contract',
  reads: [ROLES, 'contracts/design/*.json', 'contracts/design/colors.css', ROSTER],
  writes: [],
  feeds: [],
};

type Role = {
  $type?: string;
  $value?: unknown;
  $description?: string;
  $extensions?: Record<string, { values?: unknown; default?: unknown; audience?: unknown; task?: unknown; userScale?: unknown; question?: unknown; combines?: unknown; state?: unknown }>;
};

export const AUDIENCES = ['markup', 'component'] as const;

export const TASKS = ['surfaces-and-text', 'edges', 'space-and-layout', 'type', 'depth-and-motion', 'states',
  'meaning-and-identity', 'component-size'] as const;

export const STATE_SELECTORS: Readonly<Record<string, string>> = {
  hover: ':hover',
  'focus-visible': ':focus-visible',
  'aria-selected': '[aria-selected="true"]',
  'aria-current': '[aria-current]:not([aria-current="false"])',
  'aria-pressed': '[aria-pressed="true"]',
  'aria-disabled': '[aria-disabled="true"]',
  disabled: ':disabled',
  'aria-invalid': '[aria-invalid="true"]',
};

const ALIAS = /^\{([a-z][\w-]*(?:\.[\w-]+)*)\}$/;

const targetOf = (role: Role | undefined) => {
  const alias = role?.$extensions?.[ARENA_EXT]?.default;
  return typeof alias === 'string' ? ALIAS.exec(alias.trim())?.[1]?.replace(/\./g, '-') : undefined;
};

export function declarationProblems(roles: Record<string, Role>) {
  const problems: string[] = [];
  for (const [name, token] of Object.entries(roles)) {
    if ('$value' in token) {
      problems.push(`${name} carries a $value. A role is a question, and the answer belongs to a `
        + 'style plugin. Move it to plugin-style-store/default/plugin.tokens.json.');
    }
    if (!token.$type) problems.push(`${name} declares no $type, so nothing can check an answer to it.`);
    if (!token.$description) {
      problems.push(`${name} has no $description. A question nobody can read is a question nobody `
        + 'can answer on purpose.');
    }
    if (token.$type === 'keyword' && !token.$extensions?.[ARENA_EXT]?.values) {
      problems.push(`${name} is a keyword and declares no closed set. The set is what earns the `
        + 'type: without it every word is as valid as every other.');
    }
  }
  return problems;
}

export function emittedTypes(root = repoRoot) {
  const dir = join(root, 'contracts', 'design');
  const types = new Map<string, string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && !EXCLUDED.has(f)).sort())
    for (const token of flattenTokens(readJson(join(dir, file)) as DtcgNode))
      if (token.$type) types.set(token.name, token.$type);
  return types;
}

export function emittedWords(root = repoRoot) {
  const dir = join(root, 'contracts', 'design');
  const words = new Map<string, string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && !EXCLUDED.has(f)).sort()) {
    const tree = readJson(join(dir, file)) as DtcgNode;
    for (const token of flattenTokens(tree)) {
      if (token.$type !== 'keyword') continue;
      const leaf = token.path.reduce<DtcgNode | undefined>((node, key) => node?.[key] as DtcgNode | undefined, tree);
      if (typeof leaf?.$value === 'string') words.set(token.name, leaf.$value);
    }
  }
  return words;
}

export function defaultProblems(roles: Record<string, Role>, emitted: ReadonlyMap<string, string>,
  words: ReadonlyMap<string, string> = new Map()) {
  const problems: string[] = [];
  for (const [name, role] of Object.entries(roles)) {
    const alias = role.$extensions?.[ARENA_EXT]?.default;
    if (alias === undefined) continue;
    if (role.$type === 'color' && alias === NO_PAINT) continue;
    const target = targetOf(role);
    if (target === undefined) {
      problems.push(`${name}: its kernel default is ${JSON.stringify(alias)}, which is not an alias. A default `
        + 'names another role or a token the package emits, because a literal would be a value no plugin chose, '
        + 'which is the defect the role tier exists to prevent.');
      continue;
    }
    const isRole = Object.hasOwn(roles, target);
    if (!isRole && !emitted.has(target)) {
      problems.push(`${name}: its kernel default ${alias} names neither a role in ${ROLES} nor a token the `
        + 'package emits, so a root plugin silent on the role would resolve it to nothing.');
      continue;
    }
    const type = isRole ? roles[target]?.$type : emitted.get(target);
    if (type !== role.$type) {
      problems.push(`${name}: is a ${role.$type} and its kernel default ${alias} is a ${type}, and a default is `
        + 'read as an answer of the role\'s own type.');
      continue;
    }
    const allowed = role.$extensions?.[ARENA_EXT]?.values;
    const word = isRole ? undefined : words.get(target);
    if (Array.isArray(allowed) && word !== undefined && !allowed.includes(word)) {
      problems.push(`${name}: its kernel default ${alias} is the word ${word}, outside ${allowed.join(', ')}. `
        + 'A keyword token names one word, and a default may not answer with a word the role refuses.');
      continue;
    }
    const offered = isRole ? roles[target]?.$extensions?.[ARENA_EXT]?.values : undefined;
    if (Array.isArray(allowed) && Array.isArray(offered)) {
      const outside = offered.filter((word) => !allowed.includes(word));
      if (outside.length)
        problems.push(`${name}: its kernel default ${alias} can take ${outside.join(', ')}, outside `
          + `${allowed.join(', ')}. A keyword's set is the whole of its type, and a default may not widen it.`);
    }
  }
  for (const name of Object.keys(roles)) {
    const seen = [name];
    for (let at = targetOf(roles[name]); at !== undefined && Object.hasOwn(roles, at); at = targetOf(roles[at])) {
      if (at === name) {
        problems.push(`${name}: its kernel default leads back to it through ${[...seen, name].join(', then ')}, `
          + 'so no role in the chain is ever answered.');
        break;
      }
      if (seen.includes(at)) break;
      seen.push(at);
    }
  }
  return problems;
}

const HEAT_DEFAULT = /^\{color\.heat-\d+\}$/;

export function singleAnswerProblems(roles: Record<string, Role>) {
  const problems: string[] = [];
  for (const [name, role] of Object.entries(roles)) {
    const ext = role.$extensions?.[ARENA_EXT];
    if (role.$type === 'keyword' && ext?.default !== undefined && Array.isArray(ext.values) && ext.values.length < 2) {
      problems.push(`${name}: its closed set holds ${ext.values.length} word(s), so its default is the only answer `
        + 'it can take and a plugin has nothing to decide. Widen the set or drop the role.');
    }
    if (role.$type === 'color' && typeof ext?.default === 'string' && HEAT_DEFAULT.test(ext.default.trim())) {
      problems.push(`${name}: its default ${ext.default} is a step of the heat ladder, which belongs to the palette `
        + 'and is pinned there; a role echoing it holds one answer.');
    }
  }
  return problems;
}

export function rosterProblems(roles: Record<string, Role>, roster: unknown) {
  if (!Array.isArray(roster) || roster.some((one) => typeof one !== 'string'))
    return [`${ROSTER} is not a list of role names, so no role can be told apart from one born with a default.`];
  const listed = new Set(roster as string[]);
  const problems: string[] = [];
  for (const name of listed)
    if (!Object.hasOwn(roles, name))
      problems.push(`${ROSTER} names ${name}, which ${ROLES} does not declare; the entry leaves the list with the role.`);
  for (const [name, role] of Object.entries(roles)) {
    const declared = role.$extensions?.[ARENA_EXT]?.default !== undefined;
    if (listed.has(name) && declared)
      problems.push(`${name} is in ${ROSTER} and carries a kernel default. Every adopter's root plugin already `
        + 'answers a role on that list, so a default there only loosens totality for them.');
    if (!listed.has(name) && !declared)
      problems.push(`${name} carries no kernel default and is not in ${ROSTER}. No root plugin of a project's own `
        + `answers it, so without a default every such build stops on it: declare one in `
        + `$extensions["${ARENA_EXT}"].default. The list is written once from ${ROLES} and never grows.`);
  }
  return problems;
}

export function metadataProblems(roles: Record<string, Role>) {
  const problems: string[] = [];
  const axes = [...AXES.keys()];
  const check = (name: string, key: string, got: unknown, set: readonly string[], purpose: string, required: boolean) => {
    if (got === undefined) {
      if (required) problems.push(`${name} has no ${key}. It says ${purpose}; declare one of ${set.join(', ')}.`);
    } else if (typeof got !== 'string' || !set.includes(got)) {
      problems.push(`${name} declares ${key} ${JSON.stringify(got)}, which is not one of ${set.join(', ')}. `
        + `The key says ${purpose}.`);
    }
  };
  for (const [name, role] of Object.entries(roles)) {
    const ext = role.$extensions?.[ARENA_EXT];
    check(name, 'audience', ext?.audience, AUDIENCES, 'who may read the role: markup, or only a component', true);
    check(name, 'task', ext?.task, TASKS, 'which task the role is documented under', true);
    check(name, 'userScale', ext?.userScale, axes, 'what a larger text setting does to the role',
      role.$type === 'dimension');
    const keys = Object.keys(STATE_SELECTORS);
    const state = ext?.state;
    if (ext?.task === 'states') {
      if (state === undefined) {
        problems.push(`${name} has no state. A role of the states task says which state shows it; declare a non-empty list of ${keys.join(', ')}.`);
        continue;
      }
    } else if (state !== undefined) {
      problems.push(`${name} declares state on the ${String(ext?.task)} task. Only a role of the states task names the state that shows it.`);
      continue;
    }
    if (state === undefined) continue;
    if (!Array.isArray(state) || state.length === 0 || state.some((one) => typeof one !== 'string' || !keys.includes(one)))
      problems.push(`${name} declares state ${JSON.stringify(state)}, which is not a non-empty list drawn from ${keys.join(', ')}.`);
    else if (new Set(state).size !== state.length)
      problems.push(`${name} declares state ${JSON.stringify(state)}, which names one state twice.`);
  }
  return problems;
}

export const COMBINE_AS = ['level', 'width', 'density'] as const;

export const QUESTION_MAX = 140;

export const SIZE_QUESTION_MAX = 100;

export function levelNames(root = repoRoot) {
  const css = readFileSync(join(root, 'contracts', 'design', 'colors.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return new Set([...css.matchAll(/--(level-[a-z0-9-]+)\s*:/g)].map(([, name = '']) => name));
}

export function questionProblems(roles: Record<string, Role>) {
  const problems: string[] = [];
  const asked = new Map<string, string>();
  for (const [name, role] of Object.entries(roles)) {
    const question = role.$extensions?.[ARENA_EXT]?.question;
    if (question === undefined) { problems.push(`${name} has no question. It asks what the style plugin answers, in one sentence ending in ?.`); continue; }
    if (typeof question !== 'string') { problems.push(`${name} declares a question that is not a string.`); continue; }
    if (/[\r\n]/.test(question)) problems.push(`${name}: its question runs over more than one line.`);
    if (!question.endsWith('?')) problems.push(`${name}: its question must end in ?.`);
    const cap = role.$extensions?.[ARENA_EXT]?.task === 'component-size' ? SIZE_QUESTION_MAX : QUESTION_MAX;
    if (question.length > cap)
      problems.push(`${name}: its question runs ${question.length} characters, over ${cap}.`);
    if (/[|`\u2014]/.test(question))
      problems.push(`${name}: its question holds a pipe, a backtick or an em dash, which a table cell cannot carry.`);
    const other = asked.get(question);
    if (other !== undefined) problems.push(`${name}: its question is the one ${other} asks, and two roles cannot ask the same.`);
    else asked.set(question, name);
  }
  return problems;
}

export function combineProblems(roles: Record<string, Role>, emitted: ReadonlyMap<string, string>, levels: Set<string>) {
  const problems: string[] = [];
  for (const [name, role] of Object.entries(roles)) {
    const combines = role.$extensions?.[ARENA_EXT]?.combines;
    if (combines === undefined) continue;
    if (!Array.isArray(combines)) { problems.push(`${name}: combines is not a list of { with, as } pairs.`); continue; }
    const seen = new Set<string>();
    for (const pair of combines) {
      const keys = pair !== null && typeof pair === 'object' ? Object.keys(pair).sort().join() : '';
      if (keys !== 'as,with') {
        problems.push(`${name}: a combines entry is ${JSON.stringify(pair)}, and each is exactly { with, as }.`);
        continue;
      }
      const { with: other, as } = pair as { with: unknown; as: unknown };
      if (typeof as !== 'string' || !(COMBINE_AS as readonly string[]).includes(as))
        problems.push(`${name}: combines as ${JSON.stringify(as)}, which is not one of ${COMBINE_AS.join(', ')}.`);
      if (typeof other !== 'string') { problems.push(`${name}: combines with ${JSON.stringify(other)}, which is not a name.`); continue; }
      if (other === name) problems.push(`${name}: combines with itself.`);
      else if (!Object.hasOwn(roles, other) && !emitted.has(other) && !levels.has(other))
        problems.push(`${name}: combines with ${other}, which is no role, no token the package emits and no level of colors.css.`);
      const key = `${other}|${as}`;
      if (seen.has(key)) problems.push(`${name}: combines with ${other} as ${String(as)} twice.`);
      seen.add(key);
    }
  }
  return problems;
}

export function zeroRoleProblems(count: number) {
  if (count > 0) return [];
  return [`found 0 roles in ${ROLES} -- an empty result set is a failure, not a clean pass; check `
    + 'the discovery path'];
}

export function collect(root = repoRoot) {
  const roles = readJson(join(root, ROLES)) as Record<string, Role>;
  const zero = zeroRoleProblems(Object.keys(roles).length);
  if (zero.length) return zero;
  const emitted = emittedTypes(root);
  return [
    ...declarationProblems(roles),
    ...defaultProblems(roles, emitted, emittedWords(root)),
    ...singleAnswerProblems(roles),
    ...rosterProblems(roles, readJson(join(root, ROSTER))),
    ...metadataProblems(roles),
    ...questionProblems(roles),
    ...combineProblems(roles, emitted, levelNames(root)),
  ];
}

function main() {
  const roles = readJson(join(repoRoot, ROLES)) as Record<string, Role>;
  const problems = collect();
  if (problems.length) {
    console.error(`check-role-contract: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-role-contract: ${Object.keys(roles).length} role(s) declare a type and a `
    + 'reason, a keyword declares its set, each names its audience, task, userScale and question, a pair names what it combines with, and none of them '
    + 'carries an answer');
}

if (isMainModule(import.meta.url)) main();
