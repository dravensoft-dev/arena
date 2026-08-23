/* What travels inside a tarball so an agent in somebody else's editor can read the language
 * offline, and how a path in it is rewritten. It imports only node:path, for the reason
 * package-exclusions.ts imports nothing: the publish guard asks it what a package carries in a
 * job that installed nothing. The payload is a partial clone of this tree rather than a
 * re-authored copy, so a path to something it carries needs no rewrite and only what it leaves
 * behind is touched. IN_PACKAGE is what the package already ships at its root, the layer's own
 * npm page among them under the name npm expects. The site list and the repository list are
 * separate because a wrong guess between them is a link answering 404 to an agent with no way
 * to tell that from an empty answer. The router is renamed on the way in: nothing globbing for
 * the reserved name may find a second one inside a dependency tree. */

import { posix } from 'node:path';

export const AGENT_DIR = 'agent';
export const ROUTER_SOURCE = 'skills/design/SKILL.md';
export const ROUTER_FILE = 'skills/design/ROUTER.md';
export const MANIFEST_FILE = 'skill.json';
export const SUPPORT_FILE = 'support.json';
export const REFERENCE_DIR = 'skills/design/references';

export const LAYER_NEUTRAL_INDEX = 'frameworks/INDEX.md';
export const ROLES = 'contracts/design/roles.json';

export const CARRIED_SHARED = [
  `${REFERENCE_DIR}/*.md`,
  LAYER_NEUTRAL_INDEX,
  ROLES,
];

export function carriedSpecs(layer: string) {
  return [
    ...CARRIED_SHARED,
    `frameworks/${layer}/INDEX.md`,
    `frameworks/${layer}/components/*/INDEX.md`,
    `frameworks/${layer}/components/**/*.prompt.md`,
  ];
}

export const ANY_DEPTH = '\u0000';

export function matchesSpec(path: string, spec: string) {
  const pattern = spec
    .replace(/[.+^${}()|[\]\\]/g, (one) => `\\${one}`)
    .replace(/\*\*\//g, ANY_DEPTH)
    .replace(/\*/g, '[^/]*')
    .split(ANY_DEPTH)
    .join('(?:.*/)?');
  return new RegExp(`^${pattern}$`).test(path);
}

export function inPayload(path: string, layer: string) {
  return carriedSpecs(layer).some((spec) => matchesSpec(path, spec));
}

export const IN_PACKAGE = [
  { spec: 'contracts/behaviour/*.json', to: (path: string) => path },
  { spec: 'arena.tokens.json', to: () => 'arena.tokens.json' },
];

export function packagePath(path: string, layer: string) {
  if (path === `frameworks/${layer}/PACKAGE.md`) return 'README.md';
  const carried = IN_PACKAGE.find((one) => matchesSpec(path, one.spec));
  return carried ? carried.to(path) : null;
}

export const SERVED_BY_SITE = [
  'skills/', 'frameworks/', 'contracts/behaviour/', 'contracts/design/', 'intro/', 'assets/',
  'plugin-style-store/', 'contracts/design-generated/',
];

export const SERVED_BY_REPOSITORY = [
  'contracts/api/', 'frameworks/PACKAGING.md', 'scripts/', 'CONTRIBUTING.md', 'AGENTS.md',
];

export function servedBy(path: string) {
  if (SERVED_BY_REPOSITORY.some((one) => path === one || path.startsWith(one))) return 'repository';
  if (path.endsWith('/AGENTS.md') || path === 'AGENTS.md') return 'repository';
  return SERVED_BY_SITE.some((one) => path.startsWith(one)) ? 'site' : 'repository';
}

export function up(from: string) {
  const depth = from.split('/').length - 1;
  return depth === 0 ? './' : '../'.repeat(depth);
}

export function relativePosix(from: string, target: string) {
  const here = dirOf(from).split('/').filter(Boolean);
  const there = target.split('/').filter(Boolean);
  let shared = 0;
  while (shared < here.length && shared < there.length && here[shared] === there[shared]) shared += 1;
  const climb = '../'.repeat(here.length - shared);
  const descend = there.slice(shared).join('/');
  return climb === '' ? `./${descend}` : `${climb}${descend}`;
}

export function payloadHref(target: string, from: string) {
  return relativePosix(from, target);
}

export function packageHref(target: string, from: string) {
  return `${up(from)}../${target}`;
}

export function dirOf(path: string) {
  const dir = posix.dirname(path);
  return dir === '.' || dir === '/' ? '' : dir;
}

export function resolvePosix(from: string, target: string) {
  const parts = [...dirOf(from).split('/').filter(Boolean), ...target.split('/')];
  const out: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

export const PLACEHOLDER = /<layer>/g;

export function classify(path: string, layer: string) {
  const real = path.replace(PLACEHOLDER, layer);
  if (real === ROUTER_SOURCE) return 'payload';
  if (inPayload(real, layer)) return 'payload';
  if (packagePath(real, layer) !== null) return 'package';
  return servedBy(real) === 'site' ? 'site' : 'repository';
}

export type Bases = { site: string; repository: string };

export function rewriteTarget(path: string, from: string, layer: string, bases: Bases) {
  const real = path.replace(PLACEHOLDER, layer);
  switch (classify(path, layer)) {
    case 'payload':
      return payloadHref(real === ROUTER_SOURCE ? ROUTER_FILE : real, from);
    case 'package':
      return packageHref(packagePath(real, layer) ?? real, from);
    case 'site':
      return `${bases.site}/${real}`;
    default:
      return `${bases.repository}/${real}`;
  }
}

export const REPO_ROOTS = [
  'skills/', 'frameworks/', 'contracts/', 'intro/', 'assets/', 'plugin-style-store/', 'scripts/',
];

export function isRepoPath(text: string) {
  return REPO_ROOTS.some((one) => text.startsWith(one)) || text === 'AGENTS.md'
    || text === 'CONTRIBUTING.md';
}

export const LINK = /\]\(([^)\s]+)\)/g;
export const INLINE = /`([^`\n]+)`/g;

export function rewrite(text: string, from: string, layer: string, bases: Bases) {
  const linked = text.replace(LINK, (whole, target: string) => {
    if (/^[a-z]+:/i.test(target) || target.startsWith('#')) return whole;
    return `](${rewriteTarget(resolvePosix(from, target), from, layer, bases)})`;
  });
  return linked.replace(INLINE, (whole, target: string) => {
    if (target.startsWith('./') || target.startsWith('../')) {
      return `\`${rewriteTarget(resolvePosix(from, target), from, layer, bases)}\``;
    }
    if (!isRepoPath(target)) return whole;
    return `\`${rewriteTarget(target, from, layer, bases)}\``;
  });
}
