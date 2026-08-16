/* The consumer branch against the Agent Skills specification: one SKILL.md in the tree, carrying
 * frontmatter, named after the directory holding it, with a description inside the length the
 * standard fixes and a body inside the ceiling it recommends. The count is the assertion rather
 * than a tidiness rule, because a file carrying that name and no frontmatter is not a lesser
 * skill: it is a broken one to every scanner that globs for the name, and the npm convention
 * globs for one a level inside a skills directory anywhere under a dependency tree. The subject
 * is what git tracks, since the plugin is served from the tag where nothing runs a build and a
 * file outside the index reaches no reader. HARNESS_KEYS is empty, and the emptiness is the
 * claim: a key the harness reads and the standard refuses costs every client that validates, and
 * the one this skill carried set a field to the value it already defaults to. */

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, dirname, join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { hostBinary } from '../../lib/arena/host-binary.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { FRONTMATTER, unquote } from '../../lib/arena/llms-index.ts';

export const SKILL = 'SKILL.md';

export const SPEC_KEYS = [
  'name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools',
];

export const HARNESS_KEYS = new Map<string, string>([]);

export const MAX_NAME = 64;
export const MAX_DESCRIPTION = 1024;
export const MAX_BODY_LINES = 500;

export const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const TOP_LEVEL_KEY = /^([A-Za-z][A-Za-z0-9_-]*):/;

export function trackedSkills(base = root) {
  const git = hostBinary('git', 'to read what the tree tracks, which is what a clone and a tag '
    + 'hand a reader and is a question only git can answer');
  const { stdout } = spawnSync(git, ['ls-files'], { cwd: base, encoding: 'utf8' });
  return (stdout ?? '').split('\n').filter((path) => basename(path) === SKILL).sort();
}

export function frontmatterOf(text: string) {
  const front = FRONTMATTER.exec(text);
  if (front === null) return null;
  const keys = [];
  const values = new Map<string, string>();
  for (const line of (front[1] ?? '').split('\n')) {
    const key = TOP_LEVEL_KEY.exec(line);
    if (key === null || key[1] === undefined) continue;
    keys.push(key[1]);
    values.set(key[1], line.slice(key[0].length).trim());
  }
  return { keys, values, body: text.slice(front[0].length).replace(/^\n/, '') };
}

export function soleSkillProblems(paths: string[]) {
  return paths.slice(1).map((path) =>
    `${path}: a second file named ${SKILL}. The name is the one a scanner globs for, so a document `
    + 'reached by link rather than registered carries a name of its own: this one is read as a '
    + 'skill that fails to parse by anything following the standard.');
}

export function zeroSkillProblems(paths: string[]) {
  return paths.length === 0
    ? [`found 0 file(s) named ${SKILL} in the index -- an empty result set is a failure, not a `
       + 'clean pass, and it means the consumer branch reaches no clone at all']
    : [];
}

export function frontmatterProblems(path: string, text: string) {
  return FRONTMATTER.test(text)
    ? []
    : [`${path}: carries no frontmatter, so the name and the description a client loads at startup `
       + 'are not there and the skill is never discovered'];
}

export function nameProblems(path: string, name: string) {
  const parent = basename(dirname(path));
  const problems = [];
  if (name.length === 0 || name.length > MAX_NAME)
    problems.push(`${path}: name is ${name.length} character(s), and the standard fixes 1 to ${MAX_NAME}`);
  if (!NAME.test(name))
    problems.push(`${path}: name ${JSON.stringify(name)} is not lowercase alphanumeric separated by `
      + 'single hyphens, and may neither open, close nor double one');
  if (name !== parent)
    problems.push(`${path}: name ${JSON.stringify(name)} against a parent directory called `
      + `${JSON.stringify(parent)}. The standard binds the two, and a client that falls back to the `
      + 'directory has to land on the same word or the skill answers to two names');
  return problems;
}

export function descriptionProblems(path: string, description: string) {
  if (description.length === 0)
    return [`${path}: description is empty, and it is the whole of what a client loads before it `
      + 'decides whether this skill is relevant at all'];
  return description.length > MAX_DESCRIPTION
    ? [`${path}: description is ${description.length} characters against the ${MAX_DESCRIPTION} the `
       + 'standard fixes']
    : [];
}

export function scalarProblems(path: string, values: Map<string, string>) {
  return [...values]
    .filter(([, value]) => value.length > 0 && unquote(value) === value && value.includes(': '))
    .map(([key]) => `${path}: ${JSON.stringify(key)} is an unquoted value carrying a colon and a `
      + 'space, which ends a plain scalar and reads the rest as a mapping. The frontmatter does '
      + 'not parse as YAML, and a client that validates it refuses the whole file rather than the '
      + 'one field: quote the value');
}

export function keyProblems(path: string, keys: string[]) {
  return keys
    .filter((key) => !SPEC_KEYS.includes(key) && !HARNESS_KEYS.has(key))
    .map((key) => `${path}: frontmatter key ${JSON.stringify(key)} is neither one the standard `
      + 'defines nor one HARNESS_KEYS declares with its reason. A client that validates the '
      + 'frontmatter refuses the whole file over it');
}

export function staleHarnessProblems(keys: string[]) {
  return [...HARNESS_KEYS]
    .filter(([key]) => !keys.includes(key))
    .map(([key, reason]) => `HARNESS_KEYS declares ${JSON.stringify(key)}, which the skill no `
      + `longer carries, so the departure outlived what it was written for: ${reason}`);
}

export function bodyProblems(path: string, body: string) {
  const lines = body.split('\n').length;
  return lines > MAX_BODY_LINES
    ? [`${path}: the body is ${lines} lines against the ${MAX_BODY_LINES} the standard recommends. `
       + 'The whole of it loads the moment the skill activates, so what is read on every task stays '
       + 'here and what is read on one task moves behind a link']
    : [];
}

export function collect(base = root, paths = trackedSkills(base)) {
  const zero = zeroSkillProblems(paths);
  if (zero.length > 0) return zero;
  const path = paths[0] ?? '';
  const text = readFileSync(join(base, path), 'utf8');
  const front = frontmatterOf(text);
  const problems = [...soleSkillProblems(paths), ...frontmatterProblems(path, text)];
  if (front === null) return problems;
  return [
    ...problems,
    ...nameProblems(path, unquote(front.values.get('name') ?? '')),
    ...descriptionProblems(path, unquote(front.values.get('description') ?? '')),
    ...keyProblems(path, front.keys),
    ...scalarProblems(path, front.values),
    ...staleHarnessProblems(front.keys),
    ...bodyProblems(path, front.body),
  ];
}

function main() {
  const paths = trackedSkills();
  const problems = collect(root, paths);
  if (problems.length > 0) {
    console.error(`check-skill-spec: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`check-skill-spec: ${paths[0]} is the one skill this tree tracks, and it answers the `
    + `Agent Skills specification with ${HARNESS_KEYS.size} declared departure(s)`);
}

if (isMainModule(import.meta.url)) main();
