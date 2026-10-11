/* Runs the build in the order the graph derives, so the sequence follows what each step declares
 * rather than prose in package.json that nothing tests. It runs the steps under build/ and
 * generate/ and never a gate: the phase that declared a node says whether a build runs it. A
 * failure stops what READS what that step writes, transitively, and nothing else: a step compiled
 * against a failed upstream reports a second error over the real one. --target=<step> selects
 * instead that step and every step it reads from, release-only ones included, which lets a
 * publish build its own package and no other. The fingerprint RECORDED is measured after the
 * step, because two generators write into what they read. --assert-full fails a run that kept
 * anything, which stops a workflow proving the build idempotent over one that did nothing. */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../utils/main-module.ts';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { byName, needsOf, topoOrder, transitiveFeeds, upstreamOf } from './graph.ts';
import type { GraphNode } from './graph.ts';
import { BUILT_BY, allNodes, isBuildStep } from './nodes.ts';
import { stampAll, universe } from './inputs.ts';
import { fingerprintOne } from './fingerprint.ts';
import { forget, readFiles, readState, recordGreen, writeFiles, writeState } from './state.ts';
import { decide, shortFingerprint } from './plan.ts';

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
    throw new Error(`run-build: unrecognised argument "${arg}"; it takes --force, --assert-full, --assemble and --target=<step>`);
  }
  return { force, assertFull, assemble, targets };
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

export function summarize(results: { name: string; status: string }[], ran: number, cached: number) {
  const failed = results.filter((r) => r.status === 'fail');
  const label: Record<string, string> = { fail: 'FAIL', cached: 'CACHED', blocked: 'BLOCKED', pass: 'PASS' };
  const lines = results.map((r) => `  ${label[r.status] ?? '????'}  ${r.name}`);
  const blocked = results.filter((r) => r.status === 'blocked');
  const tail = failed.length
    ? `run-build: ${failed.length}/${results.length} step(s) failed`
    : `run-build: all ${results.length} step(s) passed`;
  const held = blocked.length ? `, ${blocked.length} did not run because an upstream failed` : '';
  return [...lines, '', `${tail}, ${ran} ran, ${cached} came from the cache${held}`].join('\n');
}

function runStep(name: string) {
  console.log(`\n> ${name}\n`);
  const r = spawnSync(process.execPath, ['run', name], { stdio: 'inherit', cwd: repoRoot });
  if (r.error) console.error(`  failed to spawn: ${r.error.message || r.error}`);
  return r.error || r.status !== 0 ? 'fail' : 'pass';
}

async function main() {
  let options;
  try {
    options = parseBuildArgs(process.argv.slice(2));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  const collected = await allNodes(repoRoot);
  let order;
  try {
    order = selectSteps(collected.nodes, collected.declaredIn, options);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
  if (options.targets.length > 0) {
    console.log(`run-build: ${order.length} step(s), the upstream closure of ${options.targets.join(', ')}`);
  }
  const needs = needsOf(collected.nodes);
  const state = readState(repoRoot);
  const upstream = new Map<string, string>();
  const onDisk = (path: string) => existsSync(join(repoRoot, path));

  let paths = universe(repoRoot);
  let stamps = stampAll(repoRoot, paths, readFiles(repoRoot));
  const measure = () => ({ declaredIn: collected.declaredIn, root: repoRoot, paths, stamps, needs, upstream });
  const refresh = () => {
    paths = universe(repoRoot);
    stamps = stampAll(repoRoot, paths, stamps);
  };

  const results = [];
  const wouldKeep = new Set<string>();
  const blocked = new Map<string, string>();
  let ran = 0;
  let cached = 0;

  for (const node of order) {
    const failedAbove = blocked.get(node.name);
    if (failedAbove) {
      console.log(`\nrun-build: ${node.name} does not run, because ${failedAbove} failed and it reads `
        + 'what that writes; a step compiled against an upstream that failed reports a second error '
        + 'over the real one');
      results.push({ name: node.name, status: 'blocked' });
      forget(state, node.name);
      writeState(state, repoRoot);
      continue;
    }

    const before = fingerprintOne(node, measure());
    const measured = decide(node, before, state.get(node.name), onDisk);
    if (!measured.run) wouldKeep.add(node.name);
    const step = options.force ? { run: true, reason: 'this is a full run' } : measured;

    if (!step.run) {
      console.log(`\nrun-build: ${node.name} comes from the cache (${shortFingerprint(before.fingerprint)})`);
      cached += 1;
      results.push({ name: node.name, status: 'cached' });
      upstream.set(node.name, state.get(node.name)?.fingerprint ?? before.fingerprint);
      continue;
    }

    console.log(`\nrun-build: ${node.name} runs, because ${step.reason}`);
    ran += 1;

    const status = runStep(node.name);
    results.push({ name: node.name, status });

    if (status === 'fail') {
      forget(state, node.name);
      for (const fed of transitiveFeeds(collected.nodes, node.name)) blocked.set(fed, node.name);
      writeState(state, repoRoot);
      continue;
    }

    refresh();
    const after = fingerprintOne(node, measure());
    upstream.set(node.name, after.fingerprint);
    recordGreen(state, node.name, after, new Date().toISOString());
    writeState(state, repoRoot);
  }

  writeFiles(stamps, repoRoot);

  console.log(`\n${'-'.repeat(60)}`);
  console.log(summarize(results, ran, cached));

  const partial = options.assertFull ? partialRunProblems(results) : [];
  const wrongKeeps = options.force ? keptButFailed(results, wouldKeep) : [];
  for (const problem of [...partial, ...wrongKeeps]) console.error(`\nrun-build: ${problem}`);

  process.exit(results.some((r) => r.status === 'fail') || partial.length + wrongKeeps.length > 0 ? 1 : 0);
}

if (isMainModule(import.meta.url)) await main();
