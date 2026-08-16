/* The gate reads the real tree, so these drive its pure functions over built trees carrying the
 * mistakes it exists to catch: a declared file nobody wrote, the policy stated twice or not at
 * all, a contact link naming a path the branch does not carry, a stale exclusion, a contributor
 * document Context7 would index, and a rule that has drifted from the router. The last pair is
 * the reason the file exists: neither failure is visible in a browser or in a build. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  OUTWARD, POLICY, CONTRIBUTING, CONFIG, CONTEXT7, ROUTER, CONTRIBUTOR_BASENAMES, unwrapped,
  missingProblems, policyProblems, templateProblems, securityProblems, configProblems,
  context7Problems, zeroScanProblems, markdown, LIMITS,
} from './check-community.ts';

function tree(files: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), 'arena-community-'));
  for (const [rel, text] of Object.entries(files) as [string, string][]) {
    const path = join(base, rel);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, text);
  }
  return base;
}

const LINK = (path: string) => `https://github.com/dravensoft-dev/arena/blob/main/${path}`;

test('OUTWARD names every file a stranger meets, and says why each is there', () => {
  assert.ok(OUTWARD.has(CONTRIBUTING));
  assert.ok(OUTWARD.has(CONTEXT7));
  for (const [rel, reason] of OUTWARD) {
    assert.ok(reason.length > 40, `${rel} carries no reason worth reading`);
  }
});

test('a declared file nobody wrote is a problem, because nothing else would notice it going', () => {
  const base = tree({ 'CONTRIBUTING.md': 'x' });
  const problems = missingProblems(base);
  assert.ok(problems.length > 0);
  assert.ok(problems.every((p) => !p.startsWith(CONTRIBUTING)), 'the one that is there is not reported');
});

test('the policy stated in two documents fails, and stated in none fails too', () => {
  const twice = tree({
    'CONTRIBUTING.md': `Arena ${POLICY}.`,
    'README.md': `Note that Arena ${POLICY}.`,
  });
  assert.equal(policyProblems(twice, markdown(twice)).length, 1);

  const never = tree({ 'CONTRIBUTING.md': 'Arena takes issues.' });
  const problems = policyProblems(never, markdown(never));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /not written down/);
});

test('the policy in CONTRIBUTING.md alone is the shape that passes', () => {
  const base = tree({ 'CONTRIBUTING.md': `Arena ${POLICY}.`, 'README.md': 'Install it.' });
  assert.deepEqual(policyProblems(base, markdown(base)), []);
});

test('a pull request template that routes nobody to the policy is a template that states none', () => {
  const base = tree({ '.github/pull_request_template.md': 'Thanks for the work.' });
  assert.equal(templateProblems(base).length, 1);
  const routed = tree({ '.github/pull_request_template.md': `Read ${CONTRIBUTING} first.` });
  assert.deepEqual(templateProblems(routed), []);
});

test('a security document naming no channel sends a reporter nowhere', () => {
  const base = tree({ 'SECURITY.md': 'Do not open a public issue.' });
  assert.equal(securityProblems(base).length, 1);
  const routed = tree({ 'SECURITY.md': 'Use private vulnerability reporting on this repository.' });
  assert.deepEqual(securityProblems(routed), []);
});

test('the blank issue left on bypasses both forms and every field they ask for', () => {
  const base = tree({ [CONFIG]: 'blank_issues_enabled: true\n' });
  const problems = configProblems(base);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /blank_issues_enabled/);
});

test('a contact link naming a path the branch does not carry answers 404 to the reporter', () => {
  const base = tree({
    [CONFIG]: `blank_issues_enabled: false\ncontact_links:\n  - url: ${LINK('CONTRIBUTING.md')}\n`,
  });
  const problems = configProblems(base);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /404/);

  const resolves = tree({
    [CONFIG]: `blank_issues_enabled: false\ncontact_links:\n  - url: ${LINK('CONTRIBUTING.md')}\n`,
    'CONTRIBUTING.md': 'x',
  });
  assert.deepEqual(configProblems(resolves), []);
});

test('an exclusion covering nothing is stale, whether it names a folder or a file', () => {
  const base = tree({
    [CONTEXT7]: JSON.stringify({ excludeFolders: ['scripts'], excludeFiles: ['AGENTS.md'] }),
    [ROUTER]: '',
  });
  const problems = context7Problems(base);
  assert.equal(problems.length, 2, 'the missing folder and the absent document are both reported');
});

test('a contributor document Context7 would index is the failure this gate exists for', () => {
  const base = tree({
    [CONTEXT7]: JSON.stringify({ excludeFiles: [] }),
    'AGENTS.md': 'contributor reasoning',
    [ROUTER]: '',
  });
  const problems = context7Problems(base);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /no router/);
});

test('a rule the router does not carry has drifted, and rewrapping the router has not', () => {
  const drifted = tree({
    [CONTEXT7]: JSON.stringify({ excludeFiles: [], rules: ['Gradients are fine'] }),
    [ROUTER]: '**No gradients** on any surface.',
  });
  assert.equal(context7Problems(drifted).length, 1);

  const wrapped = tree({
    [CONTEXT7]: JSON.stringify({ excludeFiles: [], rules: ['Icons are Phosphor class-name strings'] }),
    [ROUTER]: '**Icons are Phosphor\nclass-name strings**, never elements.',
  });
  assert.deepEqual(context7Problems(wrapped), [], 'a line break is formatting and never a drift');
});

test('excluding a folder git ignores is coverage the parser never had, since Context7 reads the repository', () => {
  const base = tree({ [CONTEXT7]: JSON.stringify({ excludeFolders: ['docs'] }), [ROUTER]: '' });
  mkdirSync(join(base, 'docs'), { recursive: true });
  const problems = context7Problems(base, new Set(['docs']));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /git ignores it/);
  assert.deepEqual(context7Problems(base, new Set()), [], 'a tracked folder of that name is fine');
});

test('a field over its schema limit fails the whole document, and the claim reports it as something else', () => {
  const over = tree({
    [CONTEXT7]: JSON.stringify({ description: 'x'.repeat(201) }),
    [ROUTER]: '',
  });
  const problems = context7Problems(over, new Set());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /schema allows 200/);

  const inside = tree({ [CONTEXT7]: JSON.stringify({ description: 'x'.repeat(200) }), [ROUTER]: '' });
  assert.deepEqual(context7Problems(inside, new Set()), [], 'the limit itself is allowed');
});

test('every limit the gate holds is one the published schema declares', () => {
  for (const [field, limit] of LIMITS) {
    assert.ok(limit > 0, `${field} carries no limit worth checking`);
  }
  assert.equal(LIMITS.get('description'), 200);
  assert.equal(LIMITS.get('projectTitle'), 100);
});

test('a path in excludeFiles matches nothing, since that field takes a file name', () => {
  const base = tree({
    [CONTEXT7]: JSON.stringify({ excludeFiles: ['contracts/AGENTS.md'] }),
    [ROUTER]: '',
  });
  const problems = context7Problems(base, new Set());
  assert.ok(problems.some((p) => /file name rather than a path/.test(p)));
});

test('one half of the ownership pair claims nothing and reads as a claim that was made', () => {
  const half = tree({ [CONTEXT7]: JSON.stringify({ url: 'https://context7.com/o/r' }), [ROUTER]: '' });
  assert.equal(context7Problems(half, new Set()).length, 1);

  const both = tree({
    [CONTEXT7]: JSON.stringify({ url: 'https://context7.com/o/r', public_key: 'pk_x' }),
    [ROUTER]: '',
  });
  assert.deepEqual(context7Problems(both, new Set()), []);

  const neither = tree({ [CONTEXT7]: JSON.stringify({}), [ROUTER]: '' });
  assert.deepEqual(context7Problems(neither, new Set()), []);
});

test('every contributor basename the gate guards is one the repository actually uses', () => {
  assert.ok(CONTRIBUTOR_BASENAMES.includes('AGENTS.md'));
  assert.ok(CONTRIBUTOR_BASENAMES.includes('DOUBTS.md'));
  assert.equal(new Set(CONTRIBUTOR_BASENAMES).size, CONTRIBUTOR_BASENAMES.length);
});

test('unwrapped flattens a run of whitespace and leaves the words alone', () => {
  assert.equal(unwrapped('a\n  b\tc'), 'a b c');
});

test('an empty walk is a clean-looking pass over a tree nobody opened', () => {
  assert.equal(zeroScanProblems([]).length, 1);
  assert.deepEqual(zeroScanProblems([`${ROUTER}`]), []);
});
