/* The discovery record, which is the only file of Arena's that lands in a consumer's own tree.
 * No editor scans node_modules for a skill, so the corpus stays in the package and one file goes
 * where the scanners look, carrying the router's own text with every path re-based onto the
 * payload. It is generated, stamped with the version it came from and idempotent, because a copy
 * that ages on its own schedule is the thing Arena refuses; --skill-check is what reads it back.
 * Node and its siblings only, like everything else here: inside a package scripts/ does not
 * exist. --global implies --vendor, since a path relative to one project's node_modules means
 * nothing outside it. */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { relPosix } from './posix.ts';
import { homedir } from 'node:os';

export const SKILL_DIR = '.agents/skills/arena';
export const RECORD = 'SKILL.md';
export const SKILL_NAME = 'arena';
export const AGENT_DIR = 'agent';
export const MANIFEST = 'skill.json';
export const VENDORED = 'agent';
export const PACKAGE_PAGE = 'README.md';

export const DEFAULT_LOCATIONS = ['.agents/skills', '.github/skills', '.claude/skills'];

export type Manifest = {
  name: string; description: string; homepage: string; version: string;
  package: string; layer: string; router: string;
};

export { relPosix };

export function readManifest(arena: string): Manifest | null {
  try {
    return JSON.parse(readFileSync(join(arena, AGENT_DIR, MANIFEST), 'utf8')) as Manifest;
  } catch {
    return null;
  }
}

export const RELATIVE_LINK = /\]\((\.[^)\s]*)\)/g;
export const RELATIVE_INLINE = /`(\.\.?\/[^`\n]*)`/g;

export function rebase(text: string, base: string) {
  const onto = (target: string) => (base === '.' ? target : posix.normalize(`${base}/${target}`));
  return text
    .replace(RELATIVE_LINK, (_whole, target: string) => `](${onto(target)})`)
    .replace(RELATIVE_INLINE, (_whole, target: string) => `\`${onto(target)}\``);
}

export function banner(manifest: Manifest, command: string) {
  return `<!-- Written by \`${command}\` from ${manifest.package}@${manifest.version}.\n`
    + '     Do not edit: run the command again. Run `arena-to-prod --skill-check` to find out\n'
    + '     whether this file still describes the package installed here. -->';
}

export function frontmatter(manifest: Manifest) {
  return ['---', `name: ${SKILL_NAME}`, 'license: MIT',
    `description: ${JSON.stringify(manifest.description)}`, 'metadata:',
    `  homepage: ${manifest.homepage}`, `  version: ${manifest.version}`,
    `  package: "${manifest.package}"`, '---'].join('\n');
}

export function record(router: string, manifest: Manifest, base: string, command: string) {
  return `${frontmatter(manifest)}\n${banner(manifest, command)}\n\n${rebase(router, base)}`;
}

export const NODE_MODULES = 'node_modules';

export function installedAt(cwd: string, name: string, arena: string) {
  let at = cwd;
  for (let up = 0; up < 24; up += 1) {
    const candidate = join(at, NODE_MODULES, ...name.split('/'));
    if (existsSync(join(candidate, AGENT_DIR, MANIFEST))) return candidate;
    const parent = dirname(at);
    if (parent === at) break;
    at = parent;
  }
  return arena;
}

export function routerBase(arena: string, into: string, vendored: boolean) {
  const from = vendored ? join(into, VENDORED) : join(arena, AGENT_DIR);
  return relPosix(into, join(from, ...dirnameOf(routerOf(arena)).split('/')));
}

export function routerOf(arena: string) {
  return readManifest(arena)?.router ?? 'skills/design/ROUTER.md';
}

export function dirnameOf(path: string) {
  const at = posix.dirname(path);
  return at === '.' ? '' : at;
}

export function copyTree(from: string, to: string) {
  const written: string[] = [];
  for (const entry of readdirSync(from)) {
    const source = join(from, entry);
    const target = join(to, entry);
    if (statSync(source).isDirectory()) {
      mkdirSync(target, { recursive: true });
      written.push(...copyTree(source, target));
    } else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(source));
      written.push(target);
    }
  }
  return written;
}

export const ANY_LINK = /\]\(([^)\s]+)\)/g;
export const OFF_TREE = /^(?:[a-z]+:|#|\/)/i;

export function targetsIn(text: string) {
  const found: string[] = [];
  for (const one of text.matchAll(ANY_LINK)) found.push(one[1] ?? '');
  for (const one of text.matchAll(RELATIVE_INLINE)) found.push(one[1] ?? '');
  return [...new Set(found.filter((one) => one && !OFF_TREE.test(one)))];
}

export function unresolved(text: string, into: string) {
  return targetsIn(text)
    .filter((target) => !target.includes('<') && !target.includes('*'))
    .filter((target) => !existsSync(join(into, ...target.split('/'))));
}

export function recordAt(dir: string) {
  return join(dir, RECORD);
}

export function locationsFor(named: string[], global: boolean, cwd: string) {
  if (global) return [join(homedir(), '.agents', 'skills', SKILL_NAME)];
  const dirs = named.length > 0 ? named : [SKILL_DIR];
  return dirs.map((one) => (one.endsWith(SKILL_NAME) ? join(cwd, one) : join(cwd, one, SKILL_NAME)));
}
