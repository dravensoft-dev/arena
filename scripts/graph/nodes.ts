/* Collects the graph by importing every script under the three phases and keeping the ones that
 * export a node, so a script subscribes by editing itself and no central table has to be edited
 * with it. Importing is what lets a declaration reuse the constants the script already has, which
 * is the whole reason it is not a table: a target list written twice drifts the first time one of
 * them gains an entry. Two lists say what is out, both keyed by path because that is the key every
 * script has and an npm name is not: one names what will never subscribe, each with its reason,
 * and one names what has not yet, which is a count that goes to zero. The first is not imported
 * at all, and check-graph.ts is why: collecting reaches the gate that is running, whose own guard
 * correctly answers that it IS the program, so it re-enters itself once per collection. */

import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { walkFiles } from '../utils/walk-files.ts';
import { relPosix } from '../utils/posix-path.ts';
import { isScript } from '../lib/arena/domains.ts';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { matchesSpec } from './pathspecs.ts';
import type { GraphNode } from './graph.ts';
import { deadline, type Deadline } from '../lib/arena/deadline.ts';

export const COLLECTION: Deadline = deadline('graph:collection', 30_000,
  'collecting imports every script under the three phases, which measured 3227ms warm on a '
  + 'machine with nothing else on it, and every one of them is parsed on the way');

export const COLLECTED_PHASES = ['build', 'generate', 'check'];

export const ALIASES = new Map([
  ['generate:api', ['generate:api-types', 'generate:member-docs', 'generate:prompt-api']],
]);

export const NEVER_SUBSCRIBES = new Map([
  ['scripts/check/arena/check-graph.ts',
   'it judges the graph, and a gate reading the shape from a fingerprint of the shape it had last '
   + 'time cannot report the shape changing under it'],
  ['scripts/check/arena/check-docs.ts',
   'it reads every .md on the branch and every hand-written source, for the comment rule; narrowing '
   + 'that to manufacture a cache hit narrows what the gate claims and not what it costs'],
  ['scripts/check/arena/check-citations.ts',
   'it resolves the code path in every citation in every .md, so its subject is the whole tree'],
  ['scripts/check/arena/check-agents.ts',
   'it walks the branch for a level nobody wrote, and a level nobody wrote sits in no spec'],
  ['scripts/check/arena/check-structure.ts',
   'it walks both framework layers for a file in the wrong place, so a file appearing anywhere is '
   + 'exactly what it exists to see'],
  ['scripts/check/arena/check-script-types.ts',
   'it runs tsc over every script and suite under scripts/, which is the closure of nearly every '
   + 'node, so it is dirty whenever any of them is'],
  ['scripts/check/arena/check-script-reach.ts',
   'its subject is the paths into scripts/ named from outside it, which is every other tree'],
  ['scripts/check/arena/check-release.ts',
   'it asserts what a git tag hands out, and there is nothing to assert until one exists, which is '
   + 'also why it is in no runner'],
  ['scripts/generate/core/fetch-fonts.ts',
   'it downloads the webfonts, so the network decides its answer and no fingerprint of this tree '
   + 'can; it is outside bun run build for the same reason'],
  ['scripts/check/core/check-fonts-generated.ts',
   'it asks whether the URL each declared family is served from answers, so the network decides '
   + 'part of its answer and no fingerprint of this tree can'],
  ['scripts/check/arena/check-all.ts',
   'it is the runner rather than a step, and a runner that could come from the cache would hand '
   + 'back the whole run'],
  ['scripts/generate/core/arena-to-prod',
   'the CLI both npm packages ship, and its siblings. It runs in a consumer project against their '
   + 'config, so nothing in this tree is its input and no build here produces its output'],
]);

export const neverSubscribesReason = (path: string) =>
  [...NEVER_SUBSCRIBES].find(([spec]) => matchesSpec(spec, path))?.[1] ?? null;

export const NOT_YET_SUBSCRIBED = new Set<string>([]);

export function collectedScripts(root = repoRoot) {
  return COLLECTED_PHASES
    .flatMap((phase) => walkFiles(join(root, 'scripts', phase)))
    .filter((full) => isScript(basename(full)))
    .map((full) => relPosix(root, full))
    .sort();
}

export async function allNodes(root = repoRoot) {
  const nodes: GraphNode[] = [];
  const declaredIn = new Map<string, string>();
  const silent = [];
  for (const rel of collectedScripts(root)) {
    if (neverSubscribesReason(rel) !== null) continue;
    const loaded = await import(pathToFileURL(join(root, rel)).href);
    const node = loaded.node as GraphNode | undefined;
    if (!node) { silent.push(rel); continue; }
    nodes.push(node);
    declaredIn.set(node.name, rel);
  }
  return { nodes, declaredIn, silent };
}
