import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classFor, declarationsFor, pluginRules, restatedFindings, sheetFor,
} from './restated.ts';

test('a part names the slot class it selects and the sheet that carries it', () => {
  assert.equal(classFor('card.title'), 'arena-card__title');
  assert.equal(classFor('button'), 'arena-button__root',
    'a root part carries no suffix, and the class it draws does');
  assert.equal(sheetFor('side-nav.section-label'), 'arena-side-nav.css');
  assert.equal(sheetFor('tag'), 'arena-tag.css');
});

test('a rule for one class reads as property to value, and its neighbours do not leak in', () => {
  const css = '@layer utilities {\n  .arena-card__title {\n    font-family: var(--ff-heading);\n'
    + '    color: var(--ink-heading);\n  }\n  .arena-card__body {\n    padding: 1px;\n  }\n}\n';
  const found = declarationsFor(css, 'arena-card__title');
  assert.equal(found.get('font-family'), 'var(--ff-heading)');
  assert.equal(found.get('color'), 'var(--ink-heading)');
  assert.equal(found.has('padding'), false);
});

test('a plugin sheet reads as the part it selects and the declarations it makes there', () => {
  const found = pluginRules('[data-arena-part="card.title"] { font-family: var(--ff-heading); }');
  assert.equal(found.length, 1);
  assert.equal(found[0]?.part, 'card.title');
  assert.equal(found[0]?.declarations.get('font-family'), 'var(--ff-heading)');
});

test('a rule carrying a state is left alone, because a state is not what the slot paints at rest', () => {
  const css = '[data-arena-part="button"]:active { transform: translateY(4px); }';
  assert.deepEqual(pluginRules(css), [],
    'the resting rule is the only one the slot has, so comparing a pressed rule against it would '
    + 'call a real gesture a restatement');
});

test('a declaration restating what the slot already paints is a finding', () => {
  const sheet = '.arena-card__title { font-family: var(--ff-heading); }';
  const found = restatedFindings(
    '[data-arena-part="card.title"] { font-family: var(--ff-heading); }', () => sheet,
  );
  assert.equal(found.length, 1);
  assert.equal(found[0]?.part, 'card.title');
  assert.equal(found[0]?.property, 'font-family');
});

test('a declaration changing the value is not a finding', () => {
  const sheet = '.arena-card__title { font-family: var(--ff-heading); }';
  assert.deepEqual(restatedFindings(
    '[data-arena-part="card.title"] { font-family: var(--font-mono); }', () => sheet,
  ), []);
});

test('a property the slot does not paint is not a finding, since the rule adds it', () => {
  const sheet = '.arena-card__title { font-family: var(--ff-heading); }';
  assert.deepEqual(restatedFindings(
    '[data-arena-part="card.title"] { letter-spacing: var(--track-heading); }', () => sheet,
  ), []);
});

test('a part whose sheet is absent reports nothing rather than guessing', () => {
  assert.deepEqual(restatedFindings(
    '[data-arena-part="card.title"] { font-family: var(--ff-heading); }', () => null,
  ), [],
  'a silent miss costs a reader nothing and a false report costs them a search');
});

test('whitespace around a value is not a difference, because CSS does not read it as one', () => {
  const sheet = '.arena-card__title {\n  font-family:   var(--ff-heading) ;\n}';
  assert.equal(restatedFindings(
    '[data-arena-part="card.title"] { font-family: var(--ff-heading); }', () => sheet,
  ).length, 1);
});

test('one rule reporting many parts reports each of them', () => {
  const sheet = '.arena-menu__item { border-radius: var(--r-control); }';
  const found = restatedFindings(
    '[data-arena-part="menu.item"] { border-radius: var(--r-control); justify-content: center; }',
    () => sheet,
  );
  assert.deepEqual(found.map((one) => one.property), ['border-radius'],
    'the centring is this plugin\'s own and the radius is the slot\'s answer restated');
});
