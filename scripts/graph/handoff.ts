/* What a build hands to a job or a run that did not make it. An artifact no clone checks out
 * reaches a reader only through the paths an arena-build- cache or artifact step names, and a gate
 * reading an output that is not there judges an absent tree. actions/cache derives an entry's
 * version from its path list, so a restore naming a different list misses on the right key: every
 * such list in every workflow is BUILD_HANDOFF_PATHS, in its order. Which outputs need carrying is
 * decided by the tracked list rather than by the filesystem, and a spec is compared as a path it
 * would reach, so the answer is the same on a built machine and on a fresh checkout. */

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isExclusion, matchesSpec, normalizeSpec, resolveSpecs } from './pathspecs.ts';
import { hostBinary } from '../lib/arena/host-binary.ts';
import type { GraphNode } from './graph.ts';

export const BUILD_HANDOFF_PATHS: readonly string[] = [
  'frameworks/**/*.generated.*',
  'frameworks/react/dist',
  'frameworks/angular/dist',
  'frameworks/angular/build',
  'dist/contracts',
  'dist/mcp',
  'dist/site',
];

export const WORKFLOWS_DIR = '.github/workflows';
export const HANDOFF_PREFIX = 'arena-build-';

const HANDOFF_ACTION = /^actions\/(?:cache|cache\/save|cache\/restore|upload-artifact|download-artifact)$/;

export type Workflow = { file: string; text: string };
export type HandoffStep = { file: string; line: number; label: string; uses: string; paths: string[] | null; unreadable?: boolean };

export function workflowTexts(base: string): Workflow[] {
  let names: string[];
  try {
    names = readdirSync(join(base, WORKFLOWS_DIR));
  } catch {
    return [];
  }
  return names
    .filter((name) => /\.ya?ml$/.test(name))
    .sort()
    .map((name) => ({ file: `${WORKFLOWS_DIR}/${name}`, text: readFileSync(join(base, WORKFLOWS_DIR, name), 'utf8') }));
}

export function trackedPaths(base: string) {
  const git = hostBinary('git', 'to list what a clone would check out, which is the only list that '
    + 'answers whether a job that did not build has an artifact at all');
  const { stdout } = spawnSync(git, ['ls-files', '-z'], { cwd: base, encoding: 'utf8' });
  return (stdout ?? '').split('\0').filter(Boolean);
}

const indentOf = (line: string) => line.length - line.trimStart().length;

function blockList(lines: string[], at: number, depth = indentOf(lines[at] ?? '')) {
  const entries = [];
  for (let j = at + 1; j < lines.length; j += 1) {
    const next = lines[j] ?? '';
    if (next.trim() === '' || indentOf(next) <= depth) break;
    entries.push(next.trim());
  }
  return entries;
}

function childrenOf(lines: string[], at: number, depth: number) {
  const children = [];
  for (let j = at + 1; j < lines.length; j += 1) {
    const next = lines[j] ?? '';
    if (next.trim().startsWith('#')) continue;
    if (next.trim() !== '' && indentOf(next) <= depth) break;
    children.push(next);
  }
  return children;
}

export function handoffSteps(file: string, text: string): HandoffStep[] {
  const lines = text.split('\n');
  const steps: HandoffStep[] = [];
  lines.forEach((line, start) => {
    const dash = /^(\s*)-(\s+)(\S.*)$/.exec(line);
    if (!dash) return;
    const depth = (dash[1] ?? '').length;
    const column = depth + 1 + (dash[2] ?? '').length;
    let end = start + 1;
    while (end < lines.length && (/^\s*(#.*)?$/.test(lines[end] ?? '') || indentOf(lines[end] ?? '') > depth)) end += 1;
    const body = [`${' '.repeat(column)}${dash[3] ?? ''}`, ...lines.slice(start + 1, end)];
    const field = (name: string, at: number, within = body) => within
      .map((one) => new RegExp(`^ {${at}}["']?${name}["']?:\\s*(.*?)\\s*$`).exec(one)?.[1])
      .find((value) => value !== undefined)
      ?.replace(/^['"]|['"]$/g, '');
    const uses = (field('uses', column) ?? '').split('@')[0] ?? '';
    if (!HANDOFF_ACTION.test(uses)) return;
    const label = field('name', column) ?? uses;
    const withAt = body.findIndex((one) => new RegExp(`^ {${column}}with:`).test(one));
    const flow = withAt >= 0 ? (field('with', column) ?? '').replace(/^#.*$/, '') : '';
    const block = withAt >= 0 && flow === '' ? childrenOf(body, withAt, column) : [];
    const childAt = indentOf(block.find((one) => one.trim() !== '' && !one.trim().startsWith('#')) ?? '');
    const id = field('key', childAt, block) ?? field('name', childAt, block) ?? '';
    const envAt = body.findIndex((one) => new RegExp(`^ {${column}}env:`).test(one));
    const after = body.findIndex((one, at) => at > envAt && one.trim() !== '' && !one.trim().startsWith('#')
      && indentOf(one) <= column);
    const envEnd = envAt < 0 ? 0 : after < 0 ? body.length : after;
    const named = body
      .filter((one, at) => !new RegExp(`^ {${column}}[\"']?name[\"']?:`).test(one) && !(at > envAt && at < envEnd))
      .some((one) => one.includes(HANDOFF_PREFIX));
    const unreadable = !id.startsWith(HANDOFF_PREFIX) && named;
    if (!id.startsWith(HANDOFF_PREFIX) && !unreadable) return;
    const pathAt = block.findIndex((one) => new RegExp(`^ {${childAt}}path:`).test(one));
    const header = /^\s*path:\s*\|[-+]?\d*\s*(#.*)?$/;
    const paths = !unreadable && pathAt >= 0 && header.test(block[pathAt] ?? '') ? blockList(block, pathAt, childAt) : null;
    steps.push({ file, line: start + 1, label, uses, paths, ...(unreadable ? { unreadable } : {}) });
  });
  return steps;
}

function listDifference(paths: string[], carried: readonly string[]) {
  const missing = carried.filter((one) => !paths.includes(one));
  const extra = paths.filter((one) => !carried.includes(one));
  if (missing.length === 0 && extra.length === 0) {
    return paths.length === carried.length ? 'the same paths in another order' : 'a path listed twice';
  }
  return [
    missing.length > 0 ? `missing ${missing.join(', ')}` : '',
    extra.length > 0 ? `extra ${extra.join(', ')}` : '',
  ].filter(Boolean).join('; ');
}

export function stepProblems(steps: HandoffStep[], carried: readonly string[] = BUILD_HANDOFF_PATHS) {
  const problems = [];
  for (const step of steps) {
    const where = `${step.file}:${step.line} (${step.label})`;
    if (step.unreadable) {
      problems.push(`${where} names ${HANDOFF_PREFIX} in a shape this gate cannot read, so nothing can hold `
        + 'its paths to BUILD_HANDOFF_PATHS; write with: as a block mapping of plain keys');
      continue;
    }
    if (step.paths === null) {
      if (step.uses === 'actions/download-artifact') continue;
      problems.push(`${where} names its paths on one line or not at all, so nothing can hold them to `
        + 'BUILD_HANDOFF_PATHS; write them as a block list, one path per line under `path: |`');
      continue;
    }
    if (step.paths.join('\n') === carried.join('\n')) continue;
    const reason = step.uses.startsWith('actions/cache')
      ? 'actions/cache derives an entry\'s version from its path list, so a restore naming another list '
        + 'misses on the right key and its reader builds, or gates, a tree nobody handed it'
      : 'the job that downloads the artifact is handed only what the list carries, so a reader of another '
        + 'list builds, or gates, a tree nobody handed it';
    problems.push(`${where} carries a path list that is not BUILD_HANDOFF_PATHS (${listDifference(step.paths, carried)}). ${reason}`);
  }
  return problems;
}

export function sampleOf(spec: string) {
  return normalizeSpec(spec)
    .split('/')
    .map((segment) => segment.replace(/\*\*/g, 'x/x').replace(/\*/g, 'x'))
    .join('/');
}

export const carriedBy = (list: readonly string[], spec: string) =>
  list.some((carried) => matchesSpec(carried, sampleOf(spec)));

export function uncarriedProblems(nodes: GraphNode[], tracked: string[], carried: readonly string[] = BUILD_HANDOFF_PATHS) {
  const problems = [];
  for (const node of nodes) {
    for (const spec of node.writes.filter((one) => !isExclusion(one))) {
      if (resolveSpecs([spec], tracked).length > 0) continue;
      if (carriedBy(carried, spec)) continue;
      problems.push(`${node.name} writes ${spec}, which no clone checks out and BUILD_HANDOFF_PATHS in `
        + 'scripts/graph/handoff.ts does not carry to the jobs and runs that read it. A gate handed a '
        + 'tree without it judges an absence, and an absence answers every question it is asked');
    }
  }
  return problems;
}

export function handoffProblems(nodes: GraphNode[], workflows: Workflow[], tracked: string[]) {
  if (tracked.length === 0) {
    return ['nothing is tracked, so every artifact would be compared against an empty checkout, and no workflow is read'];
  }
  if (workflows.length === 0) {
    return [`${WORKFLOWS_DIR} holds no workflow, and a workflow is where one job or run hands a build to another`];
  }
  const steps = workflows.flatMap(({ file, text }) => handoffSteps(file, text));
  if (steps.length === 0) {
    return [`no workflow under ${WORKFLOWS_DIR} has an ${HANDOFF_PREFIX} cache or artifact step, so every `
      + 'build is handed to nothing and every gate over a built artifact runs against a checkout'];
  }
  return [...stepProblems(steps), ...uncarriedProblems(nodes, tracked)];
}
