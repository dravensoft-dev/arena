import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EXPECTED_ROOTS, SUITE_DOMAINS, SUITE_ROOTS, coverageProblems, expectedSuites, joinReport, main,
  parseJunit, parseSummarizeArgs, renderSummary, runJunitSteps, stepsWithJunit, suiteDomains, suiteWithJunit, tally,
} from './summarize-tests.ts';
import { SUITES, suiteSteps, testStep } from '../../check/arena/check-all.ts';
import { DOMAINS } from '../../lib/arena/domains.ts';

const AUTHORITY = testStep({ isBun: true, testFiles: [] });

test('the invocation comes from testStep and gains the two junit flags, nothing else', () => {
  const steps = stepsWithJunit('out');
  assert.equal(steps.length, AUTHORITY.length);

  assert.deepEqual(steps[0]?.args, AUTHORITY[0]?.args, 'the Angular emit step is not a test run and is untouched');
  assert.equal(steps[0]?.outfile, undefined);

  for (const i of [1, 2]) {
    assert.deepEqual(
      steps[i]?.args,
      [...(AUTHORITY[i]?.args ?? []), '--reporter=junit', `--reporter-outfile=out/suite-${i}.xml`],
      `step ${i} was rebuilt rather than extended`,
    );
    assert.equal(steps[i]?.outfile, `out/suite-${i}.xml`);
  }
});

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="4">
  <testsuite name="scripts/lib/arena/domains.test.ts" file="scripts/lib/arena/domains.test.ts" tests="3">
    <testcase name="passes" classname="" file="scripts/lib/arena/domains.test.ts" line="1" />
    <testcase name="fails" classname="" file="scripts/lib/arena/domains.test.ts" line="2">
      <failure type="AssertionError" />
    </testcase>
    <testcase name="skipped" classname="" file="scripts/lib/arena/domains.test.ts" line="3">
      <skipped />
    </testcase>
  </testsuite>
  <testsuite name="frameworks/react/x.test.tsx" file="frameworks/react/x.test.tsx" tests="1">
    <testcase name="passes" classname="" file="frameworks/react/x.test.tsx" line="1" />
  </testsuite>
</testsuites>`;

test('a case is read as passed, failed or skipped by what it encloses', () => {
  const cases = parseJunit(XML);
  assert.equal(cases.length, 4);
  assert.deepEqual(cases.map((c) => c.status), ['pass', 'fail', 'skip', 'pass']);
});

test('a case with no file of its own falls back to the suite that holds it', () => {
  const cases = parseJunit(
    '<testsuites><testsuite name="a" file="scripts/check/core/a.test.mjs">'
    + '<testcase name="x" classname="" /></testsuite></testsuites>',
  );
  assert.deepEqual(cases, [{ file: 'scripts/check/core/a.test.mjs', status: 'pass' }]);
});

test('a report with no case at all parses to nothing rather than throwing', () => {
  assert.deepEqual(parseJunit('<testsuites name="bun test" tests="0" />'), []);
});

test('the tally counts per domain and keeps what it could not place', () => {
  const counted = tally([
    ...parseJunit(XML),
    { file: 'intro/overview.test.js', status: 'pass' },
  ]);
  assert.equal(counted.total, 5);
  assert.deepEqual(counted.byDomain.get('arena'), { pass: 1, fail: 1, skip: 1 });
  assert.deepEqual(counted.byDomain.get('react'), { pass: 1, fail: 0, skip: 0 });
  assert.deepEqual(counted.byDomain.get('angular'), { pass: 0, fail: 0, skip: 0 });
  assert.deepEqual(counted.unclassified, ['intro/overview.test.js']);
});

test('a domain that owns suites and reported nothing is a problem, not a zero', () => {
  const counted = tally(parseJunit(XML));
  const problems = coverageProblems(counted, ['arena', 'core'], []);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /domain core owns suites and reported 0 cases/);
});

test('a tree that contributed no case is named, so a narrowed run cannot pass as a full one', () => {
  const counted = tally(parseJunit(XML));
  const problems = coverageProblems(counted, [], EXPECTED_ROOTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /frameworks\/angular\/build\/test\//);
});

test('a complete report raises nothing', () => {
  const counted = tally([
    { file: 'scripts/lib/arena/a.test.mjs', status: 'pass' },
    { file: 'frameworks/react/b.test.tsx', status: 'pass' },
    { file: 'frameworks/angular/build/test/c.test.js', status: 'pass' },
  ]);
  assert.deepEqual(coverageProblems(counted, ['arena', 'react', 'angular']), []);
});

test('the summary names every domain and totals them', () => {
  const summary = renderSummary(tally(parseJunit(XML)));
  for (const domain of DOMAINS) assert.match(summary, new RegExp(`\\| ${domain} \\|`), `${domain} is missing`);
  assert.match(summary, /\| \*\*total\*\* \| \*\*2\*\* \| \*\*1\*\* \| \*\*1\*\* \|/);
});

test('suiteDomains reads a domain off every suite, which is what expects its cases', () => {
  const root = mkdtempSync(join(tmpdir(), 'summarize-ext-'));
  try {
    mkdirSync(join(root, 'scripts', 'check', 'tailwind'), { recursive: true });
    mkdirSync(join(root, 'scripts', 'lib', 'core'), { recursive: true });
    writeFileSync(join(root, 'scripts', 'check', 'tailwind', 'a.test.ts'), '// suite');
    writeFileSync(join(root, 'scripts', 'lib', 'core', 'b.test.ts'), '// suite');
    writeFileSync(join(root, 'scripts', 'lib', 'core', 'c.ts'), '// not a suite');
    assert.deepEqual(suiteDomains(join(root, 'scripts')), ['core', 'tailwind']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a domain whose suites are all .ts still expects its cases, so the reporter cannot drop them unnoticed', () => {
  const root = mkdtempSync(join(tmpdir(), 'summarize-ts-'));
  try {
    mkdirSync(join(root, 'scripts', 'check', 'react'), { recursive: true });
    writeFileSync(join(root, 'scripts', 'check', 'react', 'only.test.ts'), '// suite');
    const expected = suiteDomains(join(root, 'scripts'));
    assert.deepEqual(expected, ['react']);
    const counted = tally([]);
    assert.equal(coverageProblems(counted, expected, []).length, 1,
      'react owns a suite and reported nothing, and that has to be a problem rather than a clean run');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('every suite check-all knows has a domain and a root here, and the roots are the ones a full run expects', () => {
  assert.deepEqual(Object.keys(SUITE_DOMAINS).sort(), Object.keys(SUITES).sort());
  assert.deepEqual(Object.keys(SUITE_ROOTS).sort(), Object.keys(SUITES).sort());
  assert.deepEqual([...new Set(Object.values(SUITE_ROOTS))].sort(), [...EXPECTED_ROOTS].sort());
});

test('one suite runs the steps suiteSteps gives it, the test step gaining the junit flags under its own name', () => {
  for (const name of Object.keys(SUITES)) {
    const steps = suiteWithJunit(name, 'out');
    const authority = suiteSteps(name);
    assert.equal(steps.length, authority.length, name);
    steps.forEach((step, i) => {
      const plain = authority[i]?.args ?? [];
      if (plain[0] !== 'test') {
        assert.deepEqual(step.args, plain, `${name}: the emit is not a test run and is untouched`);
        assert.equal(step.outfile, undefined);
        return;
      }
      assert.deepEqual(step.args, [...plain, '--reporter=junit', `--reporter-outfile=out/${name}.xml`], name);
      assert.equal(step.outfile, `out/${name}.xml`);
    });
  }
  assert.equal(suiteWithJunit('angular', 'out')[0]?.name, testStep({ isBun: true, testFiles: [] })[0]?.name,
    'the Angular suite runs the emit first, and a restored emit answers that nothing moved');
});

test('the domains a run selects decide which suites it expects, and the scripts suite is always one', () => {
  assert.deepEqual(expectedSuites(['core', 'arena']), ['scripts']);
  assert.deepEqual(expectedSuites(['core', 'react', 'arena']), ['scripts', 'react', 'react-dom']);
  assert.deepEqual(expectedSuites(['core', 'angular', 'tailwind', 'arena']), ['scripts', 'angular']);
  assert.deepEqual(expectedSuites(DOMAINS), Object.keys(SUITE_DOMAINS));
});

test('the arguments are read in each shape the script takes, and every other shape stops the run', () => {
  assert.deepEqual(parseSummarizeArgs([]), { mode: 'all' });
  assert.deepEqual(parseSummarizeArgs(['--suite=react-dom']), { mode: 'suite', suite: 'react-dom' });
  assert.deepEqual(parseSummarizeArgs(['--join', '--domains=core,arena']), { mode: 'join', domains: ['core', 'arena'] });
  const refused: Record<string, string[]> = {
    'no suite called': ['--suite=nope'],
    'give one of them': ['--suite=scripts', '--join'],
    'needs --domains': ['--join'],
    'given without --join': ['--domains=core'],
    'no domain called nope': ['--join', '--domains=core,nope'],
    'unrecognised argument': ['--verbose'],
    'is given twice': ['--suite=scripts', '--suite=react'],
    'is given twice, and the second': ['--join', '--domains=core', '--domains=arena'],
    '--join is given twice': ['--join', '--join', '--domains=core'],
  };
  for (const [message, argv] of Object.entries(refused)) {
    assert.throws(() => parseSummarizeArgs(argv), new RegExp(message), argv.join(' '));
  }
});

const report = (cases: { file: string }[]) => `<testsuites>${cases.map(({ file }) =>
  `<testsuite name="${file}" file="${file}"><testcase name="x" classname="" file="${file}" /></testsuite>`).join('')}</testsuites>`;

function junitRoot(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'summarize-join-'));
  mkdirSync(join(root, '.cache', 'junit'), { recursive: true });
  for (const [name, xml] of Object.entries(files)) writeFileSync(join(root, '.cache', 'junit', name), xml);
  return root;
}

test('a join reads the report of each selected suite and raises nothing when each is there', () => {
  const root = junitRoot({
    'scripts.xml': report([{ file: 'scripts/lib/arena/a.test.ts' }]),
    'react.xml': report([{ file: 'frameworks/react/b.test.tsx' }]),
    'react-dom.xml': report([{ file: 'frameworks/react/c.dom.test.tsx' }]),
  });
  try {
    const { counted, problems } = joinReport(root, ['core', 'react', 'arena']);
    assert.deepEqual(problems, []);
    assert.equal(counted.total, 3);
    assert.deepEqual(counted.byDomain.get('react'), { pass: 2, fail: 0, skip: 0 });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a join missing a selected report, or holding one nothing selected, names each', () => {
  const root = junitRoot({
    'scripts.xml': report([{ file: 'scripts/lib/arena/a.test.ts' }]),
    'angular.xml': report([{ file: 'frameworks/angular/build/test/d.test.js' }]),
  });
  try {
    const { problems } = joinReport(root, ['core', 'react', 'arena']);
    assert.equal(problems.filter((one) => /is missing/.test(one)).length, 2, problems.join('\n'));
    assert.match(problems.join('\n'), /react\.xml is missing, and core,react,arena selects the react suite/);
    assert.match(problems.join('\n'), /react-dom\.xml is missing/);
    assert.match(problems.join('\n'), /angular\.xml is a report core,react,arena does not select/);
    assert.match(problems.join('\n'), /no case came from frameworks\/react\//,
      'a selected suite with no report also leaves its tree with no case');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a join with no report directory at all is a missing report per selected suite, never a clean run', () => {
  const root = mkdtempSync(join(tmpdir(), 'summarize-empty-'));
  try {
    const { problems } = joinReport(root, ['core', 'arena']);
    assert.match(problems.join('\n'), /scripts\.xml is missing/);
    assert.match(problems.join('\n'), /reported 0 cases/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('main answers a refused argument with exit 1 before it runs or reads anything', () => {
  const root = mkdtempSync(join(tmpdir(), 'summarize-main-'));
  const errors: string[] = [];
  const original = console.error;
  console.error = (line: string) => { errors.push(String(line)); };
  try {
    assert.equal(main(['--suite=nope'], root), 1);
    assert.equal(main(['--join'], root), 1);
  } finally {
    console.error = original;
    rmSync(root, { recursive: true, force: true });
  }
  assert.equal(errors.length, 2);
  assert.match(errors[0] ?? '', /no suite called "nope"/);
});

test('main joins the reports under the root it is given and exits by what it found', () => {
  const root = junitRoot({ 'scripts.xml': report([{ file: 'scripts/lib/arena/a.test.ts' }]) });
  const lines: string[] = [];
  const [log, error] = [console.log, console.error];
  console.log = (line: string) => { lines.push(String(line)); };
  console.error = (line: string) => { lines.push(String(line)); };
  const sink = process.env['GITHUB_STEP_SUMMARY'];
  delete process.env['GITHUB_STEP_SUMMARY'];
  try {
    assert.equal(main(['--join', '--domains=core,arena'], root), 0);
    assert.equal(main(['--join', '--domains=core,react,arena'], root), 1);
  } finally {
    [console.log, console.error] = [log, error];
    if (sink !== undefined) process.env['GITHUB_STEP_SUMMARY'] = sink;
    rmSync(root, { recursive: true, force: true });
  }
  assert.match(lines.join('\n'), /### Arena test suite/);
  assert.match(lines.join('\n'), /react\.xml is missing/);
});

const FAILED = '<testsuites><testsuite name="a" file="scripts/lib/arena/a.test.ts"><testcase name="x" classname="" '
  + 'file="scripts/lib/arena/a.test.ts"><failure type="AssertionError" /></testcase></testsuite></testsuites>';

test('a join over a report holding a failed case is a problem, so a green join never hides a red suite', () => {
  const root = junitRoot({ 'scripts.xml': FAILED });
  try {
    const { counted, problems } = joinReport(root, ['core', 'arena']);
    assert.equal(counted.total, 1);
    assert.match(problems.join('\n'), /domain arena reported 1 failed case/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const clean = junitRoot({ 'scripts.xml': report([{ file: 'scripts/lib/arena/a.test.ts' }]) });
  try {
    assert.deepEqual(joinReport(clean, ['core', 'arena']).problems.filter((one) => /failed case/.test(one)), []);
  } finally {
    rmSync(clean, { recursive: true, force: true });
  }
});

function quietly<T>(run: () => T) {
  const lines: string[] = [];
  const [log, error] = [console.log, console.error];
  console.log = (line: string) => { lines.push(String(line)); };
  console.error = (line: string) => { lines.push(String(line)); };
  try {
    return { result: run(), lines };
  } finally {
    [console.log, console.error] = [log, error];
  }
}

function suiteRoot(body: string) {
  const root = mkdtempSync(join(tmpdir(), 'summarize-suite-'));
  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(join(root, 'scripts', 'x.test.ts'), `import test from 'node:test';\ntest('x', () => { ${body} });\n`);
  return root;
}

test('a suite run exits 1 when a case of it fails and 0 when each passes, and writes its report', () => {
  const failing = suiteRoot("throw new Error('red');");
  const passing = suiteRoot('');
  try {
    assert.equal(quietly(() => main(['--suite=scripts'], failing, 'ignore')).result, 1);
    assert.equal(quietly(() => main(['--suite=scripts'], passing, 'ignore')).result, 0);
    assert.equal(joinReport(failing, ['core', 'arena']).counted.total, 1, 'the failed run still wrote scripts.xml');
  } finally {
    rmSync(failing, { recursive: true, force: true });
    rmSync(passing, { recursive: true, force: true });
  }
});

test('a step that never writes its report is counted as failed and named', () => {
  const root = mkdtempSync(join(tmpdir(), 'summarize-steps-'));
  try {
    const { result, lines } = quietly(() => runJunitSteps([
      { name: 'quiet', args: ['--version'], outfile: '.cache/junit/none.xml' },
      { name: 'red', args: ['-e', 'process.exit(3)'] },
    ], root, 'ignore'));
    assert.equal(result.failed, 2);
    assert.match(lines.join('\n'), /none\.xml is missing after the step/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a run with no argument writes its reports apart from the ones a join reads', () => {
  const outfiles = stepsWithJunit().flatMap((one) => (one.outfile === undefined ? [] : [one.outfile]));
  assert.ok(outfiles.length > 0);
  assert.ok(outfiles.every((one) => /^\.cache[\\/]junit[\\/]all\/suite-\d+\.xml$/.test(one)), outfiles.join(', '));
  const apart = mkdtempSync(join(tmpdir(), 'summarize-apart-'));
  try {
    const script = "require('node:fs').writeFileSync('.cache/junit/all/suite-1.xml', '<testsuites></testsuites>')";
    const { result } = quietly(() => runJunitSteps([{ name: 'w', args: ['-e', script], outfile: '.cache/junit/all/suite-1.xml' }], apart, 'ignore'));
    assert.equal(result.failed, 0, 'the directory of the report is made before the step runs');
  } finally {
    rmSync(apart, { recursive: true, force: true });
  }
  const root = junitRoot({ 'scripts.xml': report([{ file: 'scripts/lib/arena/a.test.ts' }]) });
  try {
    mkdirSync(join(root, '.cache', 'junit', 'all'));
    writeFileSync(join(root, '.cache', 'junit', 'all', 'suite-1.xml'), report([{ file: 'scripts/lib/arena/a.test.ts' }]));
    assert.deepEqual(joinReport(root, ['core', 'arena']).problems, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
