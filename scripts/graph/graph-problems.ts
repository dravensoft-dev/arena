/* Everything check:graph asserts, so the gate itself is a print and an exit. Three authorities are
 * joined: the scripts, which declare, package.json, which says what is invocable, and pr.yml,
 * which says what one job hands another. A `reads` reaching no file is a typo or a spec written
 * ahead of the tree, and the directory tells them apart: no directory fails, one holding no match
 * yet is reported and allowed, since refusing it would let a declaration describe only today's
 * tree. A `writes` gets neither test: it names what the node CREATES, so a tree without it is the
 * step not having run, and a gate judging the shape must not answer one way where a step ran and
 * another where it did not. It is reported even so, so a typo has a witness once a full build has
 * left it unreached. Nothing here is cached: a gate judging the shape cannot read it from a
 * fingerprint of the last shape. One spec list is asked once, resolving being this gate's cost. */

import { readJson } from '../utils/read-file.ts';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { universe } from './inputs.ts';
import { reachesNoDirectory, resolveSpecs, unreachedSpecs } from './pathspecs.ts';
import { cyclePath, duplicateWriters, selfFeeds, subscriptionProblems, unknownFeeds } from './graph.ts';
import type { GraphNode } from './graph.ts';
import { ALIASES, NOT_YET_SUBSCRIBED, allNodes, collectedScripts, neverSubscribesReason } from './nodes.ts';
import { handoffProblems, trackedPaths, workflowText } from './handoff.ts';

export function remembering<T>(answer: (specs: string[]) => T) {
  const said = new Map<string, T>();
  return (specs: string[]) => {
    const asked = specs.join('\n');
    const before = said.get(asked);
    if (before !== undefined) return before;
    const now = answer(specs);
    said.set(asked, now);
    return now;
  };
}

export function scriptNames(base = repoRoot) {
  return new Set(Object.keys(readJson(join(base, 'package.json')).scripts ?? {}));
}

export function unaccountedScripts(
  scripts: string[], declaredIn: Map<string, string>,
  notYet = NOT_YET_SUBSCRIBED, neverReason = neverSubscribesReason,
) {
  const declared = new Set(declaredIn.values());
  return scripts
    .filter((path) => !declared.has(path))
    .filter((path) => !notYet.has(path) && neverReason(path) === null)
    .map((path) => `${path} declares no node and is in neither list; a script that opts out of the `
      + 'graph has to say why, and one that has not opted in yet has to be counted');
}

export function staleExceptions(
  scripts: string[], declaredIn: Map<string, string>,
  notYet = NOT_YET_SUBSCRIBED, neverReason = neverSubscribesReason,
) {
  const declared = new Set(declaredIn.values());
  const present = new Set(scripts);
  const problems = [];
  for (const path of [...notYet].sort()) {
    if (declared.has(path)) problems.push(`NOT_YET_SUBSCRIBED names ${path}, which now declares a node; drop it`);
    else if (!present.has(path)) problems.push(`NOT_YET_SUBSCRIBED names ${path}, which is not there`);
  }
  for (const [name, path] of declaredIn) {
    if (neverReason(path) !== null) {
      problems.push(`NEVER_SUBSCRIBES covers ${path}, and it declares ${name}; the exception outlived what it was written for`);
    }
  }
  return problems;
}

export function namingProblems(nodes: GraphNode[], declaredIn: Map<string, string>, names = scriptNames()) {
  const aliased = new Set([...ALIASES.values()].flat());
  return nodes
    .filter((node) => !names.has(node.name) && !aliased.has(node.name))
    .map((node) => `${declaredIn.get(node.name)} declares ${node.name}, and package.json has no script by that name`);
}

export function aliasProblems(nodes: GraphNode[]) {
  const known = new Set(nodes.map((node) => node.name));
  return [...ALIASES].flatMap(([alias, parts]) => parts
    .filter((part) => !known.has(part))
    .map((part) => `ALIASES says ${alias} runs ${part}, and no node is called that`));
}

export function missingScriptProblems(nodes: GraphNode[], declaredIn: Map<string, string>, base = repoRoot) {
  return nodes
    .filter((node) => !existsSync(join(base, declaredIn.get(node.name) ?? '')))
    .map((node) => `${node.name} names ${declaredIn.get(node.name)}, which is not there`);
}

export function emptySpecProblems(
  nodes: GraphNode[], paths: string[], resolve: (specs: string[]) => string[],
  unreached: (specs: string[]) => string[] = (specs) => unreachedSpecs(specs, paths),
) {
  const problems = [];
  for (const node of nodes) {
    if (resolve(node.reads).length === 0) {
      problems.push(`${node.name} reads nothing that is there, so its fingerprint is over an empty `
        + 'list and it would come from the cache for ever');
    }
    for (const spec of unreached(node.reads)) {
      if (!reachesNoDirectory(spec, paths)) continue;
      problems.push(`${node.name} names ${spec}, and the directory it sits in holds no file at all `
        + '-- a spec written for a tree that is not there reaches nothing however the tree grows');
    }
  }
  return problems;
}

export function unreachedSpecNotes(
  nodes: GraphNode[], paths: string[],
  unreached: (specs: string[]) => string[] = (specs) => unreachedSpecs(specs, paths),
) {
  return nodes.flatMap((node) => [
    ...unreached(node.reads)
      .filter((spec) => !reachesNoDirectory(spec, paths))
      .map((spec) => `${node.name} names ${spec}, which matches no file today; its directory is `
        + 'there, so this reads as an extension the node compiles and the tree does not hold yet'),
    ...unreached(node.writes)
      .map((spec) => `${node.name} writes ${spec}, and nothing here matches it; what a step emits `
        + 'is on disk once that step has run, so this is either the tree before the run or a typo, '
        + 'and only a full build tells them apart'),
  ]);
}

export function writingGateProblems(nodes: GraphNode[]) {
  return nodes
    .filter((node) => node.name.startsWith('check:') && node.writes.length > 0)
    .map((node) => `${node.name} declares writes, and a gate judges rather than emits: an artifact `
      + 'a gate writes is one another gate can read, which lets one gate stop another from running '
      + 'and costs the sweep a problem it would have reported. Emit it from a build step instead');
}

export function outsideBuildProblems(nodes: GraphNode[]) {
  return nodes
    .filter((node) => [node.releaseOnly, node.runsBeforeSuites]
      .some((reason) => reason !== undefined && reason.length < 40))
    .map((node) => `${node.name} is outside bun run build and the record does not say why; a step `
      + 'a development loop skips is a decision, and a decision without its reason is worthless');
}

export function vacuousProblems(nodes: GraphNode[], scripts: string[]) {
  if (scripts.length === 0) return ['no script was collected, so this gate compared nothing'];
  if (nodes.length === 0) return ['no script declares a node, so this gate compared nothing'];
  return [];
}

export async function graphProblems(base = repoRoot) {
  const scripts = collectedScripts(base);
  const { nodes, declaredIn } = await allNodes(base);
  const vacuous = vacuousProblems(nodes, scripts);
  if (vacuous.length > 0) return { problems: vacuous, notes: [], nodes, edges: 0 };

  const paths = universe(base);
  const resolve = remembering((specs: string[]) => resolveSpecs(specs, paths));
  const unreached = remembering((specs: string[]) => unreachedSpecs(specs, paths));
  const cycle = cyclePath(nodes);

  const problems = [
    ...unaccountedScripts(scripts, declaredIn),
    ...staleExceptions(scripts, declaredIn),
    ...namingProblems(nodes, declaredIn, scriptNames(base)),
    ...aliasProblems(nodes),
    ...missingScriptProblems(nodes, declaredIn, base),
    ...selfFeeds(nodes),
    ...unknownFeeds(nodes),
    ...(cycle ? [`a cycle produces nothing and never settles: ${cycle.join(' -> ')}`] : []),
    ...duplicateWriters(nodes, resolve),
    ...subscriptionProblems(nodes, resolve),
    ...writingGateProblems(nodes),
    ...outsideBuildProblems(nodes),
    ...emptySpecProblems(nodes, paths, resolve, unreached),
    ...handoffProblems(nodes, workflowText(base), trackedPaths(base)),
  ];

  return {
    problems,
    notes: unreachedSpecNotes(nodes, paths, unreached),
    nodes,
    edges: nodes.reduce((n, node) => n + node.feeds.length, 0),
  };
}
