import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collect, heldProblems, shapeProblems, zeroScanProblems, emitProblems, ID,
} from './check-rules.ts';
import { RULES, type LanguageRule } from '../../lib/arena/language-rules.ts';
import { RULE_TAGS } from '../../generate/core/arena-to-prod/audit.ts';
import { TARGETS, MARKED, CONTEXT7 } from '../../generate/arena/generate-rules.ts';

const rule = (over: Partial<LanguageRule> = {}): LanguageRule => ({
  id: 'a-rule', short: 'A rule.', body: 'Its body.', held: null, unheld: 'nothing shows it', ...over,
});

test('this tree states the rules of the language once and claims nothing false about them', () => {
  assert.deepEqual(collect(), []);
});

test('a rule naming a tag the shipped module does not emit is refused', () => {
  assert.deepEqual(heldProblems([rule({ held: 'own-class', unheld: null })]), []);
  const problems = heldProblems([rule({ held: 'invented-tag', unheld: null })]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /emits no such tag/);
});

test('a rule is held or explained, and never both and never neither', () => {
  assert.match(heldProblems([rule({ held: 'emoji', unheld: 'and also this' })])[0] ?? '',
    /is one or the other/);
  assert.match(heldProblems([rule({ held: null, unheld: null })])[0] ?? '',
    /says nothing about why/);
  assert.match(heldProblems([rule({ held: null, unheld: '' })])[0] ?? '',
    /says nothing about why/);
});

test('every rule this tree declares carries one of the two, so the page never guesses', () => {
  for (const one of RULES) {
    assert.equal(one.held === null, one.unheld !== null,
      `${one.id} carries neither shape or both, and the router prints the mark from this field`);
  }
});

test('every tag the shipped module emits is one some rule could name', () => {
  const claimed = new Set(RULES.map((one) => one.held).filter((one) => one !== null));
  for (const tag of claimed) {
    assert.ok((RULE_TAGS as readonly string[]).includes(tag),
      `${tag} is claimed by a rule and the module does not emit it`);
  }
  assert.ok(claimed.size > 0, 'no rule claims a tag, so this checked nothing');
});

test('an identifier is kebab and unique, and a short half stands as a sentence by itself', () => {
  assert.deepEqual(shapeProblems([rule()]), []);
  assert.match(shapeProblems([rule({ id: 'Not Kebab' })])[0] ?? '', /kebab-case/);
  assert.match(shapeProblems([rule(), rule()])[0] ?? '', /declared twice/);
  assert.match(shapeProblems([rule({ short: 'No full stop' })])[0] ?? '', /full stop/);
  assert.equal(ID.test('one-primary'), true);
  assert.equal(ID.test('one_primary'), false);
});

test('the short half of every rule is a sentence Context7 can carry alone', () => {
  for (const one of RULES) assert.match(one.short, /\.$/);
});

test('an empty declaration and an empty target list are failures rather than a quiet pass', () => {
  assert.deepEqual(zeroScanProblems(), []);
  assert.match(zeroScanProblems([])[0] ?? '', /no rule is declared/);
  assert.match(zeroScanProblems(RULES, [])[0] ?? '', /no surface states the rules/);
});

test('the surfaces are the router, the repository page and the Context7 index', () => {
  assert.equal(TARGETS.length, MARKED.length + 1);
  assert.ok(TARGETS.includes(CONTEXT7), 'the index carries no comment syntax and is written whole');
  assert.deepEqual(emitProblems(), [], 'every surface equals a fresh emit on this tree');
});
