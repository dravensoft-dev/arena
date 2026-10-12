/* Runs the test suite the way check-all runs it and reports the result per domain.
 * The invocation is taken from testStep() and suiteSteps(), never rebuilt: this appends the two
 * junit flags to the steps that are already there and changes nothing else, so check-all stays
 * the single authority. --suite=<name> runs one suite into .cache/junit/<name>.xml for a job of
 * its own, and --join --domains=<a,b> reads the reports those jobs wrote and holds them to the
 * suites the domains select. A domain that owns suites and reports no case is a failure, and so
 * is a selected suite with no report, because a reporter that dropped them would otherwise print
 * a confident table of zeros. */

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync, appendFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { SUITES, suiteSteps, testStep } from '../../check/arena/check-all.ts';
import { DOMAINS, domainOfTestPath, isSuite } from '../../lib/arena/domains.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { relPosix } from '../../utils/posix-path.ts';

export const REPORT_DIR = join('.cache', 'junit');

export const EXPECTED_ROOTS = [
  'scripts/',
  'frameworks/react/',
  'frameworks/angular/build/test/',
];

export const SUITE_DOMAINS: Record<string, string | null> = {
  scripts: null,
  react: 'react',
  'react-dom': 'react',
  angular: 'angular',
};

export const SUITE_ROOTS: Record<string, string> = {
  scripts: 'scripts/',
  react: 'frameworks/react/',
  'react-dom': 'frameworks/react/',
  angular: 'frameworks/angular/build/test/',
};

type JunitStep = { name: string; args: string[]; outfile?: string };

const withJunit = (steps: { name: string; args: string[] }[], outfileOf: (n: number) => string): JunitStep[] => {
  let n = 0;
  return steps.map((step) => {
    if (step.args[0] !== 'test') return { name: step.name, args: step.args };
    n += 1;
    const outfile = outfileOf(n);
    return { ...step, args: [...step.args, '--reporter=junit', `--reporter-outfile=${outfile}`], outfile };
  });
};

export function stepsWithJunit(dir = `${REPORT_DIR}/all`): JunitStep[] {
  return withJunit(testStep({ isBun: true, testFiles: [] }), (n) => `${dir}/suite-${n}.xml`);
}

export function suiteWithJunit(name: string, dir = REPORT_DIR): JunitStep[] {
  return withJunit(suiteSteps(name), () => `${dir}/${name}.xml`);
}

export function expectedSuites(domains: string[]) {
  return Object.keys(SUITE_DOMAINS).filter((suite) => {
    const domain = SUITE_DOMAINS[suite];
    return domain === null || domain === undefined || domains.includes(domain);
  });
}

export type Mode = { mode: 'all' } | { mode: 'suite'; suite: string } | { mode: 'join'; domains: string[] };

function once(seen: boolean, flag: string) {
  if (seen) throw new Error(`summarize-tests: ${flag} is given twice, and the second would silently replace the first`);
}

export function parseSummarizeArgs(argv: string[]): Mode {
  let suite: string | null = null;
  let joining = false;
  let domains: string[] | null = null;
  for (const arg of argv) {
    if (arg === '--join') { once(joining, arg); joining = true; continue; }
    if (arg.startsWith('--suite=')) { once(suite !== null, '--suite'); suite = arg.slice('--suite='.length); continue; }
    if (arg.startsWith('--domains=')) {
      once(domains !== null, '--domains');
      domains = arg.slice('--domains='.length).split(',').map((one) => one.trim()).filter(Boolean);
      continue;
    }
    throw new Error(`summarize-tests: unrecognised argument "${arg}"; it takes nothing, --suite=<name>, or --join --domains=<a,b>`);
  }
  if (suite !== null && (joining || domains !== null)) {
    throw new Error('summarize-tests: --suite runs one suite and --join reads what several wrote; give one of them');
  }
  if (suite !== null) {
    if (!Object.hasOwn(SUITES, suite) || !Object.hasOwn(SUITE_DOMAINS, suite)) {
      throw new Error(`summarize-tests: no suite called "${suite}"; it takes ${Object.keys(SUITE_DOMAINS).join(', ')}`);
    }
    return { mode: 'suite', suite };
  }
  if (domains !== null && !joining) throw new Error('summarize-tests: --domains says what a --join expects, and is given without --join');
  if (joining) {
    if (domains === null || domains.length === 0) {
      throw new Error('summarize-tests: --join needs --domains=<a,b>, the domains the run selected, or it cannot say which reports are missing');
    }
    const unknown = domains.filter((one) => !DOMAINS.includes(one));
    if (unknown.length > 0) throw new Error(`summarize-tests: no domain called ${unknown.join(', ')}; the domains are ${DOMAINS.join(', ')}`);
    return { mode: 'join', domains };
  }
  return { mode: 'all' };
}

function attribute(chunk: string, name: string) {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(chunk);
  return m ? m[1] : null;
}

export type CaseStatus = 'pass' | 'fail' | 'skip';

export type Tally = { pass: number; fail: number; skip: number };

export function parseJunit(xml: string) {
  const cases: { file: string | null; status: CaseStatus }[] = [];
  for (const suite of String(xml).split('<testsuite ').slice(1)) {
    const suiteFile = attribute(suite.slice(0, suite.indexOf('>')), 'file');
    for (const raw of suite.split('<testcase ').slice(1)) {
      const selfClosing = /^[^>]*\/>/.test(raw);
      const chunk = selfClosing ? raw.slice(0, raw.indexOf('>')) : raw.slice(0, raw.indexOf('</testcase>'));
      const status: CaseStatus = /<failure\b/.test(chunk) ? 'fail' : /<skipped\b/.test(chunk) ? 'skip' : 'pass';
      cases.push({ file: attribute(chunk.slice(0, chunk.indexOf('>') + 1), 'file') ?? suiteFile ?? null, status });
    }
  }
  return cases;
}

export function tally(cases: { file: string | null; status: CaseStatus }[]) {
  const byDomain = new Map<string, Tally>(DOMAINS.map((d: string) => [d, { pass: 0, fail: 0, skip: 0 }]));
  const unclassified = [];
  for (const c of cases) {
    const domain = domainOfTestPath(c.file ?? '');
    if (!domain) { unclassified.push(c.file); continue; }
    const row = byDomain.get(domain);
    if (row) row[c.status] += 1;
  }
  return { byDomain, unclassified, total: cases.length, files: cases.map((c) => c.file) };
}

export function suiteDomains(dir: string) {
  if (!existsSync(dir)) return [];
  const found = new Set<string>();
  for (const full of walkFiles(dir)) {
    if (!isSuite(basename(full))) continue;
    const domain = domainOfTestPath(relPosix(repoRoot, full));
    if (domain) found.add(domain);
  }
  return [...found].sort();
}

export function coverageProblems(
  counted: ReturnType<typeof tally>, expectedDomains: string[], roots = EXPECTED_ROOTS,
) {
  const problems = [];
  for (const domain of expectedDomains) {
    const row = counted.byDomain.get(domain);
    const seen = row ? row.pass + row.fail + row.skip : 0;
    if (seen === 0) {
      problems.push(`domain ${domain} owns suites and reported 0 cases, so the reporter dropped them`);
    }
  }
  for (const root of roots) {
    if (!counted.files.some((f) => String(f).includes(root))) {
      problems.push(`no case came from ${root}, so that tree was never opened by this run`);
    }
  }
  return problems;
}

const rowOf = (counted: ReturnType<typeof tally>, domain: string) =>
  counted.byDomain.get(domain) ?? { pass: 0, fail: 0, skip: 0 };

export function renderSummary(counted: ReturnType<typeof tally>) {
  const rows = DOMAINS.map((domain) => {
    const { pass, fail, skip } = rowOf(counted, domain);
    return `| ${domain} | ${pass} | ${fail} | ${skip} |`;
  });
  const totals = DOMAINS.reduce((acc, d) => {
    const r = rowOf(counted, d);
    return { pass: acc.pass + r.pass, fail: acc.fail + r.fail, skip: acc.skip + r.skip };
  }, { pass: 0, fail: 0, skip: 0 });

  return [
    '### Arena test suite',
    '',
    '| domain | passed | failed | skipped |',
    '| --- | ---: | ---: | ---: |',
    ...rows,
    `| **total** | **${totals.pass}** | **${totals.fail}** | **${totals.skip}** |`,
    '',
  ].join('\n');
}

function report(counted: ReturnType<typeof tally>, problems: string[]) {
  const summary = renderSummary(counted);
  const sink = process.env['GITHUB_STEP_SUMMARY'];
  if (sink) appendFileSync(sink, `${summary}\n`);
  console.log(`\n${summary}`);
  if (problems.length > 0) {
    console.error(`\nsummarize-tests: ${problems.length} problem(s) with the report itself\n`);
    for (const p of problems) console.error(`  ${p}`);
  }
}

function reportProblems(counted: ReturnType<typeof tally>, root: string, roots = EXPECTED_ROOTS) {
  const problems = [];
  if (counted.total === 0) problems.push('the run reported 0 cases, and an empty result set is a failure rather than a clean pass');
  for (const file of counted.unclassified) problems.push(`${file}: belongs to no domain, so its cases are counted nowhere`);
  problems.push(...coverageProblems(counted, suiteDomains(join(root, 'scripts')), roots));
  return problems;
}

export function runJunitSteps(steps: JunitStep[], root: string, stdio: 'inherit' | 'ignore' = 'inherit') {
  mkdirSync(join(root, REPORT_DIR), { recursive: true });
  let failed = 0;
  const cases = [];
  for (const step of steps) {
    console.log(`\n> ${step.name}\n`);
    if (step.outfile) mkdirSync(dirname(join(root, step.outfile)), { recursive: true });
    const r = spawnSync(process.execPath, step.args, { stdio, cwd: root });
    if (r.error || r.status !== 0) failed += 1;
    if (!step.outfile) continue;
    const path = join(root, step.outfile);
    if (!existsSync(path)) {
      console.error(`summarize-tests: ${step.outfile} is missing after the step, so it reported nothing`);
      failed += 1;
      continue;
    }
    cases.push(...parseJunit(readFileSync(path, 'utf8')));
  }
  return { failed, cases };
}

export function joinReport(root: string, domains: string[], dir = REPORT_DIR) {
  const expected = expectedSuites(domains);
  const present = existsSync(join(root, dir))
    ? readdirSync(join(root, dir)).filter((name) => name.endsWith('.xml')).map((name) => name.slice(0, -'.xml'.length)).sort()
    : [];
  const problems = [];
  const cases = [];
  for (const suite of expected) {
    if (!present.includes(suite)) {
      problems.push(`${dir}/${suite}.xml is missing, and ${domains.join(',')} selects the ${suite} suite, so its job reported nothing`);
      continue;
    }
    cases.push(...parseJunit(readFileSync(join(root, dir, `${suite}.xml`), 'utf8')));
  }
  for (const suite of present.filter((one) => !expected.includes(one))) {
    problems.push(`${dir}/${suite}.xml is a report ${domains.join(',')} does not select, so a job ran a suite the routing never asked for`);
  }
  const counted = tally(cases);
  for (const [domain, row] of counted.byDomain) {
    if (row.fail > 0) problems.push(`domain ${domain} reported ${row.fail} failed case(s), so the suite is red`);
  }
  const roots = [...new Set(expected.map((suite) => SUITE_ROOTS[suite] ?? ''))].filter(Boolean);
  return { counted, problems: [...problems, ...reportProblems(counted, root, roots)] };
}

export function main(argv: string[] = process.argv.slice(2), root = repoRoot, stdio: 'inherit' | 'ignore' = 'inherit') {
  let mode;
  try {
    mode = parseSummarizeArgs(argv);
  } catch (err) {
    console.error((err as Error).message);
    return 1;
  }

  if (mode.mode === 'suite') {
    const { failed } = runJunitSteps(suiteWithJunit(mode.suite), root, stdio);
    return failed > 0 ? 1 : 0;
  }

  if (mode.mode === 'join') {
    const { counted, problems } = joinReport(root, mode.domains);
    report(counted, problems);
    return problems.length > 0 ? 1 : 0;
  }

  const { failed, cases } = runJunitSteps(stepsWithJunit(), root, stdio);
  const counted = tally(cases);
  const problems = reportProblems(counted, root);
  report(counted, problems);
  return failed > 0 || problems.length > 0 ? 1 : 0;
}

if (isMainModule(import.meta.url)) process.exit(main());
