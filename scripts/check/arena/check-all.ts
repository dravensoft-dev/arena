/* Runs the selected gates and the test suites on the scheduler: one failure never stops the
 * rest, which check:graph keeps true by refusing a gate that writes, because only an artifact
 * could make one gate stop another. With no argument the selection is every domain, which is
 * what `bun run check` gets. A gate whose runtime dependency is missing exits 2 and is reported
 * SKIP, making the run INCOMPLETE. Each step prints as one block when it ends, and the summary
 * lists the steps in the order planned with what each took, so --jobs=1 is the serial run.
 * testStep() is the single authority for how the suites are invoked: --preload installs
 * happy-dom PROCESS-wide and replaces Bun's own fetch, which turns static-server.test.ts's fetch
 * assertion into a cross-origin failure, so scripts/ rides a DOM-free invocation. Read the args
 * here, never reconstruct them. */

import { availableParallelism, freemem } from 'node:os';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { DOMAINS, isSuite } from '../../lib/arena/domains.ts';
import { purge } from '../../lib/arena/artifact-cache.ts';
import { gateDecisions, shortFingerprint } from '../../graph/gate-plan.ts';
import { childOutputAsync, type StepOutput } from '../../lib/arena/child-output.ts';
import {
  describeSlots, interruptOn, parseJobs, schedule, scheduleProblems, slotsFor,
  type Finished, type Outcome, type Pool, type Slots, type Step,
} from '../../graph/scheduler.ts';
import { stepBlock } from '../../graph/step-block.ts';

const here = dirname(fileURLToPath(import.meta.url));
const checkRoot = join(here, '..');

export { DOMAINS };

export type Gate = { name: string; file: string; pool?: Pool | undefined; cost?: number | undefined };
export type TestStep = { name: string; args: string[]; pool?: Pool | undefined; cost?: number | undefined; after?: string[] | undefined };
export type Result = { name: string; status: 'pass' | 'fail' | 'skip' | 'cached'; note?: string | undefined; ms?: number | undefined };
export type Planned = { name: string; command: string; args: string[]; pool?: Pool | undefined; cost?: number | undefined; after?: string[] | undefined; reason?: string | null | undefined };

export const GATES: Gate[] = [
  { name: 'check:docs', file: 'arena/check-docs.ts' },
  { name: 'check:graph', file: 'arena/check-graph.ts' },
  { name: 'check:portability', file: 'arena/check-portability.ts' },
  { name: 'check:workflow-scripts', file: 'arena/check-workflow-scripts.ts' },
  { name: 'check:generated', file: 'arena/check-generated.ts' },
  { name: 'check:skill-spec', file: 'arena/check-skill-spec.ts' },
  { name: 'check:skills', file: 'arena/check-skills.ts' },
  { name: 'check:support', file: 'arena/check-support.ts' },
  { name: 'check:prompts', file: 'arena/check-prompts.ts' },
  { name: 'check:rules', file: 'arena/check-rules.ts' },
  { name: 'check:register', file: 'arena/check-register.ts' },
  { name: 'check:routes', file: 'arena/check-routes.ts' },
  { name: 'check:vocabulary', file: 'arena/check-vocabulary.ts' },
  { name: 'check:families', file: 'arena/check-families.ts' },
  { name: 'check:architecture', file: 'arena/check-architecture.ts' },
  { name: 'check:duplication', file: 'arena/check-duplication.ts' },
  { name: 'check:dtcg', file: 'core/check-dtcg.ts' },
  { name: 'check:user-scale', file: 'core/check-user-scale.ts' },
  { name: 'check:catalogue', file: 'core/check-catalogue.ts' },
  { name: 'check:style-plugin', file: 'core/check-style-plugin.ts' },
  { name: 'check:style-plugin-coverage', file: 'core/check-style-plugin-coverage.ts' },
  { name: 'check:role-contract', file: 'core/check-role-contract.ts' },
  { name: 'check:compat-aliases', file: 'core/check-compat-aliases.ts' },
  { name: 'check:polarity', file: 'core/check-polarity.ts' },
  { name: 'check:tokens', file: 'core/check-tokens-generated.ts' },
  { name: 'check:token-collisions', file: 'core/check-token-collisions.ts' },
  { name: 'check:script-tokens', file: 'arena/check-script-tokens.ts' },
  { name: 'check:duplicate-constants', file: 'arena/check-duplicate-constants.ts' },
  { name: 'check:deadlines', file: 'arena/check-deadlines.ts' },
  { name: 'check:ramp', file: 'core/check-ramp.ts' },
  { name: 'check:boundary-contrast', file: 'core/check-boundary-contrast.ts' },
  { name: 'check:text-contrast', file: 'core/check-text-contrast.ts' },
  { name: 'check:tailwind', file: 'tailwind/check-tailwind.ts' },
  { name: 'check:tailwind-generated', file: 'tailwind/check-tailwind-generated.ts' },
  { name: 'check:coverage', file: 'tailwind/check-tailwind-coverage.ts' },
  { name: 'check:radius', file: 'tailwind/check-radius-tokens.ts' },
  { name: 'check:roles', file: 'tailwind/check-role-tokens.ts' },
  { name: 'check:arbitrary', file: 'tailwind/check-arbitrary-values.ts' },
  { name: 'check:safe-area', file: 'tailwind/check-safe-area.ts' },
  { name: 'check:component-css', file: 'tailwind/check-component-css.ts' },
  { name: 'check:channels', file: 'tailwind/check-channels.ts' },
  { name: 'check:dimensions', file: 'arena/check-dimension-literals.ts' },
  { name: 'check:states', file: 'arena/check-manifest-states.ts' },
  { name: 'check:measured-box', file: 'arena/check-measured-box.ts' },
  { name: 'check:intrinsic-width', file: 'arena/check-intrinsic-width.ts' },
  { name: 'check:appearance', file: 'arena/check-appearance.ts' },
  { name: 'check:parts', file: 'arena/check-parts.ts' },
  { name: 'check:boundaries', file: 'arena/check-boundaries.ts' },
  { name: 'check:layer-independence', file: 'arena/check-layer-independence.ts' },
  { name: 'check:structure', file: 'arena/check-structure.ts' },
  { name: 'check:contracts', file: 'arena/check-contracts.ts' },
  { name: 'check:contracts-package', file: 'arena/check-contracts-package.ts' },
  { name: 'check:mcp', file: 'arena/check-mcp.ts' },
  { name: 'check:contracts-neutrality', file: 'arena/check-contracts-neutrality.ts' },
  { name: 'check:contracts-resolve', file: 'arena/check-contracts-resolve.ts' },
  { name: 'check:behaviour', file: 'arena/check-behaviour.ts' },
  { name: 'check:compliance', file: 'arena/check-compliance.ts' },
  { name: 'check:api', file: 'arena/check-api.ts' },
  { name: 'check:playgrounds', file: 'arena/check-playgrounds.ts' },
  { name: 'check:kitchen-sink', file: 'arena/check-kitchen-sink.ts' },
  { name: 'check:citations', file: 'arena/check-citations.ts' },
  { name: 'check:agents', file: 'arena/check-agents.ts' },
  { name: 'check:agents-spec', file: 'arena/check-agents-spec.ts' },
  { name: 'check:community', file: 'arena/check-community.ts' },
  { name: 'check:site', file: 'arena/check-site.ts' },
  { name: 'check:icons', file: 'arena/check-icons.ts' },
  { name: 'check:fonts', file: 'core/check-fonts-generated.ts' },
  { name: 'check:intro', file: 'arena/check-intro-generated.ts' },
  { name: 'check:vendor', file: 'react/check-vendor-generated.ts' },
  { name: 'check:demos', file: 'react/check-demos-generated.ts' },
  { name: 'check:react-barrel', file: 'react/check-react-barrel.ts' },
  { name: 'check:react-types', file: 'react/check-react-types.ts', pool: 'compiler', cost: 12.7 },
  { name: 'check:text-runs', file: 'react/check-text-runs.ts' },
  { name: 'check:script-types', file: 'arena/check-script-types.ts', pool: 'compiler', cost: 13.5 },
  { name: 'check:script-reach', file: 'arena/check-script-reach.ts' },
  { name: 'check:focus-trap', file: 'arena/check-focus-trap.ts', pool: 'browser', cost: 4.1 },
  { name: 'check:target-size', file: 'arena/check-target-size.ts', pool: 'browser', cost: 11.9 },
  { name: 'check:pixel-parity', file: 'arena/check-pixel-parity.ts', pool: 'browser', cost: 34 },
  { name: 'check:proximity', file: 'arena/check-proximity.ts', pool: 'browser', cost: 10.2 },
  { name: 'check:shared-arithmetic', file: 'arena/check-shared-arithmetic.ts' },
  { name: 'check:packages', file: 'arena/check-packages.ts' },
  { name: 'check:consumer', file: 'arena/check-consumer.ts' },
  { name: 'check:exports', file: 'arena/check-exports.ts' },
  { name: 'check:classes', file: 'arena/check-classes.ts' },
  { name: 'check:angular', file: 'angular/check-angular.ts', pool: 'compiler', cost: 19.3 },
  { name: 'check:angular-demos', file: 'angular/check-angular-demos.ts' },
  { name: 'check:assertions', file: 'angular/check-assertions.ts' },
  { name: 'check:cdk', file: 'angular/check-cdk.ts' },
  { name: 'check:boolean-inputs', file: 'angular/check-boolean-inputs.ts' },
  { name: 'check:optional-inputs', file: 'angular/check-optional-inputs.ts' },
];

export function gatesFor(domains: string[], list: Gate[] = GATES) {
  const unknown = domains.filter((d) => !DOMAINS.includes(d));
  if (unknown.length > 0) {
    throw new Error(`check-all: no domain called ${unknown.join(', ')}; the five are ${DOMAINS.join(', ')}`);
  }
  const selected = list.filter((g) => domains.includes(g.file.split('/')[0] ?? ''));
  if (selected.length === 0) {
    throw new Error(`check-all: ${domains.join(', ')} selected no gate, and a run of nothing reports nothing wrong with everything`);
  }
  return selected;
}

export function parseCheckArgs(argv: string[]) {
  let domains = DOMAINS;
  let tests = true;
  let force = false;
  let release = false;
  let jobs: number | null = null;
  for (const arg of argv) {
    if (arg === '--no-tests') { tests = false; continue; }
    if (arg === '--force') { force = true; continue; }
    if (arg === '--release') { force = true; release = true; continue; }
    if (arg.startsWith('--domain=')) {
      domains = arg.slice('--domain='.length).split(',').map((d) => d.trim()).filter(Boolean);
      continue;
    }
    if (arg.startsWith('--jobs=')) {
      if (jobs !== null) {
        throw new Error('check-all: --jobs is given twice, and which one counts would be a guess; give it once');
      }
      jobs = parseJobs(arg.slice('--jobs='.length), 'check-all');
      continue;
    }
    throw new Error(`check-all: unrecognised argument "${arg}"; it takes --domain=<a,b>, --no-tests, --force, --release and --jobs=<n>`);
  }
  return { domains, tests, force, release, jobs };
}

export const ANGULAR_EMIT: TestStep = { name: 'build (ngc emit of the Angular test surface)', args: ['run', 'build:angular-tests'], pool: 'compiler', cost: 18.8 };

export const SUITES: Record<string, { emit: boolean; args: string[] }> = {
  scripts: { emit: false, args: ['test', 'scripts'] },
  react: { emit: false, args: ['test', 'frameworks/react', '--path-ignore-patterns=**/*.dom.test.*'] },
  'react-dom': { emit: false, args: ['test', '--preload', './frameworks/react/test/Preload.js', '.dom.test.'] },
  angular: { emit: true, args: ['test', 'frameworks/angular/build/test'] },
};

const suiteArgs = (name: string) => {
  const suite = SUITES[name];
  if (!suite) throw new Error(`check-all: SUITES holds no suite called "${name}"`);
  return suite.args;
};

export function testStep({ isBun, testFiles }: { isBun: boolean; testFiles: string[] }): TestStep[] {
  if (isBun) return [
    ANGULAR_EMIT,
    { name: 'test (scripts)', args: suiteArgs('scripts'), pool: 'compiler', cost: 38.1 },
    { name: 'test (react)', args: suiteArgs('react'), pool: 'compiler', cost: 0.7 },
    { name: 'test (react-dom)', args: suiteArgs('react-dom'), pool: 'compiler', cost: 6.9 },
    { name: 'test (angular)', args: suiteArgs('angular'), pool: 'compiler', cost: 5.4, after: [ANGULAR_EMIT.name] },
  ];
  return [{ name: `test (node --test over every suite under scripts/, ${testFiles.length} found)`,
            args: ['--test', ...testFiles] }];
}

export function suiteSteps(name: string) {
  if (name === 'all') return testStep({ isBun: true, testFiles: [] });
  const suite = SUITES[name];
  if (!suite) {
    throw new Error(`run-suite: no suite called "${name}"; it takes all, ${Object.keys(SUITES).join(', ')}`);
  }
  return [...(suite.emit ? [ANGULAR_EMIT] : []), { name: `test (${name})`, args: suite.args }];
}

export function stepStatus(code: number | null): Outcome['status'] {
  if (code === 0) return 'pass';
  if (code === 2) return 'skip';
  return 'fail';
}

const LABEL: Record<string, string> = { pass: 'PASS', fail: 'FAIL', skip: 'SKIP', cached: 'CACHED' };

export function summaryLine(r: Result) {
  const label = LABEL[r.status];
  if (!label) {
    throw new Error(`check-all: ${r.name} reports "${r.status}", which is none of ${Object.keys(LABEL).join(', ')}`);
  }
  let took = '';
  if (r.status !== 'cached') {
    if (typeof r.ms !== 'number' || !Number.isFinite(r.ms) || r.ms < 0) {
      throw new Error(`check-all: ${r.name} ran and carries no duration, and a summary that prints none `
        + 'reads as a step that took no time');
    }
    took = `  ${(r.ms / 1000).toFixed(1)} s`;
  }
  return `  ${label}  ${r.name}${took}${r.note ? `  (${r.note})` : ''}`;
}

export function summarize(results: Result[], interrupted?: { notStarted: string[] }) {
  if (results.length === 0) {
    throw new Error('check-all: no step to summarize, and a summary over nothing reads as all passed');
  }
  const lines = results.map(summaryLine);
  const failed = results.filter((r) => r.status === 'fail');
  const skipped = results.filter((r) => r.status === 'skip');
  const cached = results.filter((r) => r.status === 'cached');
  const kept = `, ${results.length - cached.length} ran, ${cached.length} came from the cache`;

  let tail;
  if (interrupted) {
    tail = `check-all: INTERRUPTED, ${results.length - cached.length} step(s) ran, ${cached.length} came from the `
      + `cache, ${interrupted.notStarted.length} never started${interrupted.notStarted.length ? `: ${interrupted.notStarted.join(', ')}` : ''}`;
  } else if (failed.length) tail = `check-all: ${failed.length}/${results.length} step(s) failed${kept}`;
  else if (skipped.length) tail = `check-all: INCOMPLETE — ${results.length - skipped.length}/${results.length} step(s) passed${kept}, ${skipped.length} could not run here (see above)`;
  else tail = `check-all: all ${results.length} step(s) passed${kept}`;

  return [...lines, '', tail].join('\n');
}

export function keptButFailed(results: { name: string; status: string }[], wouldKeep: Set<string>) {
  return results
    .filter((r) => r.status === 'fail' && wouldKeep.has(r.name))
    .map((r) => `${r.name} failed and the graph would have kept it -- that is a defect in the `
      + 'declared graph, not only in the gate: something it reads is not something it says it reads');
}

export function planSteps(
  gates: Gate[],
  decisions: Map<string, { run: boolean; reason: string | null; fingerprint: string }>,
  tests: TestStep[],
  command = process.execPath,
) {
  const kept: Result[] = [];
  const planned: Planned[] = [];
  for (const { name, file, pool, cost } of gates) {
    const decided = decisions.get(name);
    if (decided && !decided.run) {
      kept.push({ name, status: 'cached', note: `${shortFingerprint(decided.fingerprint)}, unchanged from the previous run` });
      continue;
    }
    planned.push({ name, command, args: [join(checkRoot, file)], pool, cost, reason: decided?.reason ?? null });
  }
  for (const step of tests) {
    planned.push({ name: step.name, command, args: step.args, pool: step.pool, cost: step.cost, after: step.after });
  }
  return { kept, planned };
}

export function stepOutcome(r: StepOutput): Outcome {
  if (r.error) return { status: 'fail', note: `failed to spawn: ${r.error.message}` };
  if (r.signal) {
    return { status: 'fail', note: r.ignored ? `ignored ${r.ignored}, killed by ${r.signal}` : `killed by ${r.signal}` };
  }
  if (r.code === null) return { status: 'fail', note: 'ended with neither an exit code nor a signal' };
  const status = stepStatus(r.code);
  if (status === 'fail' && r.code !== 1) return { status, note: `exited ${r.code}` };
  return { status };
}

export function poolProblems(gates: Gate[], tests: TestStep[], slots: Slots) {
  const steps: Step[] = [...gates, ...tests].map((one) => ({
    name: one.name,
    pool: one.pool,
    cost: one.cost,
    after: 'after' in one ? one.after : undefined,
    run: async () => ({ status: 'pass' as const }),
  }));
  return scheduleProblems(steps, slots);
}

export function slotsLine(jobs: number | null, cores: number, free: number) {
  return `check-all: ${describeSlots(jobs, cores, free)}`;
}

export function block(step: { name: string; reason?: string | null | undefined }, output: string, outcome: Outcome) {
  return stepBlock('check-all', step, output, outcome);
}

export async function runSteps(
  planned: Planned[],
  slots: Slots,
  options: { signal?: AbortSignal; print?: (text: string) => void; finished?: (one: Finished) => void; cwd?: string } = {},
) {
  const print = options.print ?? ((text: string) => { process.stdout.write(text); });
  const steps: Step[] = planned.map((one) => ({
    name: one.name,
    pool: one.pool,
    cost: one.cost,
    after: one.after,
    run: async () => {
      const ended = await childOutputAsync(one.command, one.args, { cwd: options.cwd ?? repoRoot, signal: options.signal });
      const outcome = stepOutcome(ended);
      print(block(one, ended.output, outcome));
      return outcome;
    },
  }));
  return schedule(steps, slots, { signal: options.signal, finished: options.finished });
}

export function collate(order: string[], results: Result[], notStarted: string[] = []) {
  const at = new Map(order.map((name, index) => [name, index]));
  const stray = results.filter((r) => !at.has(r.name)).map((r) => r.name);
  if (stray.length > 0) throw new Error(`check-all: ${stray.join(', ')} finished without being planned`);
  const seen = new Set<string>();
  const twice: string[] = [];
  for (const r of results) {
    if (seen.has(r.name)) twice.push(r.name);
    seen.add(r.name);
  }
  if (twice.length > 0) throw new Error(`check-all: ${twice.join(', ')} is reported twice, and a step runs exactly once`);
  const missing = order.filter((name) => !seen.has(name) && !notStarted.includes(name));
  if (missing.length > 0) {
    throw new Error(`check-all: ${missing.join(', ')} is planned and neither finished nor listed as not started`);
  }
  return [...results].sort((a, b) => (at.get(a.name) ?? 0) - (at.get(b.name) ?? 0));
}

export function exitCode(results: Result[], wrongKeeps: string[], interrupted: boolean) {
  if (interrupted) return 130;
  return results.some((r) => r.status === 'fail') || wrongKeeps.length > 0 ? 1 : 0;
}

export function testFilesUnder(dir: string): string[] {
  return walkFiles(dir).filter((full) => isSuite(basename(full)));
}

export async function main(argv: string[] = process.argv.slice(2), list: Gate[] = GATES, root = repoRoot) {
  let selection;
  try {
    selection = parseCheckArgs(argv);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  let gates;
  try {
    gates = gatesFor(selection.domains, list);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  const tests = selection.tests
    ? testStep({ isBun: Boolean(process.versions.bun), testFiles: testFilesUnder(join(root, 'scripts')).sort() })
    : [];
  const cores = availableParallelism();
  const free = freemem();
  const slots = slotsFor(selection.jobs, cores, free);
  const refused = poolProblems(gates, tests, slots);
  if (refused.length > 0) {
    console.error(`check-all: the run cannot be scheduled: ${refused.join('; ')}`);
    process.exit(1);
  }

  if (selection.force) {
    const dropped = purge(root);
    console.log(`check-all: --force dropped ${dropped} artifact(s), so every derived answer is recomputed here`);
  }

  const graph = await gateDecisions(gates.map((g) => g.name), selection.force, root);
  const wouldKeep = new Set<string>();
  if (selection.release) {
    const measured = await gateDecisions(gates.map((g) => g.name), false, root);
    for (const [name, decided] of measured.decisions) if (!decided.run) wouldKeep.add(name);
  }

  const { kept, planned } = planSteps(gates, graph.decisions, tests);
  console.log(slotsLine(selection.jobs, cores, free));
  const signal = interruptOn();
  const gateNames = new Set(gates.map((g) => g.name));
  const { finished, notStarted } = await runSteps(planned, slots, {
    signal,
    cwd: root,
    finished: (one) => { if (gateNames.has(one.name)) graph.record(one.name, one.status === 'pass'); },
  });
  graph.flush();

  const results = collate([...gates.map((g) => g.name), ...tests.map((t) => t.name)], [...kept, ...finished], notStarted);
  const wrongKeeps = keptButFailed(results, wouldKeep);

  console.log(`\n${'-'.repeat(60)}`);
  console.log(summarize(results, signal.aborted ? { notStarted } : undefined));
  for (const problem of wrongKeeps) console.error(`\ncheck-all: ${problem}`);
  process.exit(exitCode(results, wrongKeeps, signal.aborted));
}

if (isMainModule(import.meta.url)) await main();
