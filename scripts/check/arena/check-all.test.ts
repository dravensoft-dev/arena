import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { toPosix, relPosix } from '../../utils/posix-path.ts';
import { readJson } from '../../utils/read-file.ts';
import { angularEmitRoot } from '../../lib/angular/emit-root.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { testStep, summarize, stepStatus, GATES, DOMAINS, gatesFor, parseCheckArgs, testFilesUnder, keptButFailed } from './check-all.ts';

const CI_JOBS = {
  core: ['core', 'arena'],
  react: ['react'],
  angular: ['angular'],
  tailwind: ['tailwind'],
};

test('GATES lists every check gate', () => {
  assert.equal(GATES.length, 65);
  assert.deepEqual(
    GATES.map((g) => g.name),
    ['check:docs', 'check:graph', 'check:portability', 'check:generated', 'check:skills', 'check:prompts', 'check:routes', 'check:vocabulary', 'check:duplication', 'check:dtcg', 'check:style-plugin', 'check:style-plugin-coverage', 'check:role-contract', 'check:tokens', 'check:token-collisions', 'check:script-tokens', 'check:duplicate-constants', 'check:deadlines', 'check:ramp', 'check:boundary-contrast', 'check:text-contrast', 'check:tailwind', 'check:tailwind-generated', 'check:coverage', 'check:surface-parity', 'check:radius', 'check:roles', 'check:arbitrary', 'check:component-css', 'check:dimensions', 'check:states', 'check:appearance', 'check:parts', 'check:layer-independence', 'check:structure', 'check:contracts', 'check:behaviour', 'check:compliance', 'check:api', 'check:playgrounds', 'check:kitchen-sink', 'check:citations', 'check:agents', 'check:community', 'check:site', 'check:icons', 'check:fonts', 'check:intro', 'check:vendor', 'check:demos', 'check:react-barrel', 'check:react-types', 'check:script-types', 'check:script-reach', 'check:focus-trap', 'check:pixel-parity', 'check:shared-arithmetic', 'check:packages', 'check:consumer', 'check:angular', 'check:angular-demos', 'check:assertions', 'check:cdk', 'check:boolean-inputs', 'check:optional-inputs'],
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

test('the four CI jobs partition GATES: each gate runs in exactly one of them', () => {
  const seen = new Map();
  for (const [job, domains] of Object.entries(CI_JOBS)) {
    for (const gate of gatesFor(domains)) {
      assert.ok(!seen.has(gate.name), `${gate.name} runs in both ${seen.get(gate.name)} and ${job}`);
      seen.set(gate.name, job);
    }
  }
  assert.deepEqual([...seen.keys()].sort(), GATES.map((g) => g.name).sort());
});

test('a domain that does not exist is refused rather than answered with an empty run', () => {
  assert.throws(() => gatesFor(['nope']), /no domain called nope/);
  assert.throws(() => gatesFor([]), /selected no gate/);
});

test('the arena domain is where the cross-layer gates are, which is why the core job carries it', () => {
  const arena = gatesFor(['arena']).map((g) => g.name);
  for (const name of ['check:api', 'check:behaviour', 'check:compliance', 'check:structure',
    'check:dimensions', 'check:layer-independence', 'check:focus-trap', 'check:parts', 'check:pixel-parity',
    'check:shared-arithmetic', 'check:packages', 'check:playgrounds']) {
    assert.ok(arena.includes(name), `${name} is not in the arena domain`);
  }
});

test('with no argument every domain runs and the suite runs, which is what bun run check gets', () => {
  assert.deepEqual(parseCheckArgs([]), { domains: DOMAINS, tests: true, force: false, release: false });
});

test('a narrowed invocation names its domains and can drop the suite', () => {
  assert.deepEqual(parseCheckArgs(['--domain=core,arena', '--no-tests']), { domains: ['core', 'arena'], tests: false, force: false, release: false });
  assert.deepEqual(parseCheckArgs(['--domain=react']), { domains: ['react'], tests: true, force: false, release: false });
  assert.deepEqual(parseCheckArgs(['--force']), { domains: DOMAINS, tests: true, force: true, release: false });
});

test('an argument nobody recognises is refused, so a typo in a workflow is loud', () => {
  assert.deepEqual(parseCheckArgs(['--release']), { domains: DOMAINS, tests: true, force: true, release: true },
    'a release run is a full run that also compares, so it implies --force rather than ranking against it');
  assert.throws(() => parseCheckArgs(['--domains=react']), /unrecognised argument/);
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

test('the six Angular-layer gates run last -- the compile gate, the demo pages, the assertion shape, the one dependency bridge left, then the two input conventions', () => {
  assert.deepEqual(
    GATES.slice(-6).map((g) => g.name),
    ['check:angular', 'check:angular-demos', 'check:assertions', 'check:cdk', 'check:boolean-inputs',
      'check:optional-inputs'],
  );
});

test('testStep runs every suite under bun, with the DOM harness isolated in its own process', () => {

  const steps = testStep({ isBun: true, testFiles: ['a.test.mjs', 'b.test.mjs'] });
  assert.deepEqual(steps.map((s) => s.args), [
    ['run', 'build:angular-tests'],
    ['test', 'scripts', 'frameworks/react', 'frameworks/angular/build/test',
     '--path-ignore-patterns=**/*.dom.test.*'],
    ['test', '--preload', './frameworks/react/test/Preload.js', '.dom.test.'],
  ]);
});

test('bun is pointed at the tree ngc actually emits, so a rootDir edit cannot run zero Angular suites', () => {
  const emitted = relPosix(repoRoot, angularEmitRoot(join(repoRoot, 'frameworks', 'angular', 'tsconfig.test.json')));
  const bun = testStep({ isBun: true, testFiles: [] }).find((s) => s.args[0] === 'test');
  assert.ok(bun, 'the bun branch runs no `test` step at all');
  const suites = bun.args;
  assert.ok(suites.includes(toPosix(emitted)), `testStep runs ${suites}, but ngc emits into ${emitted}`);
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
  const out = summarize([{ name: 'a', status: 'pass' }, { name: 'b', status: 'pass' }]);
  assert.match(out, /PASS {2}a/);
  assert.match(out, /PASS {2}b/);
  assert.match(out, /all 2 step\(s\) passed/);
});

test('summarize reports which steps failed', () => {
  const out = summarize([{ name: 'a', status: 'pass' }, { name: 'b', status: 'fail' }]);
  assert.match(out, /FAIL {2}b/);
  assert.match(out, /1\/2 step\(s\) failed/);
});

test('a skipped step is never a green run — the summary says INCOMPLETE', () => {
  const out = summarize([{ name: 'a', status: 'pass' }, { name: 'check:focus-trap', status: 'skip' }]);
  assert.match(out, /SKIP {2}check:focus-trap/);
  assert.match(out, /INCOMPLETE/);
  assert.doesNotMatch(out, /all 2 step\(s\) passed/);
});

test('a failure outranks a skip in the tail', () => {
  const out = summarize([{ name: 'a', status: 'fail' }, { name: 'b', status: 'skip' }]);
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
