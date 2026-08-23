/* Where the corpus is, and this server never carries one. Arena's language ships inside the
 * framework package a project already depends on, so a second copy here would be a third answer
 * ageing on a release schedule of its own: what this resolves is somebody else's tree. Three
 * places, in order, because each is a different thing a caller knows: a directory they named, the
 * package their project installed, and nothing, which is an error rather than an empty catalogue.
 * Node only, since this ships as a package of its own and reaches no repository. */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { relPosix, byCodeUnit } from './posix.ts';

export const AGENT_DIR = 'agent';
export const MANIFEST = 'skill.json';
export const SUPPORT = 'support.json';
export const NODE_MODULES = 'node_modules';
export const PACKAGES = ['@dravensoft/arena-react', '@dravensoft/arena-angular'];
export const MAX_CLIMB = 24;

export type Manifest = {
  name: string; description: string; homepage: string; version: string;
  package: string; layer: string; router: string;
};

export function manifestIn(dir: string): Manifest | null {
  try {
    return JSON.parse(readFileSync(join(dir, MANIFEST), 'utf8')) as Manifest;
  } catch {
    return null;
  }
}

export function payloadIn(dir: string) {
  const agent = join(dir, AGENT_DIR);
  if (manifestIn(agent) !== null) return agent;
  return manifestIn(dir) !== null ? dir : null;
}

export function installedPayload(cwd: string, packages = PACKAGES) {
  let at = cwd;
  for (let up = 0; up < MAX_CLIMB; up += 1) {
    for (const name of packages) {
      const found = payloadIn(join(at, NODE_MODULES, ...name.split('/')));
      if (found !== null) return found;
    }
    const parent = dirname(at);
    if (parent === at) break;
    at = parent;
  }
  return null;
}

export type Resolved = { payload: string; error?: undefined }
  | { payload?: undefined; error: string };

export function resolvePayload(named: string | null, cwd: string): Resolved {
  if (named !== null) {
    const found = payloadIn(named);
    if (found === null) {
      return { error: `${named} carries no ${MANIFEST}, so it is not an Arena payload. Point --payload `
        + `at the ${AGENT_DIR}/ directory of an installed Arena package, or at a directory holding it` };
    }
    return { payload: found };
  }
  const found = installedPayload(cwd);
  if (found === null) {
    return { error: 'no Arena package is installed above this directory, and this server carries no '
      + `copy of the language on purpose: it serves the one your project depends on. Install ${PACKAGES.join(' or ')}, `
      + 'or name a payload with --payload' };
  }
  return { payload: found };
}

export function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir).sort(byCodeUnit)) {
    const at = join(dir, entry);
    if (statSync(at).isDirectory()) found.push(...walk(at));
    else found.push(at);
  }
  return found;
}

export { relPosix };

export function readIn(payload: string, rel: string) {
  const at = join(payload, ...rel.split('/'));
  return existsSync(at) ? readFileSync(at, 'utf8') : null;
}
