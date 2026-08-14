/* Runs the selected gates and the test suite: one failure never stops the rest, which check:graph
 * keeps true by refusing a gate that writes, since only an artifact could make one gate stop
 * another. With no argument the selection is every domain, which is what `bun run check` gets. A
 * gate whose runtime dependency is missing exits 2 and is reported SKIP, making the run INCOMPLETE.
 * testStep() below is the single authority for how the test suite is invoked, and why it is two bun
 * processes: --preload installs happy-dom PROCESS-wide, and a DOM installed for a whole invocation
 * also replaces Bun's own fetch, which turns lib/arena/static-server.test.ts's fetch assertion into
 * a cross-origin failure, so scripts/ rides the DOM-free invocation. The Angular emit is safe in
 * either: its TestBed registration site is guarded rather than throwing on a second call.
 * Read the args here, never reconstruct them. */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { DOMAINS, isSuite } from '../../lib/arena/domains.ts';
import { gateDecisions, shortFingerprint } from '../../graph/gate-plan.ts';

const here = dirname(fileURLToPath(import.meta.url));
const checkRoot = join(here, '..');

export { DOMAINS };

export const GATES = [
  { name: 'check:docs', file: 'arena/check-docs.ts' },
  { name: 'check:graph', file: 'arena/check-graph.ts' },
  { name: 'check:portability', file: 'arena/check-portability.ts' },
  { name: 'check:generated', file: 'arena/check-generated.ts' },
  { name: 'check:skills', file: 'arena/check-skills.ts' },
  { name: 'check:prompts', file: 'arena/check-prompts.ts' },
  { name: 'check:routes', file: 'arena/check-routes.ts' },
  { name: 'check:vocabulary', file: 'arena/check-vocabulary.ts' },
  { name: 'check:duplication', file: 'arena/check-duplication.ts' },
  { name: 'check:dtcg', file: 'core/check-dtcg.ts' },
  { name: 'check:extensions', file: 'core/check-extensions.ts' },
  { name: 'check:tokens', file: 'core/check-tokens-generated.ts' },
  { name: 'check:script-tokens', file: 'arena/check-script-tokens.ts' },
  { name: 'check:duplicate-constants', file: 'arena/check-duplicate-constants.ts' },
  { name: 'check:deadlines', file: 'arena/check-deadlines.ts' },
  { name: 'check:ramp', file: 'core/check-ramp.ts' },
  { name: 'check:boundary-contrast', file: 'core/check-boundary-contrast.ts' },
  { name: 'check:text-contrast', file: 'core/check-text-contrast.ts' },
  { name: 'check:tailwind', file: 'tailwind/check-tailwind.ts' },
  { name: 'check:tailwind-generated', file: 'tailwind/check-tailwind-generated.ts' },
  { name: 'check:coverage', file: 'tailwind/check-tailwind-coverage.ts' },
  { name: 'check:surface-parity', file: 'tailwind/check-surface-parity.ts' },
  { name: 'check:radius', file: 'tailwind/check-radius-tokens.ts' },
  { name: 'check:roles', file: 'tailwind/check-role-tokens.ts' },
  { name: 'check:arbitrary', file: 'tailwind/check-arbitrary-values.ts' },
  { name: 'check:component-css', file: 'tailwind/check-component-css.ts' },
  { name: 'check:dimensions', file: 'arena/check-dimension-literals.ts' },
  { name: 'check:states', file: 'arena/check-manifest-states.ts' },
  { name: 'check:appearance', file: 'arena/check-appearance.ts' },
  { name: 'check:layer-independence', file: 'arena/check-layer-independence.ts' },
  { name: 'check:structure', file: 'arena/check-structure.ts' },
  { name: 'check:contracts', file: 'arena/check-contracts.ts' },
  { name: 'check:behaviour', file: 'arena/check-behaviour.ts' },
  { name: 'check:compliance', file: 'arena/check-compliance.ts' },
  { name: 'check:api', file: 'arena/check-api.ts' },
  { name: 'check:playgrounds', file: 'arena/check-playgrounds.ts' },
  { name: 'check:kitchen-sink', file: 'arena/check-kitchen-sink.ts' },
  { name: 'check:citations', file: 'arena/check-citations.ts' },
  { name: 'check:agents', file: 'arena/check-agents.ts' },
  { name: 'check:community', file: 'arena/check-community.ts' },
  { name: 'check:icons', file: 'arena/check-icons.ts' },
  { name: 'check:fonts', file: 'core/check-fonts-generated.ts' },
  { name: 'check:intro', file: 'arena/check-intro-generated.ts' },
  { name: 'check:vendor', file: 'react/check-vendor-generated.ts' },
  { name: 'check:demos', file: 'react/check-demos-generated.ts' },
  { name: 'check:react-barrel', file: 'react/check-react-barrel.ts' },
  { name: 'check:react-types', file: 'react/check-react-types.ts' },
  { name: 'check:script-types', file: 'arena/check-script-types.ts' },
  { name: 'check:script-reach', file: 'arena/check-script-reach.ts' },
  { name: 'check:focus-trap', file: 'arena/check-focus-trap.ts' },
  { name: 'check:pixel-parity', file: 'arena/check-pixel-parity.ts' },
  { name: 'check:shared-arithmetic', file: 'arena/check-shared-arithmetic.ts' },
  { name: 'check:packages', file: 'arena/check-packages.ts' },
  { name: 'check:consumer', file: 'arena/check-consumer.ts' },
  { name: 'check:angular', file: 'angular/check-angular.ts' },
  { name: 'check:angular-demos', file: 'angular/check-angular-demos.ts' },
  { name: 'check:assertions', file: 'angular/check-assertions.ts' },
  { name: 'check:cdk', file: 'angular/check-cdk.ts' },
  { name: 'check:boolean-inputs', file: 'angular/check-boolean-inputs.ts' },
  { name: 'check:optional-inputs', file: 'angular/check-optional-inputs.ts' },
];

export function gatesFor(domains: string[]) {
  const unknown = domains.filter((d) => !DOMAINS.includes(d));
  if (unknown.length > 0) {
    throw new Error(`check-all: no domain called ${unknown.join(', ')}; the five are ${DOMAINS.join(', ')}`);
  }
  const selected = GATES.filter((g) => domains.includes(g.file.split('/')[0] ?? ''));
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
  for (const arg of argv) {
    if (arg === '--no-tests') { tests = false; continue; }
    if (arg === '--force') { force = true; continue; }
    if (arg === '--release') { force = true; release = true; continue; }
    if (arg.startsWith('--domain=')) {
      domains = arg.slice('--domain='.length).split(',').map((d) => d.trim()).filter(Boolean);
      continue;
    }
    throw new Error(`check-all: unrecognised argument "${arg}"; it takes --domain=<a,b>, --no-tests, --force and --release`);
  }
  return { domains, tests, force, release };
}

export const ANGULAR_EMIT = { name: 'build (ngc emit of the Angular test surface)', args: ['run', 'build:angular-tests'] };

export const SUITES: Record<string, { emit: boolean; args: string[] }> = {
  scripts: { emit: false, args: ['test', 'scripts'] },
  react: { emit: false, args: ['test', 'frameworks/react', '--path-ignore-patterns=**/*.dom.test.*'] },
  'react-dom': { emit: false, args: ['test', '--preload', './frameworks/react/test/Preload.js', '.dom.test.'] },
  angular: { emit: true, args: ['test', 'frameworks/angular/build/test'] },
  every: {
    emit: true,
    args: ['test', 'scripts', 'frameworks/react', 'frameworks/angular/build/test',
           '--path-ignore-patterns=**/*.dom.test.*'],
  },
};

export function testStep({ isBun, testFiles }: { isBun: boolean; testFiles: string[] }) {
  if (isBun) return [
    ANGULAR_EMIT,
    { name: 'test (bun test scripts/ + framework suites)', args: SUITES.every?.args ?? [] },
    { name: 'test (React DOM suites, isolated)', args: SUITES['react-dom']?.args ?? [] },
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

export function stepStatus(code: number | null) {
  if (code === 0) return 'pass';
  if (code === 2) return 'skip';
  return 'fail';
}

export function summarize(results: { name: string; status: string; note?: string }[]) {
  const label: Record<string, string> = { pass: 'PASS', fail: 'FAIL', skip: 'SKIP', cached: 'CACHED' };
  const lines = results.map((r) => `  ${label[r.status]}  ${r.name}${r.note ? `  (${r.note})` : ''}`);
  const failed = results.filter((r) => r.status === 'fail');
  const skipped = results.filter((r) => r.status === 'skip');
  const cached = results.filter((r) => r.status === 'cached');
  const kept = `, ${results.length - cached.length} ran, ${cached.length} came from the cache`;

  let tail;
  if (failed.length) tail = `check-all: ${failed.length}/${results.length} step(s) failed${kept}`;
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

function runStep(name: string, args: string[]) {
  console.log(`\n> ${name}\n`);
  const r = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: repoRoot });
  if (r.error) console.error(`  failed to spawn: ${r.error.message || r.error}`);
  return { name, status: r.error ? 'fail' : stepStatus(r.status) };
}

export function testFilesUnder(dir: string): string[] {
  return walkFiles(dir).filter((full) => isSuite(basename(full)));
}

async function main() {
  let selection;
  try {
    selection = parseCheckArgs(process.argv.slice(2));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  let gates;
  try {
    gates = gatesFor(selection.domains);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  const graph = await gateDecisions(gates.map((g) => g.name), selection.force);
  const wouldKeep = new Set<string>();
  if (selection.release) {
    const measured = await gateDecisions(gates.map((g) => g.name), false);
    for (const [name, decided] of measured.decisions) if (!decided.run) wouldKeep.add(name);
  }

  const results = [];
  for (const { name, file } of gates) {
    const decided = graph.decisions.get(name);
    if (decided && !decided.run) {
      results.push({ name, status: 'cached', note: `${shortFingerprint(decided.fingerprint)}, unchanged since the previous run` });
      continue;
    }
    if (decided?.reason) console.log(`\ncheck-all: ${name} runs, because ${decided.reason}`);
    const result = runStep(name, [join(checkRoot, file)]);
    results.push(result);
    graph.record(name, result.status === 'pass');
  }
  graph.flush();

  const wrongKeeps = keptButFailed(results, wouldKeep);

  if (selection.tests) {
    const isBun = Boolean(process.versions.bun);
    const testFiles = testFilesUnder(join(repoRoot, 'scripts')).sort();
    for (const { name, args } of testStep({ isBun, testFiles })) results.push(runStep(name, args));
  }

  console.log(`\n${'-'.repeat(60)}`);
  console.log(summarize(results));

  for (const problem of wrongKeeps) console.error(`\ncheck-all: ${problem}`);

  process.exit(results.some((r) => r.status === 'fail') || wrongKeeps.length > 0 ? 1 : 0);
}

if (isMainModule(import.meta.url)) await main();
