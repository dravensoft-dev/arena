/* The role file states questions and never answers one. A role carries the type an answer must
 * take, the description that says what is being asked, and, for a keyword, the closed set of words
 * admissible as an answer; the value belongs to a style plugin. It leaves check:dtcg by name for
 * the same reason: a DTCG token without $value is not a DTCG token, so a conformance gate reading
 * this file would be measuring it against a claim it never made. */

import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { ARENA_EXT } from '../../lib/core/dtcg-shapes.ts';

export const ROLES = 'contracts/design/roles.json';

export const node = {
  name: 'check:role-contract',
  reads: [ROLES],
  writes: [],
  feeds: [],
};

type Role = {
  $type?: string;
  $value?: unknown;
  $description?: string;
  $extensions?: Record<string, { values?: unknown }>;
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

export function zeroRoleProblems(count: number) {
  if (count > 0) return [];
  return [`found 0 roles in ${ROLES} -- an empty result set is a failure, not a clean pass; check `
    + 'the discovery path'];
}

export function collect(root = repoRoot) {
  const roles = readJson(join(root, ROLES)) as Record<string, Role>;
  const zero = zeroRoleProblems(Object.keys(roles).length);
  return zero.length ? zero : declarationProblems(roles);
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
