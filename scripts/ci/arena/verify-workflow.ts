/* What verify.yml runs, read off the workflow itself, so no list of CI jobs is kept beside it to
 * drift. The gates job takes the domains its caller selects whole, each suite runs in one job
 * whose if names the domain that selects it, one job joins their reports, and every caller of the
 * workflow says which domains it selects. A shape this reader cannot follow is a problem, never a
 * job or a suite it skipped. */

import { declaredNeeds, jobBlocks, jobShapeProblems } from '../../check/arena/check-portability.ts';

export const VERIFY_WORKFLOW = '.github/workflows/verify.yml';
export const VERIFY_USES = './.github/workflows/verify.yml';
export const CHECK_ALL = 'scripts/check/arena/check-all.ts';

const DOMAINS_ENV = /^\s+DOMAINS:[ \t]*\$\{\{[ \t]*inputs\.domains[ \t]*\}\}[ \t]*$/m;
const DOMAIN_IF = /^ {4}if:[ \t]*(?:\$\{\{[ \t]*)?contains\(format\(',\{0\},', inputs\.domains\), ',([a-z-]+),'\)(?:[ \t]*\}\})?[ \t]*$/;
const ALWAYS_IF = /^ {4}if:[ \t]*(?:\$\{\{[ \t]*)?!cancelled\(\)(?:[ \t]*\}\})?[ \t]*$/;
const ANY_IF = /^ {4}if:/;
const STEP_IF = /^(?: {8}| {6}- )if:[ \t]*(.*?)[ \t]*$/m;
const field = (unit: string, key: string) => new RegExp(`^\\s+${key}:[ \\t]*(.*?)[ \\t]*$`, 'm').exec(unit)?.[1]
  ?.replace(/[ \t]*#.*$/, '').replace(/^(['"])(.*)\1$/, '$2');
const ALWAYS_VALUE = /^(?:\$\{\{[ \t]*)?!cancelled\(\)(?:[ \t]*\}\})?$/;

export type Selection = {
  gates: string[];
  suites: Map<string, { job: string; domain: string | null }>;
  joins: string[];
  problems: string[];
};

export function runCommands(block: string) {
  const lines = block.split('\n');
  const commands: string[] = [];
  lines.forEach((line, at) => {
    const run = /^(\s*(?:-\s+)?)run:[ \t]*(.*?)[ \t]*$/.exec(line);
    if (!run) return;
    const value = run[2] ?? '';
    if (!/^[|>][-+]?\d*$/.test(value)) {
      commands.push(value);
      return;
    }
    const column = (run[1] ?? '').length;
    const body = [];
    for (let next = at + 1; next < lines.length; next += 1) {
      const text = lines[next] ?? '';
      if (text.trim() !== '' && text.length - text.trimStart().length <= column) break;
      body.push(text.trim());
    }
    commands.push(body.join('\n').trim());
  });
  return commands;
}

function jobDomain(job: string, block: string, problems: string[]) {
  const line = block.split('\n').find((one) => ANY_IF.test(one));
  if (line === undefined || ALWAYS_IF.test(line)) return null;
  const domain = DOMAIN_IF.exec(line)?.[1];
  if (domain === undefined) {
    problems.push(`${VERIFY_WORKFLOW}: job ${job} has an if: this reader cannot follow (${line.trim()}), so which `
      + "domain selects it is unknown; write contains(format(',{0},', inputs.domains), ',<domain>,')");
    return null;
  }
  return domain;
}

export function verifySelection(text: string): Selection {
  const problems = [...jobShapeProblems(VERIFY_WORKFLOW, text)];
  const gates: string[] = [];
  const joins: string[] = [];
  const suites = new Map<string, { job: string; domain: string | null }>();

  const blocks = jobBlocks(text);
  const domains = new Map([...blocks].map(([job, block]) => [job, jobDomain(job, block, problems)]));
  const units = [...blocks].flatMap(([job, block]) => {
    const [head = '', ...steps] = block.split(/^(?= {6}- )/m);
    return [head, ...steps].map((unit) => ({ job, head, unit }));
  });

  const suiteCount = new Map<string, number>();
  for (const { job, head, unit } of units) {
    const domain = domains.get(job) ?? null;
    const fromInput = DOMAINS_ENV.test(head) || DOMAINS_ENV.test(unit);
    const stepIf = STEP_IF.exec(unit)?.[1];
    let counted = false;
    let suiteInUnit = false;
    for (const command of runCommands(unit).flatMap((one) => one.split('\n'))) {
      if (command.includes(CHECK_ALL)) {
        counted = true;
        gates.push(job);
        if (!/(?:^|\s)--no-tests(?:\s|$)/.test(command)) {
          problems.push(`${VERIFY_WORKFLOW}: job ${job} runs check-all without --no-tests, so the suites run twice, `
            + 'once there and once in their own jobs');
        }
        if (!command.includes('--domain="$DOMAINS"') || !fromInput) {
          problems.push(`${VERIFY_WORKFLOW}: job ${job} runs check-all on domains other than the ones its caller `
            + 'selects; pass --domain="$DOMAINS" with DOMAINS: ${{ inputs.domains }}');
        }
        continue;
      }
      const raw = /\bbun\s+run\s+ci:summarize\s+--suite=(\S+)/.exec(command)?.[1];
      const suite = raw?.replace(/^(['"])(.*)\1$/, '$2');
      if (suite !== undefined && /['"]/.test(suite)) {
        problems.push(`${VERIFY_WORKFLOW}: job ${job} names the suite ${raw} with a quote this reader cannot follow; `
          + 'write --suite=<name> or the name in balanced quotes');
        continue;
      }
      if (suite !== undefined) {
        const before = suiteCount.get(job) ?? 0;
        suiteCount.set(job, before + 1);
        if (counted && suiteInUnit) {
          problems.push(`${VERIFY_WORKFLOW}: job ${job} runs two suites in one step, so a red first one skips `
            + 'the second; each suite is a step of its own');
        } else if (before > 0 && (stepIf === undefined || !ALWAYS_VALUE.test(stepIf))) {
          problems.push(`${VERIFY_WORKFLOW}: suite ${suite} of ${job} runs after another suite in a step without `
            + 'if: ${{ !cancelled() }}, so a red first suite skips it and its report never reaches the join');
        }
        suiteInUnit = true;
        counted = true;
        const seen = suites.get(suite);
        if (seen) problems.push(`${VERIFY_WORKFLOW}: the ${suite} suite runs in ${seen.job} and in ${job}`);
        else suites.set(suite, { job, domain });
        continue;
      }
      if (/\bbun\s+run\s+ci:summarize\s+--join\b/.test(command)) {
        counted = true;
        joins.push(job);
        if (!command.includes('--domains="$DOMAINS"') || !fromInput) {
          problems.push(`${VERIFY_WORKFLOW}: job ${job} joins the reports against domains other than the ones its `
            + 'caller selects; pass --domains="$DOMAINS" with DOMAINS: ${{ inputs.domains }}');
        }
        continue;
      }
      if (/\bbun\s+run\s+(?:test|test:\S+|ci:summarize)(?:\s|$)/.test(command)) {
        problems.push(`${VERIFY_WORKFLOW}: job ${job} runs "${command}", which reports no junit of its own to the `
          + 'join; a suite runs through bun run ci:summarize --suite=<name>');
      }
    }
    if (counted && stepIf !== undefined && !ALWAYS_VALUE.test(stepIf)) {
      problems.push(`${VERIFY_WORKFLOW}: a step of ${job} carries an if: (${stepIf}) and runs the gates, a suite or `
        + 'the join, which a caller then skips with nothing red; the only if: such a step takes is !cancelled()');
    }
  }

  const suiteJobs = new Set([...suites.values()].map((one) => one.job));
  const needed = new Set<string>();
  for (const job of [...gates, ...suiteJobs]) {
    const declared = declaredNeeds(blocks.get(job) ?? '');
    if (declared === null) {
      problems.push(`${VERIFY_WORKFLOW}: job ${job} has a needs this reader cannot follow, so which jobs it `
        + 'waits for is unknown; write it as [a, b], as one name, or as a list of - name lines');
      continue;
    }
    for (const one of declared) if (!suiteJobs.has(one)) needed.add(one);
  }
  for (const job of new Set([...gates, ...needed])) {
    const line = (blocks.get(job) ?? '').split('\n').find((one) => ANY_IF.test(one));
    if (line !== undefined) {
      problems.push(`${VERIFY_WORKFLOW}: job ${job} carries an if: (${line.trim()}), and the gates and the job `
        + 'that builds for them run for every caller, or a domain goes unverified with nothing red');
    }
  }
  for (const job of joins) {
    const download = units.find((one) => one.job === job && /^\s*(?:-\s+)?uses:\s*actions\/download-artifact@/m.test(one.unit));
    const wanted = { pattern: 'junit-*', path: '.cache/junit', 'merge-multiple': 'true' };
    for (const [key, value] of Object.entries(wanted)) {
      if (download === undefined || field(download.unit, key) !== value) {
        problems.push(`${VERIFY_WORKFLOW}: join job ${job} downloads the reports without ${key}: ${value}, so `
          + 'the reports do not land side by side in the directory the join reads');
      }
    }
    const line = (blocks.get(job) ?? '').split('\n').find((one) => ANY_IF.test(one));
    if (line === undefined || !ALWAYS_IF.test(line)) {
      problems.push(`${VERIFY_WORKFLOW}: join job ${job} must run whatever the suites did, or a red or skipped `
        + 'suite hides the missing-report rule; write if: ${{ !cancelled() }}');
    }
  }
  if (gates.length !== 1) {
    problems.push(`${VERIFY_WORKFLOW}: ${gates.length} job(s) run check-all (${gates.join(', ') || 'none'}), and `
      + 'the gates run side by side in one job, so a gate runs once or not at all');
  }
  if (joins.length !== 1) {
    problems.push(`${VERIFY_WORKFLOW}: ${joins.length} job(s) join the suite reports, and one table per run is the `
      + 'count that says every selected suite reported');
  }
  if (suites.size === 0) problems.push(`${VERIFY_WORKFLOW}: no job runs a suite, so nothing below tested anything`);
  return { gates, suites, joins, problems };
}

export type Caller = { file: string; job: string; domains: string };

export function callerSelections(workflows: { file: string; text: string }[]) {
  const callers: Caller[] = [];
  const problems: string[] = [];
  for (const { file, text } of workflows) {
    for (const [job, block] of jobBlocks(text)) {
      const lines = block.split('\n');
      const named = lines.filter((line) => /^\s*uses:.*\bverify\.ya?ml\b/.test(line));
      if (named.length === 0) continue;
      if (!named.every((line) => line === `    uses: ${VERIFY_USES}`)) {
        problems.push(`${file}: job ${job} names verify.yml in a shape this reader cannot follow (${named[0]?.trim()}); `
          + `a caller is a job whose uses: is ${VERIFY_USES}, two spaces under the job`);
        continue;
      }
      const domains = lines.map((line) => /^ {6}domains:[ \t]*(.*?)[ \t]*$/.exec(line)?.[1]).find((one) => one !== undefined);
      if (domains === undefined || domains === '') {
        problems.push(`${file}: job ${job} calls verify.yml with no domains: under with:, so nothing says what it verifies`);
        continue;
      }
      callers.push({ file, job, domains: domains.replace(/^(['"])(.*)\1$/, '$2') });
    }
  }
  if (callers.length === 0 && problems.length === 0) {
    problems.push(`no workflow calls ${VERIFY_USES}, so nothing it runs is ever run`);
  }
  return { callers, problems };
}
