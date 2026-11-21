import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collect, heldProblems, shapeProblems, zeroScanProblems, emitProblems, ID,
} from './check-rules.ts';
import { RULES, reportedMark, type LanguageRule } from '../../lib/arena/language-rules.ts';
import { RULE_DESCRIPTIONS } from '../../generate/core/arena-cli/audit.ts';
import { TARGETS, MARKED, CONTEXT7 } from '../../generate/arena/generate-rules.ts';

const rule = (over: Partial<LanguageRule> = {}): LanguageRule => ({
  id: 'a-rule', short: 'A rule.', body: 'Its body.', held: null, unheld: 'nothing shows it', ...over,
});

test('this tree states the rules of the language once and claims nothing false about them', () => {
  assert.deepEqual(collect(), []);
  assert.ok(RULES.some((one) => one.held !== null), 'no rule claims a tag, so the held check above saw nothing');
});

test('a rule naming a tag the shipped module does not emit is refused, and a rule is held or explained, never both and never neither', () => {
  const rows: { name: string; rules: LanguageRule[]; count?: number; pattern?: RegExp }[] = [
    { name: 'a rule naming a tag the shipped module emits is accepted', rules: [rule({ held: 'own-class', unheld: null })], count: 0 },
    { name: 'a rule naming a tag the shipped module does not emit is refused', rules: [rule({ held: 'invented-tag', unheld: null })], count: 1, pattern: /emits no such tag/ },
    { name: 'a rule that is held and explained is refused', rules: [rule({ held: 'emoji', unheld: 'and also this' })], pattern: /is one or the other/ },
    { name: 'a rule that is neither held nor explained is refused', rules: [rule({ held: null, unheld: null })], pattern: /says nothing about why/ },
    { name: 'a rule with an empty explanation is refused', rules: [rule({ held: null, unheld: '' })], pattern: /says nothing about why/ },
  ];
  for (const row of rows) {
    const problems = heldProblems(row.rules);
    if (row.count !== undefined) assert.equal(problems.length, row.count, `${row.name}: finding count`);
    if (row.pattern) assert.match(problems[0] ?? '', row.pattern, row.name);
  }
});

test('an identifier is kebab and unique, and a short half stands as a sentence by itself', () => {
  assert.deepEqual(shapeProblems([rule()]), []);
  assert.match(shapeProblems([rule({ id: 'Not Kebab' })])[0] ?? '', /kebab-case/);
  assert.match(shapeProblems([rule(), rule()])[0] ?? '', /declared twice/);
  assert.match(shapeProblems([rule({ short: 'No full stop' })])[0] ?? '', /full stop/);
  assert.equal(ID.test('tokens-only'), true);
  assert.equal(ID.test('one_primary'), false);
});

test('the colour choices are the adopter\'s, so no rule states them', () => {
  const ids = RULES.map((one) => one.id);
  for (const gone of ['danger-outline', 'one-primary', 'no-gradients', 'chart-identity']) {
    assert.ok(!ids.includes(gone), `${gone} is a colour choice and stays out of the rules`);
  }
  for (const one of RULES) {
    for (const tag of [one.held, ...(one.alsoHeld ?? [])]) {
      assert.ok(tag !== 'danger-fill' && tag !== 'one-primary', `${one.id} names ${tag}`);
    }
  }
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

test('the prose of the rules says what the doc says it does, one row per rule', () => {
  const rows: {
    name: string; id: string; short?: string; held?: string | null; alsoHeld?: string[]; unheldMatch?: RegExp; bodyMatch?: RegExp[]; bodyNot?: RegExp[];
  }[] = [
    { name: 'the copy rule is about the product\'s language, and Arena\'s words answer to the locale', id: 'copy-is-direct',
      short: 'Copy is formal and direct, in the product\'s language.', bodyMatch: [/Arena's words follow the locale\./] },
    { name: 'the rules say a class of the vocabulary is the only thing on a component, and the own-class rule names the part classes and no slot', id: 'own-class',
      short: 'Only a class of the vocabulary goes on an Arena component.', held: 'own-class',
      bodyMatch: [/Every class you may write is on the vocabulary page[;.]/, /arena-<component>__<part>/], bodyNot: [/slot/] },
    { name: 'appearance is a class of the vocabulary, never a member', id: 'appearance-is-a-class',
      short: 'Appearance is a class of the vocabulary, never a member.', held: null,
      unheldMatch: /type error in React and a template compile error in Angular/, bodyNot: [/reported/] },
    { name: 'the icon rule sends a static page to the weight sheets and a build to the package, and names the tag each case is reported as', id: 'icons-are-strings',
      held: 'raw-glyph', alsoHeld: ['icon-element'],
      bodyMatch: [
        /a raw `ph-\*` element needs the project's own `@phosphor-icons\/web`/,
        /static page has no build[^.]*weight sheets[^.]*references\/artifact\.md/,
        /passed to `icon` or `iconRight`[^.]*`icon-element`/,
      ] },
    { name: 'the theme rule names Arena\'s own palettes and the project\'s', id: 'two-themes', bodyMatch: [/Arena's own/, /\.arena-<name>/] },
  ];
  for (const row of rows) {
    const found = RULES.find((one) => one.id === row.id);
    assert.ok(found, `${row.name}: ${row.id} is declared`);
    if (row.short !== undefined) assert.equal(found.short, row.short, `${row.name}: short`);
    if (row.held !== undefined) assert.equal(found.held, row.held, `${row.name}: held`);
    if (row.alsoHeld !== undefined) assert.deepEqual(found.alsoHeld, row.alsoHeld, `${row.name}: alsoHeld`);
    if (row.unheldMatch) assert.match(found.unheld ?? '', row.unheldMatch, `${row.name}: unheld`);
    for (const pattern of row.bodyMatch ?? []) assert.match(found.body, pattern, `${row.name}: body ${pattern}`);
    for (const pattern of row.bodyNot ?? []) assert.doesNotMatch(found.body, pattern, `${row.name}: body ${pattern}`);
  }
  assert.equal(RULES.some((one) => one.id === 'copy-is-english'), false, 'no rule is copy-is-english; the copy rule is copy-is-direct');
  const ids = RULES.map((one) => one.id);
  assert.equal(ids.indexOf('appearance-is-a-class'), ids.indexOf('own-class') + 1, 'appearance follows own-class');
});

test('the mark names the tag that holds the rule, and a rule no tag holds has none to render', () => {
  const tokens = RULES.find((one) => one.id === 'tokens-only');
  assert.ok(tokens, 'tokens-only is declared');
  assert.equal(reportedMark(tokens), '**`arena audit` reports this one, as `raw-value`.**');
  for (const one of RULES.filter((held) => held.held !== null)) assert.ok(reportedMark(one).includes(`\`${one.held}\``), one.id);
  assert.throws(() => reportedMark(rule()), /held by no tag/);
});

test('the router-link rule names every component audit.ts holds', () => {
  const router = RULES.find((one) => one.id === 'router-link');
  assert.ok(router, 'router-link is declared');
  const phrase = /directly wraps an Arena (.+?)\.$/.exec(RULE_DESCRIPTIONS['router-link']);
  assert.ok(phrase, 'the audit description lists the wrapped components');
  const roles = phrase[1]!.split(/, | or /).map((role) => role.trim()).filter((role) => role !== '');
  assert.ok(roles.length > 1, 'the description names more than one role');
  const named = new Set(router.body.match(/Arena\w+/g));
  for (const role of roles) {
    const component = `Arena${role.split(' ').map((word) => word[0]!.toUpperCase() + word.slice(1)).join('')}`;
    assert.ok(named.has(component), `the router-link body names ${component}`);
  }
});
