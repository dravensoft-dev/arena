import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { toPosix, relPosix } from '../../utils/posix-path.ts';
import { readJson } from '../../utils/read-file.ts';
import { angularEmitRoot } from '../../lib/angular/emit-root.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { platform } from '../../lib/arena/platform.ts';
import { childOutputAsync, TERM_GRACE } from '../../lib/arena/child-output.ts';
import { deadline, budgetFor, type Deadline } from '../../lib/arena/deadline.ts';
import { waitFor } from '../../lib/arena/wait-for.ts';
import { COLLECTION, allNodes, neverSubscribesReason } from '../../graph/nodes.ts';
import { ABORT_GRACE, BROWSER_CAP, GIB } from '../../graph/scheduler.ts';
import { resolveSpecs } from '../../graph/pathspecs.ts';
import { LAYERS } from '../../lib/arena/layers.ts';
import { workflowTexts } from '../../graph/handoff.ts';
import { VERIFY_WORKFLOW, callerSelections, verifySelection } from '../../ci/arena/verify-workflow.ts';
import { SUITE_DOMAINS } from '../../ci/arena/summarize-tests.ts';
import { domainsOf } from '../../ci/arena/changed-layers.ts';
import { jobBlocks } from './check-portability.ts';
import {
  testStep, summarize, summaryLine, stepStatus, GATES, DOMAINS, SUITES, gatesFor, parseCheckArgs, testFilesUnder,
  keptButFailed, ANGULAR_EMIT, TEST_CASE, typeSteps, planSteps, runSteps, collate, exitCode, stepOutcome, block, poolProblems,
  slotsLine, type Planned, type Result,
} from './check-all.ts';

const verify = () => verifySelection(readFileSync(join(repoRoot, VERIFY_WORKFLOW), 'utf8'));

const INTERRUPTED: Deadline = deadline('check-all:interrupted', 20_000,
  'four bun processes start, each writes its pid, and the runner is signalled; a cold bun start on '
  + 'a loaded machine takes most of a second, and the bound only ends a hang');

const PAST_DEFAULT: Deadline = deadline('check-all-test:past-default', 5_500,
  'half a second past bun\'s own per-case default, so the case outlives it and nothing else');

const BUDGET = budgetFor(COLLECTION, INTERRUPTED, TERM_GRACE, ABORT_GRACE, PAST_DEFAULT, TEST_CASE);

const MEASURED_HEAVY = new Map([
  ['check:pixel-parity', 'browser'], ['check:target-size', 'browser'], ['check:proximity', 'browser'],
  ['check:focus-trap', 'browser'], ['check:script-types', 'compiler'],
  ['check:react-types', 'compiler'],
]);

const MEASURED_COST = new Map([
  ['check:pixel-parity', 34], ['check:script-types', 13.5], ['check:react-types', 12.7],
  ['check:target-size', 11.9], ['check:proximity', 10.2], ['check:focus-trap', 4.1],
]);

const TEST_COST = new Map([
  ['build (ngc emit of the Angular layer)', 21.2], ['test (scripts)', 38.1], ['test (react)', 0.7],
  ['test (react-dom)', 6.9], ['test (angular)', 5.4],
]);

const SPLIT_TESTS = ['build (ngc emit of the Angular layer)', 'test (scripts)', 'test (react)',
  'test (react-dom)', 'test (angular)'];

test('GATES lists every check gate', () => {
  assert.equal(GATES.length, 89);
  assert.deepEqual(
    GATES.map((g) => g.name),
    ['check:docs', 'check:graph', 'check:portability', 'check:workflow-scripts', 'check:generated', 'check:skill-spec', 'check:skills', 'check:support', 'check:prompts', 'check:rules', 'check:register', 'check:routes', 'check:vocabulary', 'check:families', 'check:architecture', 'check:duplication', 'check:dtcg', 'check:user-scale', 'check:catalogue', 'check:style-plugin', 'check:style-plugin-coverage', 'check:role-contract', 'check:compat-aliases', 'check:polarity', 'check:tokens', 'check:token-collisions', 'check:script-tokens', 'check:duplicate-constants', 'check:deadlines', 'check:ramp', 'check:boundary-contrast', 'check:text-contrast', 'check:tailwind', 'check:tailwind-generated', 'check:coverage', 'check:radius', 'check:roles', 'check:arbitrary', 'check:safe-area', 'check:component-css', 'check:channels', 'check:dimensions', 'check:states', 'check:measured-box', 'check:intrinsic-width', 'check:appearance', 'check:parts', 'check:boundaries', 'check:layer-independence', 'check:structure', 'check:contracts', 'check:contracts-package', 'check:mcp', 'check:contracts-neutrality', 'check:contracts-resolve', 'check:behaviour', 'check:compliance', 'check:api', 'check:playgrounds', 'check:kitchen-sink', 'check:citations', 'check:agents', 'check:agents-spec', 'check:community', 'check:site', 'check:icons', 'check:fonts', 'check:intro', 'check:vendor', 'check:demos', 'check:react-barrel', 'check:react-types', 'check:text-runs', 'check:script-types', 'check:script-reach', 'check:focus-trap', 'check:target-size', 'check:pixel-parity', 'check:proximity', 'check:shared-arithmetic', 'check:packages', 'check:consumer', 'check:exports', 'check:classes', 'check:angular-demos', 'check:assertions', 'check:cdk', 'check:boolean-inputs', 'check:optional-inputs'],
  );
});

test('the domain table in scripts/check/AGENTS.md counts what GATES holds, or it goes quietly stale', () => {
  const readme = readFileSync(join(repoRoot, 'scripts', 'check', 'AGENTS.md'), 'utf8');
  const counted: Record<string, number> = {};
  for (const { file } of GATES) {
    const domain = file.split('/')[0] ?? '';
    counted[domain] = (counted[domain] ?? 0) + 1;
  }
  for (const [domain, n] of Object.entries(counted)) {
    const row = new RegExp(`\\[\`${domain}/\`\\]\\([^)]*\\) \\| (\\d+) \\|`);
    const found = row.exec(readme);
    assert.ok(found, `the domain table names no ${domain}/ row`);
    assert.equal(Number(found[1]), n,
      `the table says ${domain}/ holds ${found[1]} gate(s) and GATES holds ${n}`);
  }
});

test('every gate has a row in its own domain table, because a gate nobody documented is one nobody finds', () => {
  const missing = [];
  for (const { name, file } of GATES) {
    const [domain = '', gate = ''] = file.split('/');
    const table = readFileSync(join(repoRoot, 'scripts', 'check', domain, 'AGENTS.md'), 'utf8');
    if (!table.includes(`\`${gate}\``)) missing.push(`${name} (${gate} has no row in scripts/check/${domain}/AGENTS.md)`);
  }
  assert.deepEqual(missing, [],
    'the domain table is the fifth registration point, and it is the one that fails silently: '
    + 'a gate runs, passes and is documented nowhere');
});

const COVERED_ELSEWHERE = new Map([
  ['check:graph', 'scripts/graph/graph-problems.test.ts: everything it asserts lives in '
    + 'graph-problems.ts with the rest of the graph, and this file is a print and an exit'],
  ['check:vendor', 'scripts/build/react/build-vendor.ts owns the bundle it compares against, and '
    + 'the gate is that build run a second time and diffed'],
  ['check:demos', 'scripts/build/react/build-demos.test.ts: the emit is the build\'s, and the '
    + 'gate compares it against disk'],
  ['check:react-barrel', 'scripts/build/react/build-react-barrel.test.ts, for the same reason'],
  ['check:intro', 'the bundles are Bun.build\'s own output and the gate is a byte comparison, so '
    + 'there is no logic of its own to read'],
]);

test('every gate has a paired suite beside it, or an entry saying where it is covered instead', () => {
  const uncovered = [];
  const met = new Set();
  for (const { name, file } of GATES) {
    if (existsSync(join(repoRoot, 'scripts', 'check', file.replace(/\.ts$/, '.test.ts')))) {
      if (COVERED_ELSEWHERE.has(name)) uncovered.push(`${name} has a sibling suite AND a COVERED_ELSEWHERE entry`);
      continue;
    }
    if (COVERED_ELSEWHERE.has(name)) { met.add(name); continue; }
    uncovered.push(`${name} (no ${file.replace(/\.ts$/, '.test.ts')}, and no entry saying where it is covered)`);
  }
  for (const [name] of COVERED_ELSEWHERE)
    if (!met.has(name)) uncovered.push(`COVERED_ELSEWHERE names ${name}, which is in no gate list any more`);
  assert.deepEqual(uncovered, [],
    'a gate is pure functions plus a main(), and a suite is what reads those functions: without '
    + 'one, a gate that finds nothing and a gate that looks at nothing are the same run. A gate '
    + 'whose own file is a print and an exit is covered where its logic lives, and its entry says '
    + 'where; an entry whose gate has since grown a sibling suite fails as a stale allowance');
});

test('every gate in the array is also an npm script -- a gate a reader cannot invoke by name is the shape check:text-contrast shipped in', () => {
  const scripts = readJson(join(repoRoot, 'package.json')).scripts;
  for (const { name } of GATES) {
    assert.ok(name in scripts, `${name} is in the gate array and not in package.json, so \`bun run ${name}\` answers "Script not found"`);
  }
});

test('every gate sits in one of the five domains, so a new one cannot land outside the grid', () => {
  assert.deepEqual(DOMAINS, ['core', 'react', 'angular', 'tailwind', 'arena']);
  for (const { name, file } of GATES) {
    const [domain = '', ...tail] = file.split('/');
    assert.ok(DOMAINS.includes(domain), `${name} names the domain ${domain}, which is not one of the five`);
    assert.equal(tail.length, 1, `${name} points at ${file}, which is not <domain>/<gate>.ts`);
  }
});

test('selecting every domain selects every gate, so no gate can hide outside the union', () => {
  assert.equal(gatesFor(DOMAINS).length, GATES.length);
});

test('verify.yml runs the gates of the domains its caller selects in one job, so each gate runs once', () => {
  const selection = verify();
  assert.deepEqual(selection.problems, []);
  assert.equal(selection.gates.length, 1, 'one job runs check-all, on the domains the caller hands it');
  const names = gatesFor(DOMAINS).map((g) => g.name);
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual([...names].sort(), GATES.map((g) => g.name).sort());
});

test('every domain is selected by some caller of verify.yml, and develop and main select all of them', () => {
  const workflows = workflowTexts(repoRoot);
  const { callers, problems } = callerSelections(workflows);
  assert.deepEqual(problems, []);
  assert.deepEqual(callers.map((one) => one.file).sort(),
    ['.github/workflows/develop.yml', '.github/workflows/main.yml', '.github/workflows/pr.yml']);
  const selected = new Set<string>();
  for (const caller of callers) {
    if (caller.domains === '${{ needs.changes.outputs.domains }}') {
      const changes = jobBlocks(workflows.find((one) => one.file === caller.file)?.text ?? '').get('changes') ?? '';
      assert.match(changes, /^ {6}domains: \$\{\{ steps\.layers\.outputs\.domains \}\}$/m);
      assert.match(changes, /bun scripts\/ci\/arena\/changed-layers\.ts >> "\$GITHUB_OUTPUT"/);
      for (const one of domainsOf(Object.fromEntries(LAYERS.map((layer) => [layer, true])))) selected.add(one);
      continue;
    }
    const list = caller.domains.split(',');
    assert.deepEqual([...list].sort(), [...DOMAINS].sort(),
      `${caller.file} verifies a whole branch, so it selects every domain`);
    for (const one of list) selected.add(one);
  }
  assert.deepEqual([...selected].sort(), [...DOMAINS].sort());
});

test('each suite runs in one job of verify.yml, and that job runs when the domain owning the suite is selected', () => {
  const { suites } = verify();
  assert.deepEqual([...suites.keys()].sort(), Object.keys(SUITES).sort());
  for (const [suite, { job, domain }] of suites) {
    assert.equal(domain, SUITE_DOMAINS[suite], `${suite} runs in ${job}, which ${domain ?? 'every run'} selects`);
  }
});

test('a domain that does not exist is refused rather than answered with an empty run', () => {
  assert.throws(() => gatesFor(['nope']), /no domain called nope/);
  assert.throws(() => gatesFor([]), /selected no gate/);
});

test('the arena domain is where the cross-layer gates are, which is why every caller of verify.yml selects it', () => {
  const arena = gatesFor(['arena']).map((g) => g.name);
  for (const name of ['check:api', 'check:behaviour', 'check:compliance', 'check:structure',
    'check:dimensions', 'check:layer-independence', 'check:focus-trap', 'check:parts', 'check:pixel-parity',
    'check:shared-arithmetic', 'check:packages', 'check:playgrounds']) {
    assert.ok(arena.includes(name), `${name} is not in the arena domain`);
  }
});

test('with no argument every domain runs and the suite runs, which is what bun run check gets', () => {
  assert.deepEqual(parseCheckArgs([]), { domains: DOMAINS, tests: true, force: false, release: false, jobs: null });
});

test('a narrowed invocation names its domains and can drop the suite', () => {
  assert.deepEqual(parseCheckArgs(['--domain=core,arena', '--no-tests']), { domains: ['core', 'arena'], tests: false, force: false, release: false, jobs: null });
  assert.deepEqual(parseCheckArgs(['--domain=react']), { domains: ['react'], tests: true, force: false, release: false, jobs: null });
  assert.deepEqual(parseCheckArgs(['--force']), { domains: DOMAINS, tests: true, force: true, release: false, jobs: null });
});

test('an argument nobody recognises is refused, so a typo in a workflow is loud', () => {
  assert.deepEqual(parseCheckArgs(['--release']), { domains: DOMAINS, tests: true, force: true, release: true, jobs: null },
    'a release run is a full run that also compares, so it implies --force rather than ranking against it');
  assert.throws(() => parseCheckArgs(['--domains=react']), /unrecognised argument/);
  assert.throws(() => parseCheckArgs(['--jobs']), /unrecognised argument "--jobs"; .*--jobs=<n>/);
});

test('testFilesUnder finds a suite nested several directories deep, which a flat read would miss', () => {
  const root = mkdtempSync(join(tmpdir(), 'check-all-'));
  try {
    mkdirSync(join(root, 'check', 'angular'), { recursive: true });
    writeFileSync(join(root, 'check', 'angular', 'a.test.ts'), '// suite');
    writeFileSync(join(root, 'check', 'angular', 'a.ts'), '// not a suite');
    writeFileSync(join(root, 'serve.ts'), '// not a suite');
    assert.deepEqual(testFilesUnder(root), [join(root, 'check', 'angular', 'a.test.ts')]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a suite is TypeScript, so a .test.mjs is not one and would run in neither runner', () => {
  const root = mkdtempSync(join(tmpdir(), 'check-all-ext-'));
  try {
    for (const name of ['a.test.mjs', 'b.test.ts', 'c.mjs', 'd.ts', 'notes.md'])
      writeFileSync(join(root, name), '// fixture');
    assert.deepEqual(testFilesUnder(root).map((p) => relPosix(root, p)).sort(), ['b.test.ts'],
      'domains.test.ts is what stops a .test.mjs reaching the tree at all; this only says '
      + 'that if one did, the run would not silently include it and count it as covered');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the node step names how many suites it found, because a narrowed run and a full one read alike', () => {
  const step = testStep({ isBun: false, testFiles: ['/repo/scripts/a.test.mjs'] });
  assert.match(step[0]?.name ?? '', /1 found/);
});

test('testStep runs the emit and each suite in its own process, the Angular suites after the emit they read', () => {
  const steps = testStep({ isBun: true, testFiles: ['a.test.mjs', 'b.test.mjs'] });
  assert.deepEqual(steps, [
    { name: 'build (ngc emit of the Angular layer)', args: ['run', 'build:angular-tests'], pool: 'compiler', cost: 21.2 },
    { name: 'test (scripts)', args: ['test', 'scripts', `--timeout=${TEST_CASE.ms}`], pool: 'compiler', cost: 38.1 },
    { name: 'test (react)', args: ['test', 'frameworks/react', '--path-ignore-patterns=**/*.dom.test.*', `--timeout=${TEST_CASE.ms}`], pool: 'compiler', cost: 0.7 },
    { name: 'test (react-dom)', args: ['test', '--preload', './frameworks/react/test/Preload.js', '.dom.test.', `--timeout=${TEST_CASE.ms}`], pool: 'compiler', cost: 6.9 },
    { name: 'test (angular)', args: ['test', 'frameworks/angular/build/test', `--timeout=${TEST_CASE.ms}`], pool: 'compiler', cost: 5.4,
      after: ['build (ngc emit of the Angular layer)'] },
  ]);
  assert.equal(steps[0], ANGULAR_EMIT);
});

test('every suite gives a case the test-case deadline rather than bun\'s default', () => {
  for (const [name, suite] of Object.entries(SUITES))
    assert.equal(suite.args.at(-1), `--timeout=${TEST_CASE.ms}`, name);
});

test('a case running past bun\'s default passes under a suite\'s arguments, fails without them, and ends under a shorter deadline',
  { timeout: budgetFor(PAST_DEFAULT, PAST_DEFAULT, TEST_CASE) }, () => {
    const root = mkdtempSync(join(tmpdir(), 'arena-test-case-'));
    try {
      writeFileSync(join(root, 'slow.test.ts'),
        `import { test } from 'bun:test';\ntest('slow', async () => { await Bun.sleep(${PAST_DEFAULT.ms}); });\n`);
      const run = (extra: string[]) => {
        const done = spawnSync(process.execPath, ['test', root, ...extra], { cwd: root, encoding: 'utf8' });
        return { status: done.status, output: `${done.stdout}${done.stderr}` };
      };
      const ended = run([]);
      assert.equal(ended.status, 1, `bun's default ends the case: ${ended.output}`);
      const finished = run([`--timeout=${TEST_CASE.ms}`]);
      assert.equal(finished.status, 0, `the suite deadline lets it finish: ${finished.output}`);
      const hung = run(['--timeout=1000']);
      assert.equal(hung.status, 1, `a deadline below the case still ends it, so a hung case ends: ${hung.output}`);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

test('bun is pointed at the tree ngc actually emits, so a rootDir edit cannot run zero Angular suites', () => {
  const emitted = relPosix(repoRoot, angularEmitRoot(join(repoRoot, 'frameworks', 'angular', 'tsconfig.test.json')));
  const runs = testStep({ isBun: true, testFiles: [] }).filter((s) => s.args[0] === 'test');
  assert.equal(runs.length, 4, 'the bun branch runs four test invocations');
  assert.ok(runs.some((s) => s.args.includes(toPosix(emitted))),
    `no test step runs ${emitted}, which is where ngc emits`);
});

test('a run without the suites still compiles the Angular layer when it selects angular, because the emit is its type verdict', () => {
  assert.deepEqual(typeSteps(['angular']), [ANGULAR_EMIT]);
  assert.deepEqual(typeSteps(['core', 'angular']), [ANGULAR_EMIT]);
  assert.deepEqual(typeSteps(['core', 'arena']), []);
  assert.deepEqual(typeSteps(DOMAINS), [ANGULAR_EMIT]);
});

test('testStep runs `node --test` over the discovered files under node', () => {
  const steps = testStep({ isBun: false, testFiles: ['/repo/scripts/a.test.mjs', '/repo/scripts/b.test.mjs'] });
  assert.deepEqual(steps.map((s) => s.args), [['--test', '/repo/scripts/a.test.mjs', '/repo/scripts/b.test.mjs']]);
});

test('stepStatus maps exit 2 to a skip, and everything else to pass or fail', () => {
  assert.equal(stepStatus(0), 'pass');
  assert.equal(stepStatus(1), 'fail');
  assert.equal(stepStatus(2), 'skip');
  assert.equal(stepStatus(null), 'fail');
});

test('summarize lists every step and reports overall success', () => {
  const out = summarize([{ name: 'a', status: 'pass', ms: 500 }, { name: 'b', status: 'pass', ms: 500 }]);
  assert.match(out, /PASS {2}a/);
  assert.match(out, /PASS {2}b/);
  assert.match(out, /all 2 step\(s\) passed/);
});

test('summarize reports which steps failed', () => {
  const out = summarize([{ name: 'a', status: 'pass', ms: 500 }, { name: 'b', status: 'fail', ms: 500 }]);
  assert.match(out, /FAIL {2}b/);
  assert.match(out, /1\/2 step\(s\) failed/);
});

test('a skipped step is never a green run — the summary says INCOMPLETE', () => {
  const out = summarize([{ name: 'a', status: 'pass', ms: 500 }, { name: 'check:focus-trap', status: 'skip', ms: 500 }]);
  assert.match(out, /SKIP {2}check:focus-trap/);
  assert.match(out, /INCOMPLETE/);
  assert.doesNotMatch(out, /all 2 step\(s\) passed/);
});

test('a failure outranks a skip in the tail', () => {
  const out = summarize([{ name: 'a', status: 'fail', ms: 500 }, { name: 'b', status: 'skip', ms: 500 }]);
  assert.match(out, /1\/2 step\(s\) failed/);
});

test('a gate that failed while the graph would have kept it is a defect in the graph', () => {
  const results = [
    { name: 'check:api', status: 'fail' },
    { name: 'check:docs', status: 'fail' },
    { name: 'check:dtcg', status: 'pass' },
  ];
  assert.deepEqual(keptButFailed(results, new Set(['check:api', 'check:dtcg'])), [
    'check:api failed and the graph would have kept it -- that is a defect in the declared graph, '
    + 'not only in the gate: something it reads is not something it says it reads',
  ]);
});

test('a failure the graph would have run anyway is the gate\'s own, and says nothing about the graph', () => {
  assert.deepEqual(keptButFailed([{ name: 'check:docs', status: 'fail' }], new Set()), [],
    'check:docs never subscribes, so a red there is a red and nothing more');
});

test('every gate measured as a browser or a compiler declares that pool, and no other gate declares one', () => {
  assert.equal(MEASURED_HEAVY.size, 6);
  const declared = new Map(GATES.filter((g) => g.pool !== undefined).map((g) => [g.name, g.pool]));
  for (const name of MEASURED_HEAVY.keys()) assert.ok(GATES.some((g) => g.name === name), `${name} is not in GATES`);
  assert.deepEqual([...declared].sort(), [...MEASURED_HEAVY].sort(),
    'a gate that peaks above a gigabyte and declares no pool runs as light, and two of them at once can '
    + 'take the machine down; a light gate declaring one costs a heavy slot it does not need');
});

test('--jobs takes a whole number once, and every other shape stops the run before a step starts', () => {
  assert.equal(parseCheckArgs(['--jobs=1']).jobs, 1);
  assert.equal(parseCheckArgs(['--force', '--jobs=6']).jobs, 6);
  for (const shape of ['--jobs=0', '--jobs=', '--jobs=abc', '--jobs=1.5', '--jobs=-1', '--jobs=01']) {
    assert.throws(() => parseCheckArgs([shape]), /is not a whole number of at least 1 written without a leading zero/, shape);
  }
  assert.throws(() => parseCheckArgs(['--jobs=2', '--jobs=3']), /--jobs is given twice/);
});

test('a pool no step can run in is refused from the declarations, before anything is purged or started', () => {
  const slots = { total: 4, heavy: 2, browser: 1 };
  const steps = testStep({ isBun: true, testFiles: [] });
  assert.deepEqual(poolProblems(GATES, steps, slots), []);
  const typo = GATES.map((g) => (g.name === 'check:script-types' ? { ...g, pool: 'compilr' as never } : g));
  const problems = poolProblems(typo, steps, slots);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /check:script-types declares pool "compilr", which is none of browser, compiler/);
  const lightCost = GATES.map((g) => (g.name === 'check:docs' ? { ...g, cost: 1 } : g));
  assert.match(poolProblems(lightCost, steps, slots).join(), /check:docs declares a cost and no pool/);
  assert.match(poolProblems(GATES, steps, { total: 0, heavy: 1, browser: 1 }).join(), /total slots are 0/);
});

test('main refuses a misspelt pool with the sentence and exit 1, before --force purges anything',
  { timeout: BUDGET }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'check-all-pool-'));
    try {
      const harness = join(dir, 'harness.ts');
      const url = JSON.stringify(pathToFileURL(join(repoRoot, 'scripts', 'check', 'arena', 'check-all.ts')).href);
      writeFileSync(harness, [
        `import { GATES, main } from ${url};`,
        "const typo = GATES.map((g) => (g.name === 'check:script-types' ? { ...g, pool: 'compilr' } : g));",
        `await main(['--domain=arena', '--no-tests', '--force'], typo, ${JSON.stringify(dir)});`,
      ].join('\n'));
      const canary = join(dir, '.cache', 'artifacts', 'canary.json');
      mkdirSync(join(dir, '.cache', 'artifacts'), { recursive: true });
      writeFileSync(canary, '{}');
      const r = await childOutputAsync(process.execPath, [harness], { cwd: dir });
      assert.equal(r.code, 1, r.output);
      assert.match(r.output, /check-all: the run cannot be scheduled: check:script-types declares pool "compilr"/);
      assert.doesNotMatch(r.output, /--force dropped/, 'the purge ran before the refusal');
      assert.ok(existsSync(canary), 'the refusal came after the purge deleted the artifacts');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

async function refusal(domain: string, gate: Record<string, unknown>) {
  const dir = mkdtempSync(join(tmpdir(), 'check-all-emit-'));
  try {
    const harness = join(dir, 'harness.ts');
    const url = JSON.stringify(pathToFileURL(join(repoRoot, 'scripts', 'check', 'arena', 'check-all.ts')).href);
    writeFileSync(harness, [
      `import { main } from ${url};`,
      `await main(['--domain=${domain}', '--no-tests'], [${JSON.stringify(gate)}], ${JSON.stringify(dir)});`,
    ].join('\n'));
    return await childOutputAsync(process.execPath, [harness], { cwd: dir });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('main with --no-tests plans the emit when it selects angular and plans no step otherwise',
  { timeout: BUDGET }, async () => {
    const twin = { name: ANGULAR_EMIT.name, file: 'angular/twin.ts' };
    const angular = await refusal('angular', twin);
    assert.equal(angular.code, 1, angular.output);
    assert.match(angular.output, /build \(ngc emit of the Angular layer\) is listed twice/, angular.output);
    const core = await refusal('core', { name: 'check:dtcg', file: 'core/check-dtcg.ts', pool: 'compilr' });
    assert.equal(core.code, 1, core.output);
    assert.match(core.output, /check:dtcg declares pool "compilr"/, core.output);
    assert.doesNotMatch(core.output, /listed twice|ngc emit/, core.output);
  });

test('the slots line names what bounded each figure, so a flag the cores capped is not credited with the number', () => {
  const capped = `and ${BROWSER_CAP} a browser (capped at ${BROWSER_CAP})`;
  const rows: [number | null, number, number, string][] = [
    [null, 8, 16 * GIB, `up to 8 step(s) at once (the 8 cores), 8 of them a browser or a compiler (the free memory allows that many) ${capped}, the heavy ones longest first`],
    [64, 8, 16 * GIB, `up to 8 step(s) at once (--jobs=64 capped at the 8 cores), 8 of them a browser or a compiler (the free memory allows that many) ${capped}, the heavy ones longest first`],
    [3, 8, 2.5 * GIB, 'up to 3 step(s) at once (--jobs=3), 1 of them a browser or a compiler (bounded by the free memory) and 1 a browser (the heavy limit), the heavy ones longest first'],
  ];
  for (const [jobs, cores, free, line] of rows) {
    assert.equal(slotsLine(jobs, cores, free), `check-all: ${line}`);
  }
  assert.equal(rows.length, 3);
});

test('the plan holds every gate once and every suite step once, and a kept gate spawns nothing', () => {
  const all = planSteps(GATES, new Map(), testStep({ isBun: true, testFiles: [] }), '/bin/bun');
  const names = all.planned.map((one) => one.name);
  assert.equal(names.length, GATES.length + SPLIT_TESTS.length);
  assert.equal(new Set(names).size, names.length, 'a name planned twice runs twice');
  assert.deepEqual(names, [...GATES.map((g) => g.name), ...SPLIT_TESTS]);
  assert.deepEqual(all.kept, []);
  const pixel = all.planned.find((one) => one.name === 'check:pixel-parity');
  assert.equal(pixel?.pool, 'browser');
  assert.equal(pixel?.cost, 34);
  assert.equal(pixel?.command, '/bin/bun');
  assert.match(pixel?.args[0] ?? '', /check-pixel-parity\.ts$/);

  const decisions = new Map([
    ['check:docs', { run: false, reason: null, fingerprint: '1c289ae16237aaaa' }],
    ['check:graph', { run: true, reason: 'its declared inputs moved', fingerprint: 'ffff' }],
  ]);
  const some = planSteps(GATES.slice(0, 2), decisions, [], '/bin/bun');
  assert.deepEqual(some.kept, [{ name: 'check:docs', status: 'cached', note: '1c289ae16237, unchanged from the previous run' }]);
  assert.deepEqual(some.planned.map((one) => [one.name, one.reason]), [['check:graph', 'its declared inputs moved']]);
});

test('no gate reads what a step running beside it writes, so a parallel sweep never reads a half-written tree',
  { timeout: BUDGET }, async () => {
    const { nodes } = await allNodes(repoRoot);
    const steps = testStep({ isBun: true, testFiles: [] });
    const writers = nodes.filter((node) => steps.some((step) => step.args[0] === 'run' && step.args[1] === node.name));
    assert.deepEqual(writers.map((node) => node.name), ['build:angular-tests']);
    const probes = writers.flatMap((node) => node.writes
      .filter((spec) => !spec.startsWith('!'))
      .flatMap((spec) => ['ts', 'd.ts', 'js', 'js.map', 'test.js', 'mjs', 'json', 'map', 'html', 'css']
        .map((ext) => spec.replace(/\*\*/g, 'probe').replace(/\*/g, 'probe').replace(/\/?$/, `/probe.${ext}`))));
    assert.ok(probes.length > 0, 'the emit writes nothing, so this case would hold over nothing');
    const gates = nodes.filter((node) => GATES.some((g) => g.name === node.name));
    const nodeless = GATES.filter((g) => neverSubscribesReason(`scripts/check/${g.file}`) !== null).map((g) => g.name);
    assert.ok(gates.length > 0, 'no gate declares a node, so this case would hold over nothing');
    assert.ok(nodeless.length > 0, 'no gate is declared as never subscribing, so the split below holds over nothing');
    assert.equal(gates.length + nodeless.length, GATES.length,
      `a gate falls out of both halves of this case: ${gates.length} declare a node and ${nodeless.length} are listed `
      + 'as never subscribing, and a gate counted in neither has no declaration for this case to read');
    const readers = gates
      .map((node) => ({ name: node.name, reached: resolveSpecs(node.reads, probes) }))
      .filter((one) => one.reached.length > 0)
      .map((one) => `${one.name} reads ${one.reached[0]}`);
    assert.deepEqual(readers, [],
      'the emit and the suites run beside the gates, so a gate reading what the emit writes can meet the '
      + 'emit halfway; exclude the tree in its reads, or say in the plan why it waits for the emit. '
      + `The gates without a node (${nodeless.join(', ')}) are covered by their own walk skipping build/, not by a declaration`);
  });

const runner = (name: string, code: string): Planned => ({ name, command: process.execPath, args: ['-e', code] });
const LINES = 5000;
const PAD = 'x'.repeat(76);

test('real children: a pass, a failure, an exit 2, a burst larger than a pipe and a missing command, each with its block',
  { timeout: BUDGET }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'check-all-burst-'));
    const burst = join(dir, 'burst.mjs');
    writeFileSync(burst, [
      `const lines = Array.from({ length: ${LINES} }, (_, i) => 'line ' + i + ' ' + '${PAD}');`,
      "process.stdout.write(lines.join('\\n') + '\\n');",
      'process.exit(0);',
    ].join('\n'));
    const planned: Planned[] = [
      runner('passes', "console.log('fine')"),
      runner('fails', "console.error('broken'); process.exit(1)"),
      runner('skips', "console.error('no browser here'); process.exit(2)"),
      { name: 'bursts', command: process.execPath, args: [burst] },
      { name: 'cannot-spawn', command: join(tmpdir(), 'arena-no-such-binary'), args: [] },
    ];
    const printed: string[] = [];
    let ran;
    try {
      ran = await runSteps(planned, { total: 2, heavy: 1, browser: 1 },
        { print: (text) => { printed.push(text); } });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    const { finished, notStarted } = ran;
    assert.equal(finished.length, planned.length);
    assert.deepEqual(notStarted, []);
    assert.deepEqual(Object.fromEntries(finished.map((one) => [one.name, one.status])),
      { passes: 'pass', fails: 'fail', skips: 'skip', bursts: 'pass', 'cannot-spawn': 'fail' });
    assert.match(finished.find((one) => one.name === 'cannot-spawn')?.note ?? '', /failed to spawn/);
    assert.equal(printed.length, planned.length, 'one block per step');
    for (const { name } of planned) {
      assert.equal(printed.filter((text) => text.includes(`\n> ${name}\n`)).length, 1, `${name} printed one block`);
    }
    const burstBlock = printed.find((text) => text.includes('\n> bursts\n')) ?? '';
    assert.equal(burstBlock.split('\n').filter((line) => line.startsWith('line ')).length, LINES);
    assert.ok(burstBlock.includes(`line ${LINES - 1} ${PAD}`), 'the block ends with the last line the child wrote');
    assert.match(printed.find((text) => text.includes('\n> fails\n')) ?? '', /broken/);

    const results = collate(planned.map((one) => one.name), finished);
    assert.deepEqual(results.map((one) => one.name), planned.map((one) => one.name), 'the summary keeps the planned order');
    assert.match(summarize(results), /2\/5 step\(s\) failed/);
    assert.equal(exitCode(results, [], false), 1);
    const skipOnly = collate(['passes', 'skips'], finished.filter((one) => one.name === 'passes' || one.name === 'skips'));
    assert.match(summarize(skipOnly), /INCOMPLETE/);
    assert.equal(exitCode(skipOnly, [], false), 0, 'a run that only skips exits 0 and says INCOMPLETE');
    assert.equal(exitCode(skipOnly, ['check:x failed and the graph would have kept it'], false), 1);
  });

test('a signal, a spawn error and an exit code each become the status a reader expects', () => {
  assert.deepEqual(stepOutcome({ code: null, signal: 'SIGKILL', output: '' }), { status: 'fail', note: 'killed by SIGKILL' });
  assert.deepEqual(stepOutcome({ code: null, signal: null, output: '', error: new Error('ENOENT') }),
    { status: 'fail', note: 'failed to spawn: ENOENT' });
  assert.deepEqual(stepOutcome({ code: null, signal: 'SIGKILL', ignored: 'SIGTERM', output: '' }),
    { status: 'fail', note: 'ignored SIGTERM, killed by SIGKILL' });
  assert.deepEqual(stepOutcome({ code: null, signal: null, output: '' }),
    { status: 'fail', note: 'ended with neither an exit code nor a signal' });
  assert.deepEqual(stepOutcome({ code: 3, signal: null, output: '' }), { status: 'fail', note: 'exited 3' });
  assert.deepEqual(stepOutcome({ code: 1, signal: null, output: '' }), { status: 'fail' });
  assert.deepEqual(stepOutcome({ code: 2, signal: null, output: '' }), { status: 'skip' });
  assert.deepEqual(stepOutcome({ code: 0, signal: null, output: '' }), { status: 'pass' });
  assert.equal(block({ name: 'check:x', reason: 'its inputs moved' }, 'said\n', { status: 'pass' }),
    '\ncheck-all: check:x runs, because its inputs moved\n\n> check:x\n\nsaid\n');
  assert.equal(block({ name: 'check:y' }, 'no newline', { status: 'fail', note: 'killed by SIGTERM' }),
    '\n> check:y\n\nno newline\n  killed by SIGTERM\n');
});

test('the summary prints what each step took, and refuses a line it cannot vouch for', () => {
  assert.equal(summaryLine({ name: 'check:docs', status: 'pass', ms: 512 }), '  PASS  check:docs  0.5 s');
  assert.equal(summaryLine({ name: 'check:dtcg', status: 'cached', note: 'abc, unchanged from the previous run' }),
    '  CACHED  check:dtcg  (abc, unchanged from the previous run)');
  assert.throws(() => summaryLine({ name: 'check:docs', status: 'pass' }), /check:docs ran and carries no duration/);
  assert.throws(() => summaryLine({ name: 'check:docs', status: 'fail', ms: Number.NaN }), /carries no duration/);
  assert.throws(() => summaryLine({ name: 'check:docs', status: 'green' } as unknown as Result), /reports "green"/);
  assert.throws(() => collate(['a'], [{ name: 'b', status: 'pass', ms: 1 }]), /b finished without being planned/);
  assert.throws(() => collate(['a', 'b'], [{ name: 'a', status: 'pass', ms: 1 }]), /b is planned and neither finished nor listed as not started/);
  assert.throws(() => collate(['a'], [{ name: 'a', status: 'pass', ms: 1 }, { name: 'a', status: 'pass', ms: 1 }]),
    /a is reported twice, and a step runs exactly once/);
  assert.deepEqual(collate(['a', 'b'], [{ name: 'a', status: 'pass', ms: 1 }], ['b']).map((r) => r.name), ['a']);
  assert.throws(() => summarize([]), /no step to summarize, and a summary over nothing reads as all passed/);
  const interrupted = summarize([{ name: 'a', status: 'pass', ms: 1 }], { notStarted: ['b', 'c'] });
  assert.match(interrupted, /check-all: INTERRUPTED, 1 step\(s\) ran, 0 came from the cache, 2 never started: b, c/);
  assert.doesNotMatch(interrupted, /passed/);
  assert.equal(exitCode([{ name: 'a', status: 'pass', ms: 1 }], [], true), 130);
});

test('an interrupt ends every running child, kills one that ignores SIGTERM, starts nothing further and exits 130',
  { timeout: BUDGET, skip: platform === 'win32' ? 'a signal sent to a process is a POSIX idea' : false }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'check-all-interrupt-'));
    const pidOf = (name: string) => join(dir, `${name}.pid`);
    const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
    try {
      const hold = join(dir, 'hold.mjs');
      writeFileSync(hold, [
        "import { writeFileSync } from 'node:fs';",
        'writeFileSync(process.argv[2], String(process.pid));',
        'setInterval(() => {}, 1_000);',
      ].join('\n'));
      const stubborn = join(dir, 'stubborn.mjs');
      writeFileSync(stubborn, [
        "import { writeFileSync } from 'node:fs';",
        "process.on('SIGTERM', () => {});",
        'writeFileSync(process.argv[2], String(process.pid));',
        'setInterval(() => {}, 1_000);',
      ].join('\n'));
      const harness = join(dir, 'harness.ts');
      const url = (...parts: string[]) => JSON.stringify(pathToFileURL(join(repoRoot, ...parts)).href);
      writeFileSync(harness, [
        "import { writeFileSync } from 'node:fs';",
        `import { runSteps } from ${url('scripts', 'check', 'arena', 'check-all.ts')};`,
        `import { interruptOn } from ${url('scripts', 'graph', 'scheduler.ts')};`,
        `const dir = ${JSON.stringify(dir)};`,
        `const hold = ${JSON.stringify(hold)};`,
        `const stubborn = ${JSON.stringify(stubborn)};`,
        "writeFileSync(`${dir}/harness.pid`, String(process.pid));",
        'const signal = interruptOn();',
        'const step = (name, file = hold) => ({ name, command: process.execPath, args: [file, `${dir}/${name}.pid`] });',
        "const { finished, notStarted } = await runSteps([step('a'), step('b'), step('c', stubborn), step('d')],",
        '  { total: 3, heavy: 1, browser: 1 }, { signal, print: () => {} });',
        'writeFileSync(`${dir}/result.json`, JSON.stringify({ finished: finished.map((one) => [one.name, one.status, one.note ?? ""]), notStarted }));',
        'process.exit(signal.aborted ? 130 : 0);',
      ].join('\n'));
      const ended = childOutputAsync(process.execPath, [harness]);
      const up = await waitFor(() => ['harness', 'a', 'b', 'c'].every((name) => existsSync(pidOf(name))), INTERRUPTED);
      assert.ok(up.seen, up.seen ? '' : up.why);
      const children = ['a', 'b', 'c'].map((name) => Number(readFileSync(pidOf(name), 'utf8')));
      process.kill(Number(readFileSync(pidOf('harness'), 'utf8')), 'SIGINT');
      const r = await ended;
      assert.equal(r.code, 130, r.output);
      const result = JSON.parse(readFileSync(join(dir, 'result.json'), 'utf8'));
      assert.deepEqual(result.notStarted, ['d']);
      assert.deepEqual(result.finished.map(([name, status]: string[]) => [name, status]).sort(),
        [['a', 'fail'], ['b', 'fail'], ['c', 'fail']]);
      for (const [name, , note] of result.finished) {
        if (name === 'c') assert.match(note, /^ignored SIGTERM, killed by SIGKILL$/);
        else assert.match(note, /^killed by SIGTERM$/);
      }
      const gone = await waitFor(() => children.every((pid) => !alive(pid)), INTERRUPTED);
      assert.ok(gone.seen, gone.seen ? '' : gone.why);
      assert.equal(existsSync(pidOf('d')), false, 'd never started');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

test('every gate and suite step with a pool declares its cost in seconds, and no light gate declares one', () => {
  assert.equal(MEASURED_COST.size, MEASURED_HEAVY.size);
  const costed = new Map(GATES.filter((g) => g.cost !== undefined).map((g) => [g.name, g.cost]));
  assert.deepEqual([...costed].sort(), [...MEASURED_COST].sort(),
    'a heavy gate with no cost starts after every costed one whatever it takes, and a light gate with one is refused');
  const steps = testStep({ isBun: true, testFiles: [] });
  assert.equal(steps.length, TEST_COST.size);
  assert.deepEqual(steps.map((one) => [one.name, one.cost]), [...TEST_COST]);
});

test('runSteps hands each step its cost, so with one heavy slot the longest heavy step runs first', { timeout: BUDGET }, async () => {
  const quick = (name: string, cost: number): Planned => ({
    name, command: process.execPath, args: ['-e', "console.log('ok')"], pool: 'compiler', cost,
  });
  const { finished } = await runSteps([quick('short', 1), quick('long', 9)], { total: 2, heavy: 1, browser: 1 },
    { print: () => {} });
  assert.deepEqual(finished.map((one) => one.name), ['long', 'short']);
});
