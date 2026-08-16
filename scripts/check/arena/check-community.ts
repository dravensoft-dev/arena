/* Holds the surface a stranger meets before any code: the governance policy, the security route,
 * the issue forms, and the context7.json that decides what an agent's documentation lookup gets
 * back. OUTWARD names each file with the reason it exists, because none of them is reachable from
 * the router and nothing else would notice one going missing. Two failures this exists for: a
 * contact link or an issue form pointing at a path the default branch does not carry, which reads
 * as a maintained project and answers 404; and context7.json drifting from SKILL.md, which is
 * worse than silent, since Context7 has no router and hands back whatever it indexed. Every
 * string in `rules` is therefore required to be a verbatim span of SKILL.md, compared with runs of
 * whitespace flattened so that rewrapping a paragraph is not a failure, which is what makes the
 * copy unable to go quietly false without making it hostage to where a line happens to break. */

import { readFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { skips } from './check-agents.ts';
import { ignoredRoots } from './check-citations.ts';

export const node = {
  name: 'check:community',
  reads: ['CONTRIBUTING.md', 'SECURITY.md', 'skills/design/SKILL.md', 'context7.json', '.github/**'],
  writes: [],
  feeds: [],
};

export const POLICY = 'does not take external pull requests';

export const CONFIG = '.github/ISSUE_TEMPLATE/config.yml';
export const CONTRIBUTING = 'CONTRIBUTING.md';
export const SECURITY = 'SECURITY.md';
export const CONTEXT7 = 'context7.json';
export const ROUTER = 'skills/design/SKILL.md';

export const CONTEXT7_KEYS = [
  '$schema', 'projectTitle', 'description', 'branch', 'folders', 'excludeFolders', 'excludeFiles',
  'rules', 'disallow', 'redirect', 'previousVersions', 'url', 'public_key',
];

export const OUTWARD = new Map([
  [CONTRIBUTING,
   'The one place the governance policy is stated. Every template links it rather than restating '
   + 'it, because a rule copied three times is the copy that goes stale.'],
  [SECURITY,
   'Routes a vulnerability off the public issue tracker. Its channel is private vulnerability '
   + 'reporting, which has to be enabled on the repository for the route to exist.'],
  ['.github/pull_request_template.md',
   'What an external contributor reads at the moment the policy applies to them.'],
  ['.github/ISSUE_TEMPLATE/bug.yml',
   'A form rather than a Markdown template, so check:docs holds it to nothing: prose rules '
   + 'written for documents would measure a form that is not one.'],
  ['.github/ISSUE_TEMPLATE/question.yml',
   'A question the documentation should have answered is a defect in the documentation, and this '
   + 'is where that report arrives.'],
  [CONFIG,
   'Turns off the blank issue and names the contact links, which are the only routes a reporter '
   + 'sees before choosing a form.'],
  [CONTEXT7,
   'Decides what Context7 indexes, and therefore what an agent asking about Arena is handed. '
   + 'Context7 has no router, so an excluded document is the only way to keep the contributor '
   + 'branch out of a consumer answer.'],
]);

export const CONTRIBUTOR_BASENAMES = ['AGENTS.md', 'CLAUDE.md', 'DOUBTS.md', 'PACKAGING.md'];

export const LIMITS = new Map([
  ['projectTitle', 100],
  ['description', 200],
  ['url', 500],
  ['public_key', 100],
]);

export const EXCLUDE_FILE_IS_A_BASENAME = /^[^/\\]+$/;

export const REPO_BLOB = /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\/(.+)$/;

export function unwrapped(text: string) {
  return text.replace(/\s+/g, ' ');
}

export function missingProblems(base = root, outward = OUTWARD) {
  return [...outward]
    .filter(([rel]) => !existsSync(join(base, rel)))
    .map(([rel, reason]) => `${rel} is declared and is not there: ${reason}`);
}

export function markdown(base = root) {
  const posix = (path: string) => relPosix(base, path);
  return walkFiles(base, { skip: (name, path) => skips(name, posix(dirname(path))) })
    .filter((path) => path.endsWith('.md'))
    .map(posix);
}

export function policyProblems(base = root, found = markdown(base), phrase = POLICY) {
  const states = found.filter((rel) => readFileSync(join(base, rel), 'utf8').includes(phrase));
  if (states.length === 1 && states[0] === CONTRIBUTING) return [];
  if (states.length === 0) {
    return [`no document states "${phrase}", so the policy every template points at is not written down`];
  }
  return [
    `"${phrase}" is stated in ${states.length} document(s), ${states.join(', ')}. It belongs to `
    + `${CONTRIBUTING} alone: a rule with more than one home is the one that goes stale in the `
    + 'other, and the templates link it for exactly that reason',
  ];
}

export function templateProblems(base = root) {
  const rel = '.github/pull_request_template.md';
  const path = join(base, rel);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').includes(CONTRIBUTING)
    ? []
    : [`${rel} names no ${CONTRIBUTING}, so it asks a contributor to follow a policy it does not route them to`];
}

export function securityProblems(base = root) {
  const path = join(base, SECURITY);
  if (!existsSync(path)) return [];
  const text = readFileSync(path, 'utf8');
  return /private vulnerability reporting/i.test(text)
    ? []
    : [`${SECURITY} names no reporting channel, so it tells a reporter not to open an issue and nowhere else to go`];
}

export function configProblems(base = root) {
  const path = join(base, CONFIG);
  if (!existsSync(path)) return [];
  const text = readFileSync(path, 'utf8');
  const problems = [];
  if (!/^blank_issues_enabled:\s*false\s*$/m.test(text)) {
    problems.push(
      `${CONFIG} does not set blank_issues_enabled: false, so the blank issue bypasses both forms `
      + 'and every field they ask for',
    );
  }
  for (const url of text.match(/url:\s*(\S+)/g) ?? []) {
    const target = url.replace(/^url:\s*/, '');
    const named = REPO_BLOB.exec(target)?.[1];
    if (!named) continue;
    if (!existsSync(join(base, named))) {
      problems.push(
        `${CONFIG} links ${target}, and this tree carries no ${named}. A contact link resolves `
        + 'against the default branch, so one naming a file that is not there answers 404 to the '
        + 'reporter it was written for',
      );
    }
  }
  return problems;
}

export type Context7 = {
  excludeFolders?: string[];
  excludeFiles?: string[];
  rules?: string[];
  url?: string;
  public_key?: string;
};

export function context7Problems(base = root, ignored = ignoredRoots(base)) {
  const path = join(base, CONTEXT7);
  if (!existsSync(path)) return [];
  const config = readJson(path) as Context7;
  const problems = [];

  for (const key of Object.keys(config)) {
    if (CONTEXT7_KEYS.includes(key)) continue;
    problems.push(`${CONTEXT7} carries "${key}", which the schema it declares does not define. That `
      + 'schema sets additionalProperties to false, so one key outside the set is not one field '
      + 'ignored: the whole file fails to validate, and what Context7 indexes is whatever it falls '
      + 'back to');
  }

  for (const folder of config.excludeFolders ?? []) {
    if (!existsSync(join(base, folder))) {
      problems.push(
        `${CONTEXT7} excludes the folder ${folder}, and it is not in this tree. An exclusion for a `
        + 'directory nobody has is an exclusion that stopped covering anything',
      );
      continue;
    }
    if (ignored.has(folder.split('/')[0] ?? folder)) {
      problems.push(
        `${CONTEXT7} excludes ${folder}, and git ignores it, so it is not in the repository `
        + 'Context7 parses. Asked of this disk the exclusion looks live and asked of a clone it '
        + 'covers nothing, which makes the gate answer differently by machine and the entry read '
        + 'as coverage it never had',
      );
    }
  }

  const fields = config as Record<string, unknown>;
  for (const [key, limit] of LIMITS) {
    const value = fields[key];
    if (typeof value === 'string' && value.length > limit) {
      problems.push(
        `${CONTEXT7} gives ${key} ${value.length} characters and its schema allows ${limit}. The `
        + 'document declares additionalProperties: false, so one field over its limit fails the '
        + 'whole of it, and ownership verification reports that as a complaint about unknown '
        + 'fields, which names neither this field nor this limit',
      );
    }
  }

  for (const name of config.excludeFiles ?? []) {
    if (!EXCLUDE_FILE_IS_A_BASENAME.test(name)) {
      problems.push(
        `${CONTEXT7} excludes ${name}, and excludeFiles takes a file name rather than a path. A `
        + 'path there matches nothing, so the document it was meant to keep out is indexed',
      );
    }
  }

  const ownership = ['url', 'public_key'].filter((key) => (config as Record<string, unknown>)[key]);
  if (ownership.length === 1) {
    problems.push(
      `${CONTEXT7} carries ${ownership[0]} and not the other of url and public_key. Ownership is `
      + 'verified by the pair, so one alone claims nothing and reads as a claim that was made',
    );
  }

  const excluded = new Set(config.excludeFiles ?? []);
  const present = new Set(markdown(base).map((rel) => basename(rel)));
  for (const name of excluded) {
    if (!present.has(name)) {
      problems.push(
        `${CONTEXT7} excludes ${name}, and no document of that name is here. Context7 matches a `
        + 'file name and never a path, so a stale one silently covers nothing',
      );
    }
  }
  for (const name of CONTRIBUTOR_BASENAMES) {
    if (present.has(name) && !excluded.has(name)) {
      problems.push(
        `${name} is on the contributor branch and ${CONTEXT7} does not exclude it. Context7 has no `
        + 'router, so what it indexes is what it hands back, and a contributor document reaches a '
        + 'consumer asking how to use a component',
      );
    }
  }

  const skill = unwrapped(existsSync(join(base, ROUTER)) ? readFileSync(join(base, ROUTER), 'utf8') : '');
  for (const rule of config.rules ?? []) {
    if (!skill.includes(unwrapped(rule))) {
      problems.push(
        `${CONTEXT7} states the rule "${rule}", and ${ROUTER} does not carry those words. A rule `
        + `with a second home goes stale in one of them; every entry in rules is a verbatim span of `
        + `${ROUTER} so that this gate is what notices`,
      );
    }
  }

  return problems;
}

export function zeroScanProblems(found: unknown[]) {
  return found.length === 0
    ? ['found 0 documents; an empty walk reports every exclusion stale and every rule absent, '
       + 'which is a clean-looking pass over a tree it never opened']
    : [];
}

function main() {
  const found = markdown();
  const problems = [
    ...zeroScanProblems(found),
    ...missingProblems(),
    ...policyProblems(root, found),
    ...templateProblems(),
    ...securityProblems(),
    ...configProblems(),
    ...context7Problems(),
  ];
  if (problems.length > 0) {
    console.error(`check-community: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  const config: Context7 = existsSync(join(root, CONTEXT7)) ? readJson(join(root, CONTEXT7)) : {};
  console.log(
    `check-community: ${OUTWARD.size} outward-facing file(s) present, the policy stated once, `
    + `every contact link resolving on this tree, and ${config.rules?.length ?? 0} indexed rule(s) `
    + `quoting ${ROUTER} word for word`,
  );
}

if (isMainModule(import.meta.url)) main();
