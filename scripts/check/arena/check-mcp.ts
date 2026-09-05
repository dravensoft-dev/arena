/* The MCP package against what it promises. Six claims. It declares the dependencies it actually
 * imports and no others, since a server that resolves at build and throws at spawn is what an
 * editor reports as a broken configuration rather than a missing package. Its bin resolves to a
 * file that is there. It carries the corpus, one per layer, since a package shipping the transport
 * and none of the documents installs cleanly and answers every question with silence. Every path
 * inside it resolves to something the package carries or the site publishes, a rewritten link
 * landing nowhere being the one failure a reader cannot tell from an empty answer. The catalogue
 * reaches every component the tree declares. And server.json states this tree's own name and
 * version, since a manifest a registry hands a stranger and nothing here holds goes stale in
 * silence. dist/ is git-ignored, so the three that read it skip against an unassembled tree. */

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import {
  DIST, SOURCE, ENTRY, BIN, NAME, REGISTRY_NAME, RUNTIME_DEPENDENCIES, manifest, sources,
} from '../../build/arena/build-mcp-package.ts';
import { catalogue } from '../../generate/core/arena-mcp/catalogue.ts';
import { manifestIn, bundledPayload } from '../../generate/core/arena-mcp/payload.ts';
import { servedDocs } from '../../lib/arena/llms-index.ts';
import { LINK, INLINE, isRepoPath } from '../../lib/arena/agent-payload.ts';
import { LAYERS as BUILT_LAYERS } from '../../build/arena/build-mcp-package.ts';

export const REGISTRY_FILE = 'server.json';
export const REGISTRY_SCHEMA = 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json';
export const REGISTRY_DESCRIPTION_LIMIT = 100;
export const PLUGIN_MANIFEST = '.claude-plugin/plugin.json';

export type ServerJson = {
  $schema?: string;
  name?: string;
  description?: string;
  version?: string;
  packages?: { registryType?: string; identifier?: string; version?: string }[];
};

export const node = {
  name: 'check:mcp',
  reads: [`${SOURCE}/**`, `${DIST}/**`, 'frameworks/Components.json', REGISTRY_FILE],
  writes: [],
  feeds: [],
};

export const BARE_IMPORT = /^\s*import\s(?:[^'"]*\sfrom\s)?['"]([^.'"][^'"]*)['"]/gm;

export function importedPackages(base = root) {
  const found = new Set<string>();
  for (const file of sources(base)) {
    for (const one of readFileSync(file, 'utf8').matchAll(BARE_IMPORT)) {
      const specifier = one[1] ?? '';
      if (specifier.startsWith('node:')) continue;
      found.add(specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : (specifier.split('/')[0] ?? specifier));
    }
  }
  return found;
}

export function dependencyProblems(
  base = root, declared: Record<string, string> = RUNTIME_DEPENDENCIES,
) {
  const imported = importedPackages(base);
  const names = new Set(Object.keys(declared));
  const problems = [];
  for (const one of imported) {
    if (names.has(one)) continue;
    problems.push(`${NAME} imports ${one} and declares no dependency on it, so the package installs `
      + 'and the server throws at spawn, which an editor reports as a broken configuration rather '
      + 'than a missing package');
  }
  for (const one of names) {
    if (imported.has(one)) continue;
    problems.push(`${NAME} declares a dependency on ${one} and imports it nowhere, so every consumer `
      + 'installs a package this server never reaches');
  }
  return problems;
}

export function assembled(base = root) {
  return join(base, ...DIST.split('/'));
}

export function binProblems(dir: string) {
  const declared = manifest().bin?.[BIN];
  if (declared !== `./${ENTRY}`) {
    return [`${NAME}: the manifest declares ${BIN} at ${declared} rather than ./${ENTRY}`];
  }
  return existsSync(join(dir, ...ENTRY.split('/')))
    ? []
    : [`${NAME}: ${ENTRY} is declared as the bin and is not there, so the command an editor spawns `
       + 'does not exist'];
}

export const SITE_BASE = 'https://arena.dravensoft.org/';

export function targetsIn(text: string) {
  const targets = [...text.matchAll(LINK)].map((one) => one[1] ?? '');
  for (const one of text.matchAll(INLINE)) {
    const inner = one[1] ?? '';
    if (inner.startsWith('http') || inner.startsWith('./') || inner.startsWith('../')) targets.push(inner);
  }
  return targets.filter(Boolean);
}

export function unresolvedTarget(target: string, from: string, agent: string, served: Set<string>) {
  if (target.startsWith(SITE_BASE)) {
    const rel = target.slice(SITE_BASE.length).replace(/[#?].*$/, '');
    if (rel.includes('*') || rel.includes('<')) return null;
    return served.has(rel) || existsSync(join(root, ...rel.split('/')))
      ? null
      : `${rel} is named as a page on the domain and this tree does not carry it, `
        + 'so the site publishes nothing there';
  }
  if (/^[a-z]+:/i.test(target) || target.startsWith('#')) return null;
  if (target.includes('*') || target.includes('<')) return null;
  const at = join(dirname(join(agent, from)), target);
  return existsSync(at) ? null : `${target} resolves to nothing a consumer installs`;
}

export function registryProblems(base = root) {
  const path = join(base, REGISTRY_FILE);
  if (!existsSync(path)) {
    return [`${REGISTRY_FILE} is not there, and it is the whole of what the registry reads. Without `
      + `it ${NAME} publishes to npm and appears in no index, which a download count cannot tell `
      + 'apart from a package nobody wants'];
  }

  const server = readJson(path) as ServerJson;
  const plugin = readJson(join(base, ...PLUGIN_MANIFEST.split('/'))) as {
    version?: string; repository?: string;
  };
  const declared = plugin.version ?? '';
  const owner = (plugin.repository ?? '').split('/').at(-2) ?? '';
  const namespace = REGISTRY_NAME.split('/')[0] ?? '';
  const problems = [];

  if (server.$schema !== REGISTRY_SCHEMA) {
    problems.push(`${REGISTRY_FILE} declares the schema ${server.$schema ?? 'none'} and this tree is `
      + `written against ${REGISTRY_SCHEMA}. The publisher refuses a manifest whose schema is not `
      + 'the current one, and its rejection is the only other place that mismatch appears');
  }
  if (server.name !== REGISTRY_NAME) {
    problems.push(`${REGISTRY_FILE} names the server ${JSON.stringify(server.name ?? '')} and this `
      + `tree claims ${REGISTRY_NAME}. The name is the entry's identity, so a second one is a `
      + 'second entry rather than an edit of the first');
  }
  if (namespace !== `io.github.${owner}`) {
    problems.push(`${REGISTRY_FILE} sits under the namespace ${namespace} and ${PLUGIN_MANIFEST} `
      + `names the repository owner ${owner}, whose namespace is io.github.${owner}. GitHub OIDC `
      + 'proves the owner and nothing else, so an entry under any other namespace is one this '
      + 'repository cannot publish at all');
  }
  const stamped = manifest(base).mcpName;
  if (stamped !== server.name) {
    problems.push(`the manifest stamps mcpName ${JSON.stringify(stamped ?? '')} and `
      + `${REGISTRY_FILE} names ${JSON.stringify(server.name ?? '')}. The registry reads mcpName out `
      + 'of the published package to prove the entry and refuses it when the two disagree');
  }
  if (server.version !== declared) {
    problems.push(`${REGISTRY_FILE} states version ${server.version ?? 'none'} and ${PLUGIN_MANIFEST} `
      + `hands out ${declared}. Every surface that states a version states the same one, and this is `
      + 'the one a reader reaches without this tree');
  }

  const npm = server.packages?.[0];
  if (npm === undefined) {
    problems.push(`${REGISTRY_FILE} carries no packages entry, so the entry names no artefact and an `
      + 'agent that finds it has nothing to install');
  } else {
    if (npm.identifier !== NAME) {
      problems.push(`${REGISTRY_FILE} points its npm package at ${npm.identifier ?? 'nothing'} and `
        + `this entry is ${NAME}'s. The registry proves ownership against the package the entry `
        + 'names, so it would read the mcpName of a tarball this tree does not stamp');
    }
    if (npm.version !== declared) {
      problems.push(`${REGISTRY_FILE} states packages[0].version ${npm.version ?? 'none'} and `
        + `${PLUGIN_MANIFEST} hands out ${declared}, so the entry describes a tarball other than the `
        + 'one this release publishes');
    }
  }

  const description = server.description ?? '';
  if (description.length > REGISTRY_DESCRIPTION_LIMIT) {
    problems.push(`${REGISTRY_FILE} carries a description of ${description.length} characters `
      + `against the ${REGISTRY_DESCRIPTION_LIMIT} the schema allows, so the publisher rejects the `
      + 'manifest and that rejection is the only other place the ceiling is stated');
  }

  return problems;
}

export function corpusProblems(dir: string) {
  const problems = [];
  const served = new Set(servedDocs());
  for (const layer of BUILT_LAYERS) {
    const payload = bundledPayload(layer, dir);
    if (payload === null) {
      problems.push(`${NAME} carries no corpus for the ${layer} layer. The framework packages ship `
        + 'the components and none of the language, so a half missing here is a half no agent can '
        + 'read, and the package installs and starts anyway');
      continue;
    }
    for (const file of walkFiles(payload).filter((one) => one.endsWith('.md'))) {
      const from = relPosix(payload, file);
      const text = readFileSync(file, 'utf8');
      for (const bare of text.matchAll(INLINE)) {
        const inner = bare[1] ?? '';
        if (isRepoPath(inner) && !inner.includes(' ')) {
          problems.push(`${NAME}: ${layer}/${from} still names the repository path `
            + `${JSON.stringify(inner)}. A consumer has no such path, so the rewrite left a reader `
            + 'somewhere that does not exist and nothing at install time would say so');
        }
      }
      for (const target of targetsIn(text)) {
        const problem = unresolvedTarget(target, from, payload, served);
        if (problem) problems.push(`${NAME}: ${layer}/${from} names ${problem}`);
      }
    }
  }
  return problems;
}

export function catalogueProblems(dir: string, base = root) {
  const declared = readJson(join(base, 'frameworks', 'Components.json')) as Record<string, string[]>;
  const expected = Object.values(declared).flat().length;
  const problems = [];
  for (const layer of BUILT_LAYERS) {
    const payload = bundledPayload(layer, dir);
    if (payload === null) continue;
    const found = manifestIn(payload);
    if (found === null) { problems.push(`${payload} carries no manifest`); continue; }
    const served = catalogue(payload, found).entries
      .filter((one) => one.uri.startsWith('arena://component/')).length;
    if (served === expected) continue;
    problems.push(`${NAME} would serve ${served} component document(s) of the ${layer} layer against `
      + `the ${expected} the tree declares. A server that serves half the library answers the other `
      + 'half with silence, and a caller has no way to tell that from a component that does not exist');
  }
  return problems;
}

export function collect(base = root) {
  const dir = assembled(base);
  const problems = [...dependencyProblems(base), ...registryProblems(base)];
  if (!existsSync(dir)) return { problems, assembled: false };
  return {
    problems: [
      ...problems, ...binProblems(dir), ...corpusProblems(dir), ...catalogueProblems(dir, base),
    ],
    assembled: true,
  };
}

function main() {
  const { problems, assembled: built } = collect();
  if (problems.length > 0) {
    console.error(`check-mcp: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`check-mcp: ${NAME} declares the ${Object.keys(RUNTIME_DEPENDENCIES).length} dependency `
    + `it imports and states ${REGISTRY_NAME} at the version ${PLUGIN_MANIFEST} hands out`
    + `${built ? ', ships its bin, carries one corpus per layer whose every path resolves, '
    + 'and would serve every component the tree declares' : ', and is not assembled, so the bin and '
    + 'the corpus rules went unread'}`);
}

if (isMainModule(import.meta.url)) main();
