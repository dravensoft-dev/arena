/* The role file states questions and never answers one. A role carries the type an answer must
 * take, the description that says what is being asked, and, for a keyword, the closed set of words
 * admissible as an answer; the value belongs to a style plugin. It leaves check:dtcg by name for
 * the same reason: a DTCG token without $value is not a DTCG token, so a conformance gate reading
 * this file would be measuring it against a claim it never made. A kernel default is the one
 * answer a role may carry, and only as an alias to a role or to a token the package emits, of the
 * role's own type, so a root plugin silent on the role follows a decision somebody already made.
 * ROSTER is written once from roles.json and never grows: a role outside it carries a default,
 * which is what lets a minor add a role without stopping a build whose root plugin is its own. */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { ARENA_EXT } from '../../lib/core/dtcg-shapes.ts';
import type { DtcgNode } from '../../lib/core/dtcg-shapes.ts';
import { flattenTokens } from '../../lib/core/token-preview.ts';
import { EXCLUDED } from './check-dtcg.ts';

export const ROLES = 'contracts/design/roles.json';

export const ROSTER = 'scripts/check/core/roles-without-default.json';

export const node = {
  name: 'check:role-contract',
  reads: [ROLES, 'contracts/design/*.json', ROSTER],
  writes: [],
  feeds: [],
};

type Role = {
  $type?: string;
  $value?: unknown;
  $description?: string;
  $extensions?: Record<string, { values?: unknown; default?: unknown }>;
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

export function defaultProblems(roles: Record<string, Role>, emitted: ReadonlyMap<string, string>) {
  const problems: string[] = [];
  for (const [name, role] of Object.entries(roles)) {
    const alias = role.$extensions?.[ARENA_EXT]?.default;
    if (alias === undefined) continue;
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

export function zeroRoleProblems(count: number) {
  if (count > 0) return [];
  return [`found 0 roles in ${ROLES} -- an empty result set is a failure, not a clean pass; check `
    + 'the discovery path'];
}

export function collect(root = repoRoot) {
  const roles = readJson(join(root, ROLES)) as Record<string, Role>;
  const zero = zeroRoleProblems(Object.keys(roles).length);
  if (zero.length) return zero;
  return [
    ...declarationProblems(roles),
    ...defaultProblems(roles, emittedTypes(root)),
    ...rosterProblems(roles, readJson(join(root, ROSTER))),
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
    + 'reason, a keyword declares its set, and none of them carries an answer');
}

if (isMainModule(import.meta.url)) main();
