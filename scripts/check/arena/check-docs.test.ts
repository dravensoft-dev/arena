/* Exercises the gate against a temporary tree rather than the repository, so a
 * real file moving does not silently change what these assertions prove. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as docs from './check-docs.ts';
import {
  MAX_DOCUMENT_CHARS, HEADER_MAX_LINES, SIZE_EXEMPT, PROSE_EXEMPT, BANNED_PUNCTUATION,
  SIZE_ALLOWANCE, limitFor, staleAllowanceProblems,
  documentSizeProblems, commentRuleProblems, punctuationProblems, zeroScanProblems,
  isGenerated, allowsHeader, MEMBER_DOC_TREE, SCANNED_TREES, READ_DESPITE_THE_DOT,
  consumerBranchProblems, CONSUMER_LAST_STOP, CONSUMER_INDEX, CONTRIBUTOR_PATHS,
  isConsumerDocument, BRANCH_SWITCH, branchSwitchProblems,
  RULE_OWNERS, CONTRIBUTOR_BRANCH, ruleOwnerProblems, statesRule, CONSUMER_OWN_OUTPUT,
  FOREIGN_CODE, foreignCodeProblems, componentCountProblems,
  COMMENT_RULE_SKIPS, SOURCE_EXTENSIONS,
} from './check-docs.ts';

function tree(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'arena-docs-'));
  for (const [path, body] of Object.entries(files) as [string, string][]) {
    const full = join(root, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

const NO_ALLOWANCE = new Map();

test('a document over the limit is reported with its size', () => {
  const root = tree({ 'README.md': 'x'.repeat(MAX_DOCUMENT_CHARS + 1) });
  const { problems } = documentSizeProblems(root, NO_ALLOWANCE);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /README\.md: 60001 characters/);
  rmSync(root, { recursive: true });
});

test('a document exactly at the limit passes', () => {
  const root = tree({ 'README.md': 'x'.repeat(MAX_DOCUMENT_CHARS) });
  assert.deepEqual(documentSizeProblems(root, NO_ALLOWANCE).problems, []);
  rmSync(root, { recursive: true });
});

test('a dist tree is assembled output and is read by nothing', () => {
  const root = tree({
    'README.md': 'a',
    'frameworks/react/dist/README.md': 'an em dash — lands here, copied from a document that already passed',
    'frameworks/react/dist/ArenaButton.jsx': '// one comment\n// and a second\nexport const a = 1;\n',
  });
  assert.deepEqual(punctuationProblems(root).problems, []);
  assert.deepEqual(commentRuleProblems(root).problems, []);
  assert.equal(documentSizeProblems(root, NO_ALLOWANCE).scanned, 1);
  rmSync(root, { recursive: true });
});

test('both document rules report how many documents they actually read', () => {
  const root = tree({ 'README.md': 'a', 'docs/a.md': 'b', 'x/y/Z.md': 'c', 'notes.txt': 'd' });
  assert.equal(documentSizeProblems(root, NO_ALLOWANCE).scanned, 3);
  assert.equal(punctuationProblems(root).scanned, 3);
  rmSync(root, { recursive: true });
});

test('SIZE_ALLOWANCE is empty, and that emptiness is the claim', () => {
  assert.deepEqual([...SIZE_ALLOWANCE.keys()], []);
  assert.equal(limitFor('AGENTS.md'), MAX_DOCUMENT_CHARS);
  assert.equal(limitFor('scripts/AGENTS.md'), MAX_DOCUMENT_CHARS);
});

test('an allowance raises the limit rather than removing it, so the document is still measured', () => {
  const allowance = new Map([['AGENTS.md', { limit: 65_000, reason: 'the root of the branch, with nowhere above it' }]]);
  const inside = tree({ 'AGENTS.md': 'x'.repeat(64_000) });
  assert.deepEqual(documentSizeProblems(inside, allowance).problems, []);
  rmSync(inside, { recursive: true });

  const over = tree({ 'AGENTS.md': 'x'.repeat(65_001) });
  const problems = documentSizeProblems(over, allowance).problems;
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /AGENTS\.md: 65001 characters, over the 65000 limit/);
  rmSync(over, { recursive: true });
});

test('a document that falls back inside the shared limit fails as a stale allowance', () => {
  const allowance = new Map([['AGENTS.md', { limit: 65_000, reason: 'the root of the branch, with nowhere above it' }]]);
  const root = tree({ 'AGENTS.md': 'x'.repeat(MAX_DOCUMENT_CHARS) });
  const problems = documentSizeProblems(root, allowance).problems;
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /has outlived what it was written for, so delete it/);
  rmSync(root, { recursive: true });
});

test('an allowance for a document that has moved or gone fails too', () => {
  const allowance = new Map([['AGENTS.md', { limit: 65_000, reason: 'the root of the branch, with nowhere above it' }]]);
  assert.match(staleAllowanceProblems(new Map(), allowance)[0] ?? '', /and no document is there/);
});

test('DOUBTS.md and docs/ are exempt from the size limit, and nothing else is', () => {
  const over = 'x'.repeat(MAX_DOCUMENT_CHARS + 1);
  const root = tree({
    'DOUBTS.md': over,
    'docs/superpowers/specs/a.md': over,
    'README.md': over,
  });
  assert.deepEqual(documentSizeProblems(root, NO_ALLOWANCE).problems.map((p) => p.split(':')[0]), ['README.md']);
  assert.deepEqual(SIZE_EXEMPT, ['DOUBTS.md', 'docs/']);
  rmSync(root, { recursive: true });
});

test('an em dash in prose is reported with its position and the whole run', () => {
  const root = tree({ 'README.md': 'The gate — it holds.\n' });
  const { problems } = punctuationProblems(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /README\.md:1:10: an em dash/);
  assert.match(problems[0] ?? '', /The gate — it holds\./);
  rmSync(root, { recursive: true });
});

test('every em dash on a line is reported, not just the first', () => {
  const root = tree({ 'README.md': 'a — b — c\n' });
  assert.equal(punctuationProblems(root).problems.length, 2);
  rmSync(root, { recursive: true });
});

test('an em dash inside a fence or a code span is the document quoting code', () => {
  const root = tree({
    'a.md': '```jsx\n<ArenaRadio hint="Real users — approval" />\n```\n',
    'b.md': 'the token `--a — b` resolves\n',
  });
  assert.deepEqual(punctuationProblems(root).problems, []);
  rmSync(root, { recursive: true });
});

test('a colon, a comma and an en dash between numbers are all fine', () => {
  const root = tree({ 'README.md': 'It holds: one, two. Steps 1–5 run.\n' });
  assert.deepEqual(punctuationProblems(root).problems, []);
  rmSync(root, { recursive: true });
});

test('docs/ is exempt from the punctuation rule and DOUBTS.md is not', () => {
  const root = tree({
    'docs/superpowers/plans/a.md': 'a — b\n',
    'DOUBTS.md': 'a — b\n',
    'README.md': 'a — b\n',
  });
  const { problems } = punctuationProblems(root);
  assert.equal(problems.length, 2);
  assert.ok(problems.some((p) => p.startsWith('DOUBTS.md')));
  assert.ok(problems.some((p) => p.startsWith('README.md')));
  rmSync(root, { recursive: true });
});

test('the two maps the punctuation rule reads are asserted by name', () => {
  assert.deepEqual(Object.keys(PROSE_EXEMPT), ['docs/']);
  for (const reason of Object.values(PROSE_EXEMPT)) assert.match(reason, /\w/);
  assert.deepEqual(BANNED_PUNCTUATION, [['—', 'an em dash']]);
});

test('a framework source carrying any comment is a problem', () => {
  const root = tree({ 'frameworks/react/components/a/A.jsx': '// nope\nexport const A = 1;\n' });
  const { problems } = commentRuleProblems(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /only scripts and tests may/);
  rmSync(root, { recursive: true });
});

test('a framework source with no comments passes', () => {
  const root = tree({ 'frameworks/react/components/a/A.jsx': 'export const A = 1;\n' });
  assert.deepEqual(commentRuleProblems(root).problems, []);
  rmSync(root, { recursive: true });
});

test('a script may carry one header, and a second comment is a problem', () => {
  const root = tree({ 'scripts/a.mjs': '/* header */\nconst a = 1;\n// second\n' });
  const { problems } = commentRuleProblems(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /a second comment/);
  rmSync(root, { recursive: true });
});

test('a header over the line limit is reported with its length', () => {
  const header = `/*${'\n *'.repeat(HEADER_MAX_LINES)} */`;
  const root = tree({ 'scripts/a.mjs': `${header}\nconst a = 1;\n` });
  const { problems } = commentRuleProblems(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', new RegExp(`header is ${HEADER_MAX_LINES + 1} lines`));
  rmSync(root, { recursive: true });
});

test("a script's one comment must be the header, not buried mid-file", () => {
  const root = tree({ 'scripts/a.mjs': 'const a = 1;\n// late\n' });
  const { problems } = commentRuleProblems(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /must be the file header/);
  rmSync(root, { recursive: true });
});

test('a test file gets the header allowance wherever it sits', () => {
  const root = tree({
    'frameworks/react/components/a/A.test.jsx': '/* header */\nconst a = 1;\n',
    'frameworks/angular/test/Harness.ts': '/* header */\nconst b = 1;\n',
  });
  assert.deepEqual(commentRuleProblems(root).problems, []);
  rmSync(root, { recursive: true });
});

test('a @ts- pragma is a directive, not the file\'s one allowed comment', () => {
  const root = tree({
    'frameworks/angular/components/a/A.ts': '// @ts-expect-error -- needed\nconst a = 1;\n',
  });
  assert.deepEqual(commentRuleProblems(root).problems, []);
  rmSync(root, { recursive: true });
});

test('a generated file is never read, however many comments it carries', () => {
  const root = tree({
    'frameworks/react/Tokens.generated.js': '// one\n// two\nexport const a = 1;\n',
    'frameworks/tailwind/components/a/A.manifest.generated.ts': '// one\nexport const a = 1;\n',
    'frameworks/react/components/a/A.generated.js': '// compiled\nexport const A = 1;\n',
    'frameworks/react/vendor/React.generated.js': '// bundled\nexport default 1;\n',
  });
  assert.deepEqual(commentRuleProblems(root).problems, []);
  rmSync(root, { recursive: true });
});

test('a hand-written file is read however loudly its header claims otherwise', () => {
  const root = tree({ 'frameworks/angular/B.ts': '/* GENERATED by build-x.mjs */\nconst b = 1;\n' });
  const { problems } = commentRuleProblems(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /frameworks\/angular\/B\.ts/);
  rmSync(root, { recursive: true });
});

test('the Angular emit is skipped by its anchored path, so the scripts phase directory of the same name is still read', () => {
  const overLong = `/* ${'x\n * '.repeat(HEADER_MAX_LINES + 2)} */\nconst a = 1;\n`;
  const root = tree({
    'frameworks/angular/build/test/Emitted.js': overLong,
    'scripts/build/react/build-demos.ts': overLong,
  });
  const { problems } = commentRuleProblems(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /scripts\/build\/react\/build-demos\.ts/);
  rmSync(root, { recursive: true });
});

test('a dotted entry is skipped, and the two that are read are named rather than guessed at', () => {
  assert.deepEqual([...READ_DESPITE_THE_DOT].sort(), ['.github', '.gitkeep']);
  assert.ok(SCANNED_TREES.includes('.github'), 'a source file under .github is held to the comment rule');
});

test('a document under .github is governed, and one under any other dotted directory is not', () => {
  const root = tree({
    '.github/workflows/README.md': 'A workflow README with an em dash — right here.\n',
    '.claude/settings.md': 'A local note with an em dash — right here.\n',
  });
  const { problems } = punctuationProblems(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /\.github\/workflows\/README\.md/);
  rmSync(root, { recursive: true });
});

test('a document under .github is held to the size limit too', () => {
  const root = tree({ '.github/workflows/README.md': 'x'.repeat(MAX_DOCUMENT_CHARS + 1) });
  const { problems } = documentSizeProblems(root, NO_ALLOWANCE);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /\.github\/workflows\/README\.md: 60001 characters/);
  rmSync(root, { recursive: true });
});

test('isGenerated reads the name and nothing else', () => {
  assert.equal(isGenerated('a/B.generated.ts'), true);
  assert.equal(isGenerated('a/B.manifest.generated.ts'), true);
  assert.equal(isGenerated('a/B.card.entry.generated.js'), true);
  assert.equal(isGenerated('a/B.ts'), false);
  assert.equal(isGenerated('a/B.manifest.ts'), false);
});

test('a generator is not its own output, and content never overrides the name', () => {
  assert.equal(isGenerated.length, 1,
    'it reads the name and nothing else: a second parameter would be the door content needs '
    + 'to override the name, which is the defect this test is named after');
  assert.equal(isGenerated('scripts/x.mjs'), false);
  assert.equal(isGenerated('a/B.ts'), false);
  assert.equal(isGenerated('a/B.generated.ts'), true);
});

test('allowsHeader covers scripts, a .test. infix and a test/ directory', () => {
  assert.equal(allowsHeader('scripts/a.mjs'), true);
  assert.equal(allowsHeader('frameworks/react/a/A.test.jsx'), true);
  assert.equal(allowsHeader('frameworks/angular/test/Harness.ts'), true);
  assert.equal(allowsHeader('frameworks/react/a/A.jsx'), false);
});

test('a walk that reaches nothing is a failure, not a vacuous pass', () => {
  assert.deepEqual(zeroScanProblems({ documents: 1, sources: 1, prompts: 1 }), []);
  assert.match(zeroScanProblems({ documents: 0, sources: 1, prompts: 1 })[0] ?? '', /no \.md files at all/);
  assert.match(zeroScanProblems({ documents: 1, sources: 0, prompts: 1 })[0] ?? '', /no source files at all/);
  assert.match(zeroScanProblems({ documents: 1, sources: 1, prompts: 0 })[0] ?? '', /no \.prompt\.md files at all/);
  assert.equal(zeroScanProblems({ documents: 0, sources: 0, prompts: 0 }).length, 3);
});

test('a prompt citing a contributor path is a problem, and each hit is named', () => {
  const root = tree({
    'frameworks/react/components/a/A.prompt.md':
      'It is a member because R6 in `contracts/api/AGENTS.md` forbids it, and\n'
      + '`IMPERATIVE_HANDLES` in `scripts/lib/arena/api-surface.ts` allows the two.\n',
  });
  const { problems } = consumerBranchProblems(root);
  assert.equal(problems.length, 2);
  assert.ok(problems.some((p) => p.includes('contracts/api/AGENTS.md')));
  assert.ok(problems.some((p) => p.includes('scripts/lib/arena/api-surface.ts')));
  for (const problem of problems) assert.match(problem, /leave the reason on the contributor branch/);
  rmSync(root, { recursive: true });
});

test('a layer README, the packaging document and a layer-root source are contributor paths too', () => {
  const root = tree({
    'frameworks/angular/components/a/A.prompt.md':
      'See `frameworks/angular/AGENTS.md`, `frameworks/PACKAGING.md` and `frameworks/angular/FocusTrap.ts`.\n',
  });
  const { problems } = consumerBranchProblems(root);
  assert.equal(problems.length, 3);
  assert.ok(problems.some((p) => p.includes('FocusTrap.ts')),
    'a layer-root source is reached by importing the package, so naming its path sends a consumer nowhere');
  rmSync(root, { recursive: true });
});

test('a repository artefact is a contributor path too, wherever in the tree it sits', () => {
  const root = tree({
    'frameworks/angular/components/a/A.prompt.md':
      'Styling is `A.variants.ts`, compiled from `A.manifest.json`; `A.compliance.test.ts` pins it,\n'
      + 'and the type comes from `Api.generated.ts`.\n',
  });
  const { problems } = consumerBranchProblems(root);
  assert.equal(problems.length, 4);
  for (const cited of ['A.variants.ts', 'A.manifest.json', 'A.compliance.test.', 'Api.generated']) {
    assert.ok(problems.some((p) => p.includes(cited)), `nothing caught ${cited}`);
  }
  rmSync(root, { recursive: true });
});

test('a generated demo page is the one build product a prompt may name, being what a by-hand check opens', () => {
  const root = tree({
    'frameworks/react/components/a/A.prompt.md': 'Open `A.demo.generated.html` and check the focus ring.\n',
  });
  assert.deepEqual(consumerBranchProblems(root).problems, []);
  rmSync(root, { recursive: true });
});

test('the rule reaches prompts alone, and a sibling of the component is not a contributor path', () => {
  const root = tree({
    'frameworks/react/AGENTS.md': 'Read `scripts/build/react/build-demos.ts` for the emit.\n',
    'frameworks/react/components/a/A.prompt.md':
      'Open `frameworks/react/components/a/A.card.html`, and import from `@dravensoft/arena-react`.\n',
  });
  const { problems, scanned } = consumerBranchProblems(root);
  assert.deepEqual(problems, []);
  assert.equal(scanned, 1, 'only the prompt is read, so a contributor document may cite what it likes');
  rmSync(root, { recursive: true });
});

test('an index under frameworks/ is a consumer document, and the root router is the one that is not', () => {
  assert.equal(isConsumerDocument('frameworks/SKILL.md'), true);
  assert.equal(isConsumerDocument('frameworks/react/SKILL.md'), true);
  assert.equal(isConsumerDocument('frameworks/react/components/a/A.prompt.md'), true);
  assert.equal(isConsumerDocument('SKILL.md'), false,
    'the root router names the contributor branch to send a contributor away');
  assert.equal(isConsumerDocument('frameworks/react/README.md'), false);
  assert.equal(isConsumerDocument('docs/SKILL.md'), false, 'the tree decides, not the name alone');
});

test('an index citing a contributor path fails the same way a prompt does', () => {
  const root = tree({
    'frameworks/react/SKILL.md': 'Emitted by `scripts/generate/arena/generate-skills.ts`.\n',
    'frameworks/react/components/a/A.prompt.md': 'Import from `@dravensoft/arena-react`.\n',
  });
  const { problems, scanned } = consumerBranchProblems(root);
  assert.equal(scanned, 2, 'the index and the prompt are both consumer documents');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /frameworks[\\/]react[\\/]SKILL\.md/);
  rmSync(root, { recursive: true });
});

test('the root router may name the contributor branch, because naming it is how it redirects', () => {
  const root = tree({
    'SKILL.md': 'Do not read `frameworks/PACKAGING.md` to build something.\n',
    'frameworks/react/components/a/A.prompt.md': 'Import from `@dravensoft/arena-react`.\n',
  });
  const { problems } = consumerBranchProblems(root);
  assert.deepEqual(problems, []);
  rmSync(root, { recursive: true });
});

test('an exemption naming a file that is not there is stale, and says so', () => {
  const root = tree({ 'frameworks/react/components/a/A.prompt.md': 'x\n' });
  assert.equal(branchSwitchProblems(root).length, Object.keys(BRANCH_SWITCH).length);
  assert.match(branchSwitchProblems(root)[0] ?? '', /stale exemption/);
  rmSync(root, { recursive: true });
});

test('the boundary reads two file names and a reason-carrying list, all by name', () => {
  assert.equal(CONSUMER_LAST_STOP, '.prompt.md');
  assert.equal(CONSUMER_INDEX, 'SKILL.md');
  assert.deepEqual(Object.keys(BRANCH_SWITCH), ['SKILL.md']);
  for (const reason of Object.values(BRANCH_SWITCH)) assert.match(reason, /\w/);
  assert.equal(CONTRIBUTOR_PATHS.length, 9);
  for (const [pattern, reason] of CONTRIBUTOR_PATHS as [RegExp, string][]) {
    assert.ok(pattern.global, 'a non-global pattern reports only the first hit on a page');
    assert.match(reason, /\w/);
  }
});

test('a shebang may precede the header, because a bin entry point is run by the shell', () => {
  const root = tree({
    'scripts/run.mjs': '#!/usr/bin/env node\n/* what this command does */\nexport const a = 1;\n',
  });
  assert.deepEqual(commentRuleProblems(root).problems, []);
  rmSync(root, { recursive: true });
});

test('a shebang buys no second comment, and no comment below the header', () => {
  const root = tree({
    'scripts/run.mjs': '#!/usr/bin/env node\nexport const a = 1;\n/* not the header */\n',
  });
  assert.equal(commentRuleProblems(root).problems.length, 1);
  rmSync(root, { recursive: true });
});

test('a member doc under a component directory is not a comment this rule counts', () => {
  const root = tree({
    'frameworks/react/components/a/A.tsx':
      'export interface AProps {\n  /** The shadow. */\n  floating?: boolean;\n}\n',
  });
  assert.deepEqual(commentRuleProblems(root).problems, [],
    'a contract-derived member doc must pass: check:api holds it equal to the contract, which is '
    + 'the whole reason it is allowed where a hand-written note is not');
  rmSync(root, { recursive: true });
});

test('the carve-out is the /** shape only, and only under a component directory', () => {
  const line = tree({
    'frameworks/react/components/a/A.tsx': '// a hand-written note\nexport const A = 1;\n',
  });
  assert.equal(commentRuleProblems(line).problems.length, 1, 'a // comment slipped through the carve-out');
  rmSync(line, { recursive: true });

  const block = tree({
    'frameworks/react/components/a/A.tsx': '/* a hand-written note */\nexport const A = 1;\n',
  });
  assert.equal(commentRuleProblems(block).problems.length, 1, 'a /* comment slipped through the carve-out');
  rmSync(block, { recursive: true });

  const root = tree({ 'frameworks/react/Theme.ts': '/** Not a member. */\nexport const T = 1;\n' });
  assert.equal(commentRuleProblems(root).problems.length, 1,
    'the carve-out reached a layer-root file, where no contract member lives and nothing holds a doc');
  rmSync(root, { recursive: true });

  assert.match('frameworks/angular/components/display/arena-card/ArenaCard.ts', MEMBER_DOC_TREE);
  assert.doesNotMatch('frameworks/react/Theme.ts', MEMBER_DOC_TREE);
});

test('a rule may be registered as a family, not only as one phrase', () => {
  assert.equal(statesRule('none of the nine forms is imperative', 'the nine forms'), true);
  assert.equal(statesRule('an R6 violation', /\bR[1-6]\b/), true);
  assert.equal(statesRule('an ArenaRadio inside an ArenaRadioGroup', /\bR[1-6]\b/), false);
  assert.equal(statesRule('run `check:dimensions` after', /\bcheck:[a-z-]+/), true);
});

test('RULE_OWNERS names each rule, its branch and why, and every entry is contributor-owned today', () => {
  assert.deepEqual(RULE_OWNERS.map((r) => String(r.phrase)),
    ['the nine forms', 'binding table', '/\\bR[1-6]\\b/', '/\\bcheck:[a-z-]+/']);
  for (const { owner, reason } of RULE_OWNERS) {
    assert.equal(owner, CONTRIBUTOR_BRANCH);
    assert.ok(reason.length > 60, 'an entry states its reason');
  }
});

test('a contributor rule stated in a prompt is a problem, which is the leak that reached a .d.ts', () => {
  const root = tree({
    'contracts/api/AGENTS.md': 'A member is one of the nine forms.',
    'frameworks/react/components/a/A.prompt.md': 'A per-item render function is not one of the nine forms.',
  });
  const owners = [{ phrase: 'the nine forms', owner: CONTRIBUTOR_BRANCH, reason: 'the API contract vocabulary, which a consumer never needs' }];
  const problems = ruleOwnerProblems(root, owners);
  assert.equal(problems.length, 1, 'the owning document keeps the entry live, so only the leak is reported');
  assert.match(problems[0] ?? '', /states "the nine forms", a contributor rule, on the consumer branch/);
  rmSync(root, { recursive: true });
});

test('the same rule on its own branch passes, so the register is about the branch and not the phrase', () => {
  const root = tree({ 'contracts/api/AGENTS.md': 'A member is one of the nine forms.' });
  const owners = [{ phrase: 'the nine forms', owner: CONTRIBUTOR_BRANCH, reason: 'the API contract vocabulary, which a consumer never needs' }];
  assert.deepEqual(ruleOwnerProblems(root, owners), []);
  rmSync(root, { recursive: true });
});

test('an entry no document on its own branch states fails as a stale registration', () => {
  const root = tree({ 'AGENTS.md': 'nothing relevant here' });
  const owners = [{ phrase: 'check:retired', owner: CONTRIBUTOR_BRANCH, reason: 'a gate nobody consuming a package can run, so no prompt should cite it' }];
  const problems = ruleOwnerProblems(root, owners);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /outlived the rule it was written for/);
  rmSync(root, { recursive: true });
});

test('a consumer output is allowed by its whole name, so a build product of this repository still fails', () => {
  const root = tree({
    'frameworks/react/PACKAGE.md': 'Import ./icons.generated.css beside ./arena.generated.css.',
    'frameworks/angular/PACKAGE.md': 'Import ./Tokens.generated.ts, which is ours and not theirs.',
  });
  const { problems } = consumerBranchProblems(root);
  assert.equal(problems.length, 1, 'both names a consumer writes are allowed, and the one they never see is not');
  assert.match(problems[0] ?? '', /Tokens\.generated/);
  rmSync(root, { recursive: true });
});

test('every allowed consumer output carries a reason, because a bare exemption cannot be argued with', () => {
  assert.ok(CONSUMER_OWN_OUTPUT.size > 0);
  for (const [name, reason] of CONSUMER_OWN_OUTPUT) {
    assert.match(name, /\.generated\.[a-z]+$/, `${name} is registered and is not a generated name`);
    assert.ok(reason.includes('CONSUMER'), `${name} is registered with no statement of whose output it is`);
  }
});

test('a fenced example writing Angular Material fails, and every hit is reported', () => {
  const root = tree({
    'frameworks/angular/components/a/A.prompt.md':
      '```html\n<button actions mat-flat-button>Go</button>\n<input matInput />\n```\n',
  });
  const { problems } = foreignCodeProblems(root);
  assert.equal(problems.length, 2);
  assert.ok(problems.some((p) => p.includes('"mat-flat-button"')));
  assert.ok(problems.some((p) => p.includes('"matInput"')));
  for (const problem of problems) assert.match(problem, /the half a reader copies/);
  rmSync(root, { recursive: true });
});

test('prose naming Angular Material to refuse it passes, which is the whole point of the split', () => {
  const root = tree({
    'frameworks/angular/components/a/A.prompt.md':
      'Don\'t use this for a routine question: that is `MatDialog` wearing Arena.\n'
      + '```html\n<arena-confirm-dialog title="Delete" />\n```\n',
  });
  assert.deepEqual(foreignCodeProblems(root).problems, []);
  rmSync(root, { recursive: true });
});

test('a contributor document is not scanned for foreign code, because nobody copies an example it does not have', () => {
  const root = tree({ 'frameworks/angular/AGENTS.md': '```html\n<button mat-flat-button>Go</button>\n```\n' });
  const { problems, scanned } = foreignCodeProblems(root);
  assert.deepEqual(problems, []);
  assert.equal(scanned, 0);
  rmSync(root, { recursive: true });
});

test('every FOREIGN_CODE entry carries a global pattern and a reason', () => {
  assert.equal(FOREIGN_CODE.length, 1);
  for (const [pattern, reason] of FOREIGN_CODE as [RegExp, string][]) {
    assert.ok(pattern instanceof RegExp);
    assert.ok(pattern.global, 'a non-global pattern reports only the first hit on a line');
    assert.ok(reason.length > 40, 'an entry without its reason is a rule nobody can weigh');
  }
});

const ROSTER = JSON.stringify({ display: ['ArenaCard', 'ArenaBadge'], forms: ['ArenaButton'] });

test('a package page whose count matches the declared roster passes', () => {
  const root = tree({
    'frameworks/Components.json': ROSTER,
    'frameworks/react/PACKAGE.md': 'its React layer: 3 components whose every value is a token.\n',
  });
  const { problems, shipped } = componentCountProblems(root);
  assert.deepEqual(problems, []);
  assert.equal(shipped, 3);
  rmSync(root, { recursive: true });
});

test('a stale count fails, naming both numbers', () => {
  const root = tree({
    'frameworks/Components.json': ROSTER,
    'frameworks/angular/PACKAGE.md': 'its Angular layer: 50 components, standalone and OnPush.\n',
  });
  const { problems } = componentCountProblems(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /claims 50 components and Components.json declares 3/);
  rmSync(root, { recursive: true });
});

test('a package page stating no count at all fails, and is told what to write', () => {
  const root = tree({
    'frameworks/Components.json': ROSTER,
    'frameworks/react/PACKAGE.md': 'its React layer: every value traces to a design token.\n',
  });
  const { problems } = componentCountProblems(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /Write "3 components"/);
  rmSync(root, { recursive: true });
});

test('finding no package page at all is a failure rather than a vacuous pass', () => {
  const root = tree({ 'frameworks/Components.json': ROSTER });
  const { problems, scanned } = componentCountProblems(root);
  assert.equal(scanned, 0);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /empty walk is a failure/);
  rmSync(root, { recursive: true });
});

test('the comment rule skips the two extensions whose comments carry a reason nothing else can', () => {
  assert.deepEqual([...COMMENT_RULE_SKIPS.keys()], ['.css', '.html']);
  for (const [ext, why] of COMMENT_RULE_SKIPS)
    assert.ok(why.length > 80, `${ext} says why the rule does not reach it`);
  for (const ext of COMMENT_RULE_SKIPS.keys())
    assert.ok(!SOURCE_EXTENSIONS.includes(ext),
      `${ext} is excluded by decision, so the scan must not carry it as well`);
});

test('no document offers a voice catalogue', () => {
  for (const name of ['voiceCatalogueProblems', 'VOICE_PAGE_CLAIM', 'NOT_A_VOICE']) {
    assert.ok(!Object.keys(docs).includes(name),
      `check-docs still exports ${name}, and a page held to a catalogue is a page held to a `
      + 'decision Arena took for somebody else');
  }
});
