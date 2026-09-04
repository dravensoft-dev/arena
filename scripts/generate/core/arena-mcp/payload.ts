/* Where the corpus is, and this package is the one that carries it. The framework packages ship
 * the components and none of the language, so the question here is which of the two halves to
 * serve: a directory the caller named, a layer they named, or the framework package their project
 * installed, which is the ordinary case and needs no configuration. What a carried corpus costs is
 * that it can disagree with the components beside it, which a payload inside the framework package
 * could not, so the installed package is located even when it holds no corpus: its version is read
 * and compared, and a disagreement is said out loud rather than left for a reader to notice in a
 * member list that no longer matches their imports. Node only, since this ships as a package of
 * its own and reaches no repository. */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { relPosix, byCodeUnit } from './posix.ts';

export const AGENT_DIR = 'agent';
export const MANIFEST = 'skill.json';
export const SUPPORT = 'support.json';
export const NODE_MODULES = 'node_modules';
export const PACKAGES = ['@dravensoft/arena-react', '@dravensoft/arena-angular'];
export const LAYERS = ['react', 'angular'];
export const MAX_CLIMB = 24;

export function layerOf(name: string) {
  return name.split('-').at(-1) ?? '';
}

export type Manifest = {
  name: string; description: string; homepage: string; version: string;
  package: string; layer: string; router: string;
};

export type Installed = { package: string; layer: string; version: string; dir: string };

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

export function bundledRoot(from = import.meta.url) {
  return join(dirname(fileURLToPath(from)), '..');
}

export function bundledPayload(layer: string, root = bundledRoot()) {
  const at = join(root, AGENT_DIR, layer);
  return manifestIn(at) !== null ? at : null;
}

export function versionIn(dir: string) {
  try {
    const { version } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { version?: string };
    return typeof version === 'string' ? version : null;
  } catch {
    return null;
  }
}

export function installedArena(cwd: string, packages = PACKAGES): Installed | null {
  let at = cwd;
  for (let up = 0; up < MAX_CLIMB; up += 1) {
    for (const name of packages) {
      const dir = join(at, NODE_MODULES, ...name.split('/'));
      if (existsSync(join(dir, 'package.json'))) {
        return { package: name, layer: layerOf(name), version: versionIn(dir) ?? '', dir };
      }
    }
    const parent = dirname(at);
    if (parent === at) break;
    at = parent;
  }
  return null;
}

export type Resolved = { payload: string; installed: Installed | null; error?: undefined }
  | { payload?: undefined; installed?: undefined; error: string };

export function resolvePayload(
  named: string | null, cwd: string, layer: string | null = null, root = bundledRoot(),
): Resolved {
  const installed = installedArena(cwd);
  if (named !== null) {
    const found = payloadIn(named);
    if (found === null) {
      return { error: `${named} carries no ${MANIFEST}, so it is not an Arena corpus. Point --payload `
        + `at one of the ${AGENT_DIR}/<layer> directories this package carries, or at a directory holding one` };
    }
    return { payload: found, installed };
  }

  const wanted = layer ?? installed?.layer ?? null;
  if (wanted === null) {
    return { error: 'no Arena package is installed above this directory, so there is no layer to '
      + `serve. Install ${PACKAGES.join(' or ')}, or name the half you want with --layer `
      + `${LAYERS.join(' or --layer ')}` };
  }
  const found = bundledPayload(wanted, root);
  if (found === null) {
    return { error: `this package carries no corpus for the ${wanted} layer, and it is assembled `
      + `with one per layer, so the install is incomplete rather than the layer wrong. Expected it `
      + `at ${join(root, AGENT_DIR, wanted)}` };
  }
  return { payload: found, installed };
}

export function disagreement(manifest: Manifest, installed: Installed | null) {
  if (installed === null || installed.version === '' || manifest.version === '') return null;
  if (installed.version === manifest.version) return null;
  return `This corpus is Arena ${manifest.version} and ${installed.package} in this project is `
    + `${installed.version}. Where the two differ, the components are right and this text is old: `
    + `install matching versions before trusting a member list.`;
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
