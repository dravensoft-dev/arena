/* What a workflow that builds in one job and gates in another has to hand over. An artifact no
 * clone checks out reaches the second job only if the cache list names it, and a gate reading an
 * output that is not there judges an absent tree, which is the clean-looking pass over nothing
 * that check:site refuses for its own pages. Which outputs those are is decided by the tracked
 * list rather than by the filesystem, and a spec is compared as a path it would reach rather than
 * resolved against one, so the answer is the same on a machine that has built and on a fresh
 * checkout: a gate that could only see this on a built tree would be blind exactly where the
 * hand-off happens. A step no build invocation runs is out, since the job reading its output runs
 * it first and there is nothing for a hand-off to carry. */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isExclusion, matchesSpec, normalizeSpec, resolveSpecs } from './pathspecs.ts';
import { hostBinary } from '../lib/arena/host-binary.ts';
import type { GraphNode } from './graph.ts';

export const PR_WORKFLOW = '.github/workflows/pr.yml';

export function workflowText(base: string) {
  try {
    return readFileSync(join(base, PR_WORKFLOW), 'utf8');
  } catch {
    return '';
  }
}

export function trackedPaths(base: string) {
  const git = hostBinary('git', 'to list what a clone would check out, which is the only list that '
    + 'answers whether a job that did not build has an artifact at all');
  const { stdout } = spawnSync(git, ['ls-files', '-z'], { cwd: base, encoding: 'utf8' });
  return (stdout ?? '').split('\0').filter(Boolean);
}

export function cachePathLists(text: string) {
  const lines = text.split('\n');
  const lists: string[][] = [];
  lines.forEach((line, i) => {
    const head = /^(\s*)path:\s*\|\s*$/.exec(line);
    if (!head) return;
    const depth = (head[1] ?? '').length;
    const entries = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j] ?? '';
      if (next.trim() === '' || next.length - next.trimStart().length <= depth) break;
      entries.push(next.trim());
    }
    lists.push(entries);
  });
  return lists;
}

export function sampleOf(spec: string) {
  return normalizeSpec(spec)
    .split('/')
    .map((segment) => segment.replace(/\*\*/g, 'x/x').replace(/\*/g, 'x'))
    .join('/');
}

export const carriedBy = (list: string[], spec: string) =>
  list.some((carried) => matchesSpec(carried, sampleOf(spec)));

export function oneListProblems(lists: string[][]) {
  if (lists.length === 0) {
    return [`${PR_WORKFLOW} names no cache path at all, so its build job hands its test jobs `
      + 'nothing and every gate over a built artifact runs against a checkout'];
  }
  const first = lists[0] ?? [];
  if (lists.every((list) => list.join('\n') === first.join('\n'))) return [];
  return [`${PR_WORKFLOW} carries ${lists.length} cache path lists and they are not one list. `
    + 'actions/cache derives its key from the paths as well as from the key, so a restore naming a '
    + 'different set asks for an entry nothing saved, and what the miss costs is a job gating a '
    + 'tree that was never built'];
}

export function handoffProblems(nodes: GraphNode[], text: string, tracked: string[]) {
  if (tracked.length === 0) {
    return [`nothing is tracked, so this compared every artifact against an empty checkout; ${PR_WORKFLOW} was not read`];
  }
  if (text === '') {
    return [`${PR_WORKFLOW} is not there, and it is where a build job says what it hands the jobs that gate`];
  }

  const lists = cachePathLists(text);
  const listed = oneListProblems(lists);
  if (listed.length > 0) return listed;

  const carried = lists[0] ?? [];
  const problems = [];
  for (const node of nodes) {
    if (node.runsBeforeSuites !== undefined) continue;
    for (const spec of node.writes.filter((one) => !isExclusion(one))) {
      if (resolveSpecs([spec], tracked).length > 0) continue;
      if (carriedBy(carried, spec)) continue;
      problems.push(`${node.name} writes ${spec}, which no clone checks out and ${PR_WORKFLOW} `
        + 'does not carry from the job that builds it to the jobs that gate it. A gate handed a '
        + 'tree without it judges an absence, and an absence answers every question it is asked');
    }
  }
  return problems;
}
