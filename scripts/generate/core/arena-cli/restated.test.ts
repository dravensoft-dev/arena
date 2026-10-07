import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classFor, declarationsFor, pluginRules, resolveValue, restatedFindings, sheetFor,
} from './restated.ts';

test('a part names the slot class it selects and the sheet that carries it', () => {
  assert.equal(classFor('card.title'), 'arena-card__title');
  assert.equal(classFor('button'), 'arena-button__root',
    'a root part carries no suffix, and the class it draws does');
  assert.equal(sheetFor('side-nav.section-label'), 'arena-side-nav.css');
  assert.equal(sheetFor('tag'), 'arena-tag.css');
});

test('a rule for one class reads as property to every value it paints, and its neighbours do not leak in', () => {
  const css = '@layer utilities {\n  .arena-card__title {\n    font-family: var(--ff-heading);\n'
    + '    color: var(--ink-heading);\n  }\n  .arena-card__body {\n    padding: 1px;\n  }\n}\n';
  const found = declarationsFor(css, 'arena-card__title');
  assert.deepEqual(found.get('font-family'), new Set(['var(--ff-heading)']),
    'a property is a set because a slot may paint one twice, once plainly and once inside a '
    + 'support query, and a flat plugin declaration restates neither of them');
  assert.deepEqual(found.get('color'), new Set(['var(--ink-heading)']));
  assert.equal(found.has('padding'), false);
});

test('a slot painting one property two ways is not restated by a declaration matching either', () => {
  const sheet = '.arena-card__title {\n  color: var(--ink-muted);\n'
    + '  @supports (color: color-mix(in lab, red, red)) {\n'
    + '    color: color-mix(in oklab, var(--ink-muted) 62%, transparent);\n  }\n}';
  assert.deepEqual(restatedFindings(
    '[data-arena-part="card.title"] { color: var(--ink-muted); }', () => sheet,
  ), [],
  'the plugin rule replaces both, so it takes the level off and that is a change');
});

test('a declaration standing after a nested block is read rather than lost with it', () => {
  const sheet = '.arena-card__title {\n  color: var(--ink-muted);\n'
    + '  @supports (color: color-mix(in lab, red, red)) {\n    color: red;\n  }\n'
    + '  text-transform: var(--tt-label);\n}';
  assert.deepEqual(declarationsFor(sheet, 'arena-card__title').get('text-transform'),
    new Set(['var(--tt-label)']));
});

test('one rule naming several parts is read for every one of them', () => {
  const css = '[data-arena-part="side-nav.item"],\n[data-arena-part="side-nav.trigger"] '
    + '{ font-weight: var(--fw-control); }';
  assert.deepEqual(pluginRules(css).map((one) => one.part), ['side-nav.item', 'side-nav.trigger'],
    'a grouped selector is one rule about two parts, and dropping it hides both');
});

test('a name resolves through the map to the value it computes to', () => {
  const at = new Map([['fw-control', 'var(--fw-medium)'], ['fw-medium', '500']]);
  assert.equal(resolveValue('var(--fw-control)', at), '500');
  assert.equal(resolveValue('var(--nothing-answers-this)', at), 'var(--nothing-answers-this)',
    'an unresolved name stays as it is, so a pair that cannot be compared is never reported');
});

test('a declaration restating the slot through another name that resolves the same is a finding', () => {
  const sheet = '.arena-side-nav__trigger { font-weight: var(--fw-medium); }';
  const at = new Map([['fw-control', '500'], ['fw-medium', '500']]);
  const found = restatedFindings(
    '[data-arena-part="side-nav.trigger"] { font-weight: var(--fw-control); }', () => sheet, at,
  );
  assert.deepEqual(found.map((one) => one.property), ['font-weight'],
    'the count a role is grown from is what this protects, so a rule changing no pixel is not '
    + 'evidence however it is spelled');
});

test('the same pair is not a finding where the two names resolve differently', () => {
  const sheet = '.arena-side-nav__trigger { font-weight: var(--fw-medium); }';
  const at = new Map([['fw-control', '600'], ['fw-medium', '500']]);
  assert.deepEqual(restatedFindings(
    '[data-arena-part="side-nav.trigger"] { font-weight: var(--fw-control); }', () => sheet, at,
  ), []);
});

test('a property a plugin sets twice on one part is left alone, since the second overrides the first', () => {
  const sheet = '.arena-breadcrumbs__current { color: var(--ink-body); }';
  const at = new Map([['ink-body', 'var(--color-base-content)'], ['ink-heading', 'var(--color-base-content)']]);
  const css = '[data-arena-part="breadcrumbs.crumb"],\n[data-arena-part="breadcrumbs.current"] '
    + '{ color: color-mix(in oklab, var(--color-base-content) 62%, transparent); }\n'
    + '[data-arena-part="breadcrumbs.current"] { color: var(--ink-heading); }';
  assert.deepEqual(restatedFindings(css, () => sheet, at).filter((one) => one.part === 'breadcrumbs.current'), [],
    'the second rule takes the level back off the first one, so it is measured against a rule of '
    + 'this plugin\'s own rather than against the slot');
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
