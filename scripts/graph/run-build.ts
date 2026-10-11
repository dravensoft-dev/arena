/* Runs the build on the scheduler in the order the graph derives, so the sequence follows what each
 * step declares rather than prose in package.json that nothing tests. It runs the steps under
 * build/ and generate/ and never a gate. A step starts once every step it reads from has ended,
 * beside any other that is ready, and prints as one block when it ends; --jobs=1 is the serial
 * run. A failure blocks what READS what that step writes, transitively, and nothing else.
 * --target=<step> selects that step and every step it reads from. The fingerprint RECORDED is
 * measured as the step ends, over what its own writes reach, because two generators write into
 * what they read, and the state is written then, so a crash keeps the greens before it.
 * --assert-full fails a run that kept anything, which stops a workflow proving the build
 * idempotent over one that did nothing. */

import { availableParallelism, freemem } from 'node:os';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../utils/main-module.ts';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { childOutputAsync, type StepOutput } from '../lib/arena/child-output.ts';
import { byName, needsOf, topoOrder, transitiveFeeds, upstreamOf } from './graph.ts';
import type { GraphNode } from './graph.ts';
import { BUILT_BY, allNodes, isBuildStep } from './nodes.ts';
import { restamp, stampAll, universe } from './inputs.ts';
import { fingerprintOne, type Fingerprint } from './fingerprint.ts';
import { forget, readFiles, readState, recordGreen, writeFiles, writeState } from './state.ts';
import { decide, shortFingerprint } from './plan.ts';
import {
  describeSlots, interruptOn, parseJobs, schedule, scheduleProblems, slotsFor,
  type Finished, type Outcome, type Slots, type Step,
} from './scheduler.ts';
import { stepBlock } from './step-block.ts';

export { BUILT_BY, isBuildStep };

export function selectSteps(
  nodes: GraphNode[],
  declaredIn: Map<string, string>,
  options: { assemble: boolean; targets: string[] },
) {
  const order = topoOrder(nodes);
  if (options.targets.length === 0) return order.filter((node) => isBuildStep(declaredIn, node, options.assemble));
  const known = byName(nodes);
  for (const target of options.targets) {
    const node = known.get(target);
    if (!node) {
      throw new Error(`run-build: --target=${target} names no step the graph holds; a target is the npm `
        + 'script of a step under build/ or generate/');
    }
    if (!isBuildStep(declaredIn, node, true)) {
      throw new Error(`run-build: --target=${target} is not a build step: a gate judges rather than builds, `
        + 'and a step the suites run belongs to them');
    }
  }
  const closure = new Set(options.targets);
  for (const target of options.targets) for (const name of upstreamOf(nodes, target)) closure.add(name);
  return order.filter((node) => closure.has(node.name) && isBuildStep(declaredIn, node, true));
}

export function parseBuildArgs(argv: string[]) {
  let force = false;
  let assertFull = false;
  let assemble = false;
  let jobs: number | null = null;
  const targets: string[] = [];
  for (const arg of argv) {
    if (arg === '--force') { force = true; continue; }
    if (arg === '--assert-full') { assertFull = true; continue; }
    if (arg === '--assemble') { assemble = true; continue; }
    if (arg.startsWith('--target=')) {
      const target = arg.slice('--target='.length);
      if (target === '') throw new Error('run-build: --target= names no step; write --target=<the npm script of a build step>');
      if (!targets.includes(target)) targets.push(target);
      continue;
    }
    if (arg.startsWith('--jobs=')) {
      if (jobs !== null) {
        throw new Error('run-build: --jobs is given twice, and which one counts would be a guess; give it once');
      }
      jobs = parseJobs(arg.slice('--jobs='.length), 'run-build');
      continue;
    }
    throw new Error(`run-build: unrecognised argument "${arg}"; it takes --force, --assert-full, --assemble, `
      + '--target=<step> and --jobs=<n>');
  }
  return { force, assertFull, assemble, targets, jobs };
}

export function keptButFailed(results: { name: string; status: string }[], wouldKeep: Set<string>) {
  return results
    .filter((r) => r.status === 'fail' && wouldKeep.has(r.name))
    .map((r) => `${r.name} failed and the graph would have kept it -- that is a defect in the `
      + 'declared graph, not only in the step: something it reads is not something it says it reads');
}

export function partialRunProblems(results: { name: string; status: string }[]) {
  const kept = results.filter((r) => r.status === 'cached').map((r) => r.name);
  if (kept.length === 0) return [];
  return [`${kept.length} step(s) came from the cache and this run was asked to be a full one: `
    + `${kept.join(', ')}. A build that skipped is a build whose idempotence nobody proved.`];
}

export type BuildStatus = 'pass' | 'fail' | 'cached' | 'blocked';
export type BuildResult = { name: string; status: BuildStatus; note?: string | undefined; ms?: number | undefined };

const LABEL: Record<string, string> = { pass: 'PASS', fail: 'FAIL', cached: 'CACHED', blocked: 'BLOCKED' };

export function summaryLine(r: BuildResult) {
  const label = LABEL[r.status];
  if (!label) {
    throw new Error(`run-build: ${r.name} reports "${r.status}", which is none of ${Object.keys(LABEL).join(', ')}`);
  }
  let took = '';
  if (r.status === 'pass' || r.status === 'fail') {
    if (typeof r.ms !== 'number' || !Number.isFinite(r.ms) || r.ms < 0) {
      throw new Error(`run-build: ${r.name} ran and carries no duration, and a summary that prints none `
        + 'reads as a step that took no time');
    }
    took = `  ${(r.ms / 1000).toFixed(1)} s`;
  }
  return `  ${label}  ${r.name}${took}${r.note ? `  (${r.note})` : ''}`;
}

export function summarize(results: BuildResult[], interrupted?: { notStarted: string[] }) {
  if (results.length === 0 && (interrupted?.notStarted.length ?? 0) === 0) {
    throw new Error('run-build: no step to summarize, and a summary over nothing reads as all passed');
  }
  const count = (status: BuildStatus) => results.filter((r) => r.status === status).length;
  const failed = count('fail');
  const blocked = count('blocked');
  const kept = `, ${count('pass') + failed} ran, ${count('cached')} came from the cache`;
  const held = blocked ? `, ${blocked} did not run because an upstream failed` : '';
  let tail;
  if (interrupted) {
    tail = `run-build: INTERRUPTED${kept}${held}, ${interrupted.notStarted.length} never started`
      + `${interrupted.notStarted.length ? `: ${interrupted.notStarted.join(', ')}` : ''}`;
  } else if (failed) tail = `run-build: ${failed}/${results.length} step(s) failed${kept}${held}`;
  else tail = `run-build: all ${results.length} step(s) passed${kept}${held}`;
  return [...results.map(summaryLine), '', tail].join('\n');
}

export function buildOutcome(r: StepOutput): Outcome {
  if (r.error) return { status: 'fail', note: `failed to spawn: ${r.error.message}` };
  if (r.signal) {
    return { status: 'fail', note: r.ignored ? `ignored ${r.ignored}, killed by ${r.signal}` : `killed by ${r.signal}` };
  }
  if (r.code === null) return { status: 'fail', note: 'ended with neither an exit code nor a signal' };
  if (r.code === 0) return { status: 'pass' };
  return r.code === 1 ? { status: 'fail' } : { status: 'fail', note: `exited ${r.code}` };
}

export function collate(order: string[], results: BuildResult[], notStarted: string[] = []) {
  const at = new Map(order.map((name, index) => [name, index]));
  const stray = results.filter((r) => !at.has(r.name)).map((r) => r.name);
  if (stray.length > 0) throw new Error(`run-build: ${stray.join(', ')} finished without being planned`);
  const seen = new Set<string>();
  const twice: string[] = [];
  for (const r of results) {
    if (seen.has(r.name)) twice.push(r.name);
    seen.add(r.name);
  }
  if (twice.length > 0) throw new Error(`run-build: ${twice.join(', ')} is reported twice, and a step runs exactly once`);
  const missing = order.filter((name) => !seen.has(name) && !notStarted.includes(name));
  if (missing.length > 0) {
    throw new Error(`run-build: ${missing.join(', ')} is planned and neither finished nor listed as not started`);
  }
  return [...results].sort((a, b) => (at.get(a.name) ?? 0) - (at.get(b.name) ?? 0));
}

export function exitCode(results: BuildResult[], problems: string[], interrupted: boolean) {
  if (interrupted) return 130;
  return results.some((r) => r.status === 'fail') || problems.length > 0 ? 1 : 0;
}

export function buildSteps(order: GraphNode[], nodes: GraphNode[], run: (node: GraphNode) => Promise<Outcome>): Step[] {
  const needs = needsOf(nodes);
  const selected = new Set(order.map((node) => node.name));
  return order.map((node) => ({
    name: node.name,
    pool: node.pool,
    cost: node.cost,
    after: (needs.get(node.name) ?? []).filter((name) => selected.has(name)),
    run: () => run(node),
  }));
}

export type BuildRun = {
  nodes: GraphNode[];
  declaredIn: Map<string, string>;
  order: GraphNode[];
  root: string;
  force: boolean;
  slots: Slots;
  signal?: AbortSignal | undefined;
  commandFor?: ((node: GraphNode) => { command: string; args: string[] }) | undefined;
  print?: ((text: string) => void) | undefined;
};

export async function runGraph(run: BuildRun) {
  const { nodes, declaredIn, order, root } = run;
  const print = run.print ?? ((text: string) => { process.stdout.write(text); });
  const commandFor = run.commandFor ?? ((node: GraphNode) => {
    const script = declaredIn.get(node.name);
    if (!script) throw new Error(`run-build: ${node.name} has no script that declares it, so there is nothing to spawn`);
    return { command: process.execPath, args: [join(root, script)] };
  });
  const needs = needsOf(nodes);
  const state = readState(root);
  const upstream = new Map<string, string>();
  const onDisk = (path: string) => existsSync(join(root, path));
  let paths = universe(root);
  const stamps = stampAll(root, paths, readFiles(root));
  const measure = () => ({ declaredIn, root, paths, stamps, needs, upstream });

  const blocked = new Map<string, string>();
  const kind = new Map<string, 'cached' | 'blocked'>();
  const after = new Map<string, Fingerprint>();
  const wouldKeep = new Set<string>();
  const unspawned = new Set<string>();

  const step = async (node: GraphNode): Promise<Outcome> => {
    const failedAbove = blocked.get(node.name);
    if (failedAbove) {
      print(`\nrun-build: ${node.name} does not run, because ${failedAbove} failed and it reads what that `
        + 'writes; a step compiled against an upstream that failed reports a second error over the real one\n');
      kind.set(node.name, 'blocked');
      return { status: 'skip' };
    }
    const before = fingerprintOne(node, measure());
    const measured = decide(node, before, state.get(node.name), onDisk);
    if (!measured.run) wouldKeep.add(node.name);
    const decided = run.force ? { run: true, reason: 'this is a full run' } : measured;
    if (!decided.run) {
      print(`\nrun-build: ${node.name} comes from the cache (${shortFingerprint(before.fingerprint)})\n`);
      upstream.set(node.name, state.get(node.name)?.fingerprint ?? before.fingerprint);
      kind.set(node.name, 'cached');
      return { status: 'pass' };
    }
    const { command, args } = commandFor(node);
    if (run.signal?.aborted) {
      unspawned.add(node.name);
      return { status: 'skip' };
    }
    const ended = await childOutputAsync(command, args, { cwd: root, signal: run.signal });
    const outcome = buildOutcome(ended);
    print(stepBlock('run-build', { name: node.name, reason: decided.reason }, ended.output, outcome));
    if (outcome.status === 'pass') {
      paths = restamp(root, node.writes, paths, stamps);
      const measuredAfter = fingerprintOne(node, measure());
      upstream.set(node.name, measuredAfter.fingerprint);
      after.set(node.name, measuredAfter);
    }
    return outcome;
  };

  const record = (one: Finished) => {
    if (unspawned.has(one.name)) return;
    const how = kind.get(one.name);
    if (how === 'cached') return;
    if (how === undefined && one.status === 'pass') {
      const measured = after.get(one.name);
      if (!measured) throw new Error(`run-build: ${one.name} passed and carries no fingerprint measured after it`);
      recordGreen(state, one.name, measured, new Date().toISOString());
    } else {
      forget(state, one.name);
      if (how === undefined) for (const fed of transitiveFeeds(nodes, one.name)) blocked.set(fed, one.name);
    }
    writeState(state, root);
  };

  const { finished, notStarted } = await schedule(buildSteps(order, nodes, step), run.slots,
    { signal: run.signal, finished: record });
  writeFiles(stamps, root);
  const results: BuildResult[] = finished.filter((one) => !unspawned.has(one.name)).map((one) => {
    const how = kind.get(one.name);
    if (how) return { name: one.name, status: how };
    return { name: one.name, status: one.status === 'pass' ? 'pass' : 'fail', note: one.note, ms: one.ms };
  });
  const unstarted = [...unspawned, ...notStarted];
  return {
    results: collate(order.map((node) => node.name), results, unstarted),
    notStarted: unstarted,
    wouldKeep,
    interrupted: run.signal?.aborted ?? false,
  };
}

export type MainDeps = {
  root?: string | undefined;
  collect?: ((root: string) => Promise<{ nodes: GraphNode[]; declaredIn: Map<string, string> }>) | undefined;
  signal?: AbortSignal | undefined;
  print?: ((text: string) => void) | undefined;
  error?: ((text: string) => void) | undefined;
  cores?: number | undefined;
  free?: number | undefined;
  commandFor?: BuildRun['commandFor'];
};

export async function main(argv: string[] = process.argv.slice(2), deps: MainDeps = {}) {
  const root = deps.root ?? repoRoot;
  const print = deps.print ?? ((text: string) => { process.stdout.write(text); });
  const error = deps.error ?? ((text: string) => { process.stderr.write(text); });
  let options;
  try {
    options = parseBuildArgs(argv);
  } catch (err) {
    error(`${(err as Error).message}\n`);
    return 1;
  }

  let collected;
  let order;
  try {
    collected = await (deps.collect ?? allNodes)(root);
    order = selectSteps(collected.nodes, collected.declaredIn, options);
  } catch (err) {
    error(`${(err as Error).message}\n`);
    return 1;
  }
  if (order.length === 0) {
    error('run-build: the selection holds no step, so a run would build nothing; release-only steps are '
      + 'included by --assemble\n');
    return 1;
  }

  const cores = deps.cores ?? availableParallelism();
  const free = deps.free ?? freemem();
  const slots = slotsFor(options.jobs, cores, free);
  const refused = scheduleProblems(buildSteps(order, collected.nodes, async () => ({ status: 'pass' })), slots);
  if (refused.length > 0) {
    error(`run-build: the run cannot be scheduled: ${refused.join('; ')}\n`);
    return 1;
  }

  if (options.targets.length > 0) {
    print(`run-build: ${order.length} step(s), the upstream closure of ${options.targets.join(', ')}\n`);
  }
  print(`run-build: ${describeSlots(options.jobs, cores, free)}\n`);

  let run;
  try {
    run = await runGraph({
      nodes: collected.nodes, declaredIn: collected.declaredIn, order, root, force: options.force, slots,
      signal: deps.signal ?? interruptOn(), commandFor: deps.commandFor, print,
    });
  } catch (err) {
    error(`${(err as Error).message}\n`);
    return 1;
  }

  print(`\n${'-'.repeat(60)}\n`);
  print(`${summarize(run.results, run.interrupted ? { notStarted: run.notStarted } : undefined)}\n`);
  const problems = [
    ...(options.assertFull && !run.interrupted ? partialRunProblems(run.results) : []),
    ...(options.force && !run.interrupted ? keptButFailed(run.results, run.wouldKeep) : []),
  ];
  for (const problem of problems) error(`\nrun-build: ${problem}\n`);
  return exitCode(run.results, problems, run.interrupted);
}

if (isMainModule(import.meta.url)) process.exit(await main());
