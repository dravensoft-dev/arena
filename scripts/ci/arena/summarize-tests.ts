/* Runs the test suite the way check-all runs it and reports the result per domain.
 * The invocation is taken from testStep(), never rebuilt: this appends the two junit
 * flags to the steps that are already there and changes nothing else, so check-all
 * stays the single authority and a narrowed run cannot enter through here. A domain
 * that owns suites and reports no case is a failure, because a reporter that dropped
 * them would otherwise print a confident table of zeros. */

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync, appendFileSync, readdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { testStep } from '../../check/arena/check-all.ts';
import { DOMAINS, domainOfTestPath, isSuite } from '../../lib/arena/domains.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { relPosix } from '../../utils/posix-path.ts';

export const REPORT_DIR = join('.cache', 'junit');

export const EXPECTED_ROOTS = [
  'scripts/',
  'frameworks/react/',
  'frameworks/angular/build/test/',
];

export function stepsWithJunit(dir = REPORT_DIR): { name: string; args: string[]; outfile?: string }[] {
  let n = 0;
  return testStep({ isBun: true, testFiles: [] }).map((step) => {
    if (step.args[0] !== 'test') return step;
    n += 1;
    const outfile = `${dir}/suite-${n}.xml`;
    return { ...step, args: [...step.args, '--reporter=junit', `--reporter-outfile=${outfile}`], outfile };
  });
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

function main() {
  mkdirSync(join(repoRoot, REPORT_DIR), { recursive: true });

  let failed = 0;
  const cases = [];
  for (const step of stepsWithJunit()) {
    console.log(`\n> ${step.name}\n`);
    const r = spawnSync(process.execPath, step.args, { stdio: 'inherit', cwd: repoRoot });
    if (r.error || r.status !== 0) failed += 1;
    if (!step.outfile) continue;
    const path = join(repoRoot, step.outfile);
    if (!existsSync(path)) {
      console.error(`summarize-tests: ${step.outfile} was never written, so this step reported nothing`);
      failed += 1;
      continue;
    }
    cases.push(...parseJunit(readFileSync(path, 'utf8')));
  }

  const counted = tally(cases);
  const summary = renderSummary(counted);
  const sink = process.env['GITHUB_STEP_SUMMARY'];
  if (sink) appendFileSync(sink, `${summary}\n`);
  console.log(`\n${summary}`);

  const problems = [];
  if (counted.total === 0) problems.push('the run reported 0 cases, and an empty result set is a failure rather than a clean pass');
  for (const file of counted.unclassified) problems.push(`${file}: belongs to no domain, so its cases are counted nowhere`);
  problems.push(...coverageProblems(counted, suiteDomains(join(repoRoot, 'scripts'))));

  if (problems.length > 0) {
    console.error(`\nsummarize-tests: ${problems.length} problem(s) with the report itself\n`);
    for (const p of problems) console.error(`  ${p}`);
  }
  process.exit(failed > 0 || problems.length > 0 ? 1 : 0);
}

if (isMainModule(import.meta.url)) main();
