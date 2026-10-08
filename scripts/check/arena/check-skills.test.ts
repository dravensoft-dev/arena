import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import {
  skillProblems, firstDifference, zeroDeclarationProblems, trackingProblems, questionProblems,
} from './check-skills.ts';
import { skillTargets } from '../../generate/arena/generate-skills.ts';

test('every committed index matches a fresh emit', () => {
  const { problems } = skillProblems();
  assert.deepEqual(problems, []);
});

test('the gate compared a real result set rather than an empty one', () => {
  const { declared, emitted } = skillProblems();
  assert.ok(declared > 0, 'no component was declared, so a clean pass says nothing');
  assert.equal(emitted, skillTargets().length);
});

test('an untracked index is a problem, because it would reach no clone and no tag', () => {
  const problems = trackingProblems('frameworks/INDEX.md', false);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /reaches no clone and no tag/);
  assert.deepEqual(trackingProblems('frameworks/INDEX.md', true), []);
});

test('an empty declaration is a problem, never a clean run', () => {
  assert.equal(zeroDeclarationProblems(0).length, 1);
  assert.deepEqual(zeroDeclarationProblems(50), []);
});

test('firstDifference names the line, so a stale index says where', () => {
  const at = firstDifference('a\nb\nc', 'a\nX\nc');
  assert.match(at ?? '', /^line 2: committed "X", generated "b"$/);
});

test('firstDifference reports a truncated file rather than reading past its end', () => {
  assert.match(firstDifference('a\nb', 'a') ?? '', /line 2: committed "\(end of file\)", generated "b"/);
});

test('two identical documents differ nowhere', () => {
  assert.equal(firstDifference('a\nb', 'a\nb'), null);
});

test('an untracked tree fails once per index rather than only for the first', () => {
  const { problems } = skillProblems(undefined, new Set());
  assert.equal(problems.filter((p) => p.includes('reaches no clone')).length, skillTargets().length);
});

const manifest = (heading: string, file = 'skills/design/references/install.md') => ({
  'contracts/NPM.md': [{ section: 's', rows: [{ question: 'q?', file, heading }] }],
});

test('a question row naming a heading its file has is not a heading problem', () => {
  const problems = questionProblems(undefined, manifest('How do I install a package?'));
  assert.deepEqual(problems.filter((problem) => problem.includes('no heading')), []);
});

test('a question row naming a heading its file lacks is a problem, so a renamed heading cannot strand a link', () => {
  const problems = questionProblems(undefined, manifest('A heading nobody wrote'));
  assert.equal(problems.filter((problem) => problem.includes('no heading of that file')).length, 1);
});

test('a question row naming a file that does not exist is a problem', () => {
  const problems = questionProblems(undefined, manifest('x', 'skills/design/references/nothing.md'));
  assert.match(problems[0] ?? '', /does not exist/);
});

test('a question row whose file the skill does not link is a problem, and SKILL.md itself is always reachable', () => {
  const base = mkdtempSync(join(tmpdir(), 'questions-'));
  mkdirSync(join(base, 'skills/design/references'), { recursive: true });
  writeFileSync(join(base, 'skills/design/SKILL.md'), '# Arena\n\nSee [a](./references/a.md).\n');
  writeFileSync(join(base, 'skills/design/references/a.md'), '# A\n\n## Linked?\n');
  writeFileSync(join(base, 'skills/design/references/b.md'), '# B\n\n## Unlinked?\n');
  const rows = (file: string, heading: string) => manifest(heading, file);
  assert.deepEqual(questionProblems(base, rows('skills/design/references/a.md', 'Linked?')), []);
  assert.deepEqual(questionProblems(base, rows('skills/design/SKILL.md', 'Arena')), []);
  const unlinked = questionProblems(base, rows('skills/design/references/b.md', 'Unlinked?'));
  assert.equal(unlinked.length, 1);
  assert.match(unlinked[0] ?? '', /is not linked from skills\/design\/SKILL.md/);
});

test('a heading inside a code fence is not a heading', () => {
  const base = mkdtempSync(join(tmpdir(), 'questions-'));
  mkdirSync(join(base, 'skills/design'), { recursive: true });
  writeFileSync(join(base, 'skills/design/SKILL.md'), '# Arena\n\n```sh\n# a comment\n```\n');
  assert.equal(questionProblems(base, manifest('a comment', 'skills/design/SKILL.md')).length, 1);
});

test('a SKILL.md link carrying an anchor links the file, and a repeated heading takes -1 in document order', () => {
  const base = mkdtempSync(join(tmpdir(), 'questions-'));
  mkdirSync(join(base, 'skills/design/references'), { recursive: true });
  writeFileSync(join(base, 'skills/design/SKILL.md'), '# Arena\n\nSee [a](./references/a.md#linked).\n');
  writeFileSync(join(base, 'skills/design/references/a.md'), '# A\n\n## Same\n\n## Same\n');
  const at = (heading: string) => questionProblems(base, manifest(heading, 'skills/design/references/a.md'));
  assert.deepEqual(at('Same'), []);
  assert.equal(at('Same').length, 0);
  assert.equal(questionProblems(base, manifest('Same', 'skills/design/references/a.md')).length, 0);
  const second = { 'contracts/NPM.md': [{ section: 's', rows: [{ question: 'q?', file: 'skills/design/references/a.md', heading: 'Same' }] }] };
  assert.deepEqual(questionProblems(base, second), []);
  assert.equal(questionProblems(base, manifest('Same-2', 'skills/design/references/a.md')).length, 1);
});
