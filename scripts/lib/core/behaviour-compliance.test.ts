import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../arena/repo-root.ts';
import {
  roleOf, hasAccessibleName, isFocusable, evaluate,
  DECIDABLE, BEHAVIOURAL, elementRoles, LABEL_ACCEPTS_TEXT, comparePattern,
  QUANTIFIED, NOT_QUANTIFIED, IDREF, IDREF_ATTRIBUTES, ATTRIBUTE_FOR,
} from './behaviour-compliance.ts';

const PATTERN_DIR = join(repoRoot, 'contracts', 'behaviour');

const PATTERNS = new Map(
  readdirSync(PATTERN_DIR)
    .filter((f) => extname(f) === '.json')
    .sort()
    .map((f) => [basename(f, '.json'), readJson(join(PATTERN_DIR, f))]),
);

function el(tagName: string, attrs: Record<string, unknown> = {}, text = '') {
  return {
    tagName: tagName.toUpperCase(),
    getAttribute: (n: string) => (n in attrs ? String(attrs[n]) : null),
    hasAttribute: (n: string) => n in attrs,
    textContent: text,
  };
}

test('roleOf prefers an explicit role', () => {
  assert.equal(roleOf(el('div', { role: 'dialog' })), 'dialog');
});

test('roleOf takes the first token of a multi-token role', () => {

  assert.equal(roleOf(el('div', { role: 'doc-abstract  region' })), 'doc-abstract');
  assert.equal(roleOf(el('div', { role: '  button ' })), 'button');
});

test('roleOf resolves the implicit role of a native button', () => {
  assert.equal(roleOf(el('button')), 'button');
});

test('roleOf resolves input types to their distinct implicit roles', () => {
  assert.equal(roleOf(el('input', { type: 'checkbox' })), 'checkbox');
  assert.equal(roleOf(el('input', { type: 'radio' })), 'radio');
  assert.equal(roleOf(el('input', {})), 'textbox');
});

test('roleOf gives a section a role only when it is named', () => {
  assert.equal(roleOf(el('section')), null);
  assert.equal(roleOf(el('section', { 'aria-label': 'Schedule' })), 'region');
});

test('roleOf does not let text content name a section', () => {

  assert.equal(roleOf(el('section', {}, 'Schedule')), null);
});

test('roleOf returns null for an element with no role of any kind', () => {
  assert.equal(roleOf(el('div')), null);
  assert.equal(roleOf(el('span')), null);
});

test('hasAccessibleName accepts aria-label, and returns false with no naming route', () => {

  assert.equal(hasAccessibleName(el('div', { 'aria-label': 'Loading' })), true);
  assert.equal(hasAccessibleName(el('div')), false);
});

test('hasAccessibleName credits text content only when asked to', () => {
  assert.equal(hasAccessibleName(el('button', {}, 'Save'), true), true);
  assert.equal(hasAccessibleName(el('button', {}, 'Save')), false, 'strict by default');
  assert.equal(hasAccessibleName(el('button', {}, '   '), true), false, 'whitespace is not a name');
});

test('aria-label alone names the element without consulting the resolver', () => {
  let asked = false;
  const resolve = (): null => { asked = true; return null; };
  assert.equal(hasAccessibleName(el('div', { 'aria-label': 'Schedule' }), false, resolve), true);
  assert.equal(asked, false, 'the resolver was consulted for an element aria-label already named');
});

test('a resolving aria-labelledby names the element', () => {
  assert.equal(hasAccessibleName(el('div', { 'aria-labelledby': 'title-1' }), false, () => el('h2')), true);
});

test('a dangling aria-labelledby does NOT name the element', () => {
  assert.equal(hasAccessibleName(el('div', { 'aria-labelledby': 'gone' }), false, () => null), false);
});

test('every id in an aria-labelledby list must resolve', () => {
  const d = el('div', { 'aria-labelledby': 'a b' });
  const onlyA = (id: string) => (id === 'a' ? el('span') : null);
  assert.equal(hasAccessibleName(d, false, onlyA), false);
  assert.equal(hasAccessibleName(d, false, () => el('span')), true);
});

test('text content still names an element whose aria-labelledby dangles', () => {
  let asked = false;
  const b = el('button', { 'aria-labelledby': 'gone' }, 'Save');
  assert.equal(hasAccessibleName(b, true, () => { asked = true; return null; }), true);
  assert.equal(asked, false);
});

test('text content does not rescue a pattern that does not admit it', () => {
  const d = el('div', { 'aria-labelledby': 'gone' }, 'Delete project');
  assert.equal(hasAccessibleName(d, false, () => null), false);
});

test('an aria-labelledby with no resolver THROWS rather than counting the attribute', () => {
  assert.throws(
    () => hasAccessibleName(el('div', { 'aria-labelledby': 'x' })),
    /aria-labelledby.*resolveId/s,
  );
});

test('an element with no naming route at all needs no resolver', () => {
  assert.equal(hasAccessibleName(el('div')), false);
  assert.equal(hasAccessibleName(el('button', {}, 'Save'), true), true);
});

test('roleOf refuses region to a section whose aria-labelledby dangles', () => {
  assert.equal(roleOf(el('section', { 'aria-labelledby': 'gone' }), () => null), null);
  assert.equal(roleOf(el('section', { 'aria-labelledby': 'h1' }), () => el('h2')), 'region');
});

test('a section named only by aria-labelledby THROWS through roleOf with no resolver', () => {
  assert.throws(
    () => roleOf(el('section', { 'aria-labelledby': 'x' })),
    /aria-labelledby.*resolveId/s,
  );
});

test('evaluate decides roles.label by resolving, not by counting', () => {
  const d = el('div', { 'aria-labelledby': 'gone' });
  assert.equal(evaluate(d, 'roles.label', 'aria-labelledby or aria-label', 'dialog-modal', () => null), false);
  assert.equal(evaluate(d, 'roles.label', 'aria-labelledby or aria-label', 'dialog-modal', () => el('h2')), true);
});

test('isFocusable accepts natively focusable elements and explicit tabindex', () => {
  assert.equal(isFocusable(el('button')), true);
  assert.equal(isFocusable(el('span', { tabindex: '0' })), true);
  assert.equal(isFocusable(el('span')), false);
});

test('isFocusable rejects a disabled native control and a negative tabindex', () => {
  assert.equal(isFocusable(el('button', { disabled: '' })), false);
  assert.equal(isFocusable(el('span', { tabindex: '-1' })), false);
});

test('every requirement key in every pattern is DECIDABLE or BEHAVIOURAL', () => {
  const unclassified = [];
  for (const [name, pattern] of PATTERNS) {
    for (const key of Object.keys(pattern.requires ?? {})) {
      if (!DECIDABLE.has(key) && !BEHAVIOURAL.has(key)) unclassified.push(`${name}: ${key}`);
    }
  }
  assert.deepEqual(unclassified, [], 'classify these in behaviour-compliance.ts, or fix the typo in the pattern file');
});

test('DECIDABLE and BEHAVIOURAL name no key that no pattern uses', () => {

  const used = new Set();
  for (const pattern of PATTERNS.values()) for (const key of Object.keys(pattern.requires ?? {})) used.add(key);
  const stale = [...DECIDABLE, ...BEHAVIOURAL].filter((k) => !used.has(k));
  assert.deepEqual(stale, [], 'these keys are classified but required by no pattern — remove them');
});

test('DECIDABLE and BEHAVIOURAL are disjoint', () => {
  const both = [...DECIDABLE].filter((k) => BEHAVIOURAL.has(k));
  assert.deepEqual(both, []);
});

test('every pattern requiring roles.element has an elementRoles() entry', () => {
  const missing = [...PATTERNS]
    .filter(([, p]) => 'roles.element' in (p.requires ?? {}))
    .map(([name]) => name)
    .filter((name) => !(name in elementRoles()));
  assert.deepEqual(missing, []);
});

test('elementRoles() names no pattern that does not require roles.element', () => {
  const stale = Object.keys(elementRoles()).filter(
    (name) => !PATTERNS.has(name) || !('roles.element' in (PATTERNS.get(name).requires ?? {})),
  );
  assert.deepEqual(stale, []);
});

test('every elementRoles() value is the role its own pattern names', () => {

  for (const [name, role] of Object.entries(elementRoles())) {
    const prose = String(PATTERNS.get(name)?.requires?.['roles.element'] ?? '');
    assert.match(prose, new RegExp(`\\b${role}\\b`, 'i'),
      `elementRoles().${name} is "${role}", which does not appear in that pattern's roles.element: ${prose}`);
  }
});

test('every pattern in LABEL_ACCEPTS_TEXT really admits text content as its name', () => {
  for (const name of LABEL_ACCEPTS_TEXT) {
    const value = PATTERNS.get(name)?.requires?.['roles.label'];
    assert.ok(value, `${name} has no roles.label requirement`);
    assert.match(String(value), /text content/i, `${name}'s roles.label prose does not mention text content`);
  }
});

test('no pattern outside LABEL_ACCEPTS_TEXT admits text content', () => {

  for (const [name, pattern] of PATTERNS) {
    const value = pattern.requires?.['roles.label'];
    if (!value || LABEL_ACCEPTS_TEXT.has(name)) continue;
    assert.doesNotMatch(String(value), /text content/i, `${name} now admits text content — add it to LABEL_ACCEPTS_TEXT`);
  }
});

test('the disclosure pattern is bound to the button role', () => {
  const pattern = readJson(join(PATTERN_DIR, 'disclosure.json'));
  assert.equal(pattern.name, 'disclosure');
  assert.match(pattern.source, /apg\/patterns\/disclosure/);
  assert.equal(elementRoles().disclosure, 'button');
  assert.ok(LABEL_ACCEPTS_TEXT.has('disclosure'),
    'a disclosure button is named by its own text content');

  for (const key of Object.keys(pattern.requires)) {
    assert.ok(DECIDABLE.has(key) || BEHAVIOURAL.has(key), `${key} is in neither set`);
  }
});

test('evaluate resolves roles.element from the pattern, not from its prose', () => {

  const prose = PATTERNS.get('navigation').requires['roles.element'];
  assert.match(String(prose), /^navigation \(native nav/, 'the prose is still a sentence, so this test still means something');
  assert.equal(evaluate(el('nav', { 'aria-label': 'Main' }), 'roles.element', prose, 'navigation'), true);
  assert.equal(evaluate(el('div', { role: 'navigation' }), 'roles.element', prose, 'navigation'), true);
  assert.equal(evaluate(el('div'), 'roles.element', prose, 'navigation'), false);
});

test('evaluate maps menu-button roles.element to the button role', () => {
  assert.equal(evaluate(el('button'), 'roles.element', 'button', 'menu-button'), true);
  assert.equal(evaluate(el('div', { role: 'menu' }), 'roles.element', 'button', 'menu-button'), false);
});

test('evaluate throws when a pattern requires roles.element and declares no element', () => {
  assert.throws(
    () => evaluate(el('div'), 'roles.element', 'widget', 'invented-pattern'),
    /invented-pattern.*contracts\/behaviour\/invented-pattern\.json/s,
  );
});

test('evaluate credits text content for roles.label only in the patterns that allow it', () => {
  const button = el('button', {}, 'Save');
  assert.equal(evaluate(button, 'roles.label', '', 'button'), true, 'a labelled-by-content button is named');

  const dialog = el('div', { role: 'dialog' }, 'Delete project');
  assert.equal(evaluate(dialog, 'roles.label', '', 'dialog-modal'), false,
    'dialog-modal asks for an explicit name; crediting its title text would retire a true exception');
  assert.equal(evaluate(el('div', { role: 'dialog', 'aria-label': 'Delete' }), 'roles.label', '', 'dialog-modal'), true);
});

test('evaluate decides the aria-state requirements by attribute presence', () => {
  assert.equal(evaluate(el('div', { 'aria-modal': 'true' }), 'roles.aria-modal', 'true', 'dialog-modal'), true);
  assert.equal(evaluate(el('div'), 'roles.aria-modal', 'true', 'dialog-modal'), false);
  assert.equal(evaluate(el('button', { 'aria-expanded': 'false' }), 'roles.expanded', '', 'menu-button'), true);
});

test('evaluate resolves the role-named-by-key requirements, single and array', () => {
  assert.equal(evaluate(el('div', { role: 'grid' }), 'roles.grid', '', 'grid'), true);
  assert.equal(evaluate(el('tr'), 'roles.row', '', 'grid'), true);

  for (const role of ['gridcell', 'columnheader', 'rowheader']) {
    assert.equal(evaluate(el('div', { role }), 'roles.cell', '', 'grid'), true, role);
  }
  assert.equal(evaluate(el('td'), 'roles.cell', '', 'grid'), true, 'the implicit cell role counts');
  assert.equal(evaluate(el('div', { role: 'row' }), 'roles.cell', '', 'grid'), false);

  assert.equal(evaluate(el('div', { role: 'radiogroup' }), 'roles.group', '', 'radiogroup'), true);
  assert.equal(evaluate(el('fieldset'), 'roles.group', '', 'radiogroup'), true);
  assert.equal(evaluate(el('div', { role: 'radio' }), 'roles.item', '', 'radiogroup'), true);
  assert.equal(evaluate(el('div', { role: 'option' }), 'roles.item', '', 'radiogroup'), true);
  assert.equal(evaluate(el('div'), 'roles.item', '', 'radiogroup'), false);
});

test('evaluate credits native checked-ness for states.checked', () => {

  assert.equal(evaluate(el('input', { type: 'checkbox' }), 'states.checked', '', 'checkbox'), true);
  assert.equal(evaluate(el('input', { type: 'radio' }), 'states.checked', '', 'radiogroup'), true);
  assert.equal(evaluate(el('div', { role: 'checkbox', 'aria-checked': 'false' }), 'states.checked', '', 'checkbox'), true);
  assert.equal(evaluate(el('div', { role: 'checkbox' }), 'states.checked', '', 'checkbox'), false);
  assert.equal(evaluate(el('input', { type: 'text' }), 'states.checked', '', 'checkbox'), false);
});

test('evaluate credits a native element for states.multiline, as it already does for states.checked', () => {
  assert.equal(evaluate(el('textarea'), 'states.multiline', '', 'textbox'), true);
  assert.equal(evaluate(el('div', { role: 'textbox', 'aria-multiline': 'false' }), 'states.multiline', '', 'textbox'), true);

  assert.equal(evaluate(el('input'), 'states.multiline', '', 'textbox'), true,
    'a text input reflects single-line-ness by being one; demanding aria-multiline="false" would '
    + 'require a redundant attribute the platform already implies');
  assert.equal(evaluate(el('input', { type: 'search' }), 'states.multiline', '', 'textbox'), true);

  assert.equal(evaluate(el('input', { type: 'checkbox' }), 'states.multiline', '', 'textbox'), false,
    'only the text-entry input roles carry the state at all');
  assert.equal(evaluate(el('div', { role: 'textbox' }), 'states.multiline', '', 'textbox'), false,
    'a div taking the role by hand has no native reflection to inherit');
});

test('evaluate resolves roles.label through a <label>, the platform route for a form control', () => {
  const input = el('input', { id: 'in-project' });
  const label = el('label', { for: 'in-project' }, 'Project');

  assert.equal(evaluate(input, 'roles.label', '', 'textbox', null, () => label), true);
  assert.equal(evaluate(input, 'roles.label', '', 'textbox', null, () => null), false,
    'no label in the tree means no name');
  assert.equal(evaluate(input, 'roles.label', '', 'textbox', null, () => el('label', {})), false,
    'an empty label names nothing');

  const wrapped = el('input', {});
  assert.equal(evaluate(wrapped, 'roles.label', '', 'checkbox', null, () => el('label', {}, 'Notify')), true,
    'a control with no id can still be named by a label WRAPPING it, which the resolver decides');
});

test('a labelable control THROWS when no label resolver is supplied', () => {
  assert.throws(
    () => evaluate(el('input', { id: 'x' }), 'roles.label', '', 'textbox'),
    /resolveLabel/,
  );
  assert.throws(
    () => evaluate(el('input'), 'roles.label', '', 'checkbox'),
    /resolveLabel/,
    'an id is not required: a wrapping label names a control that has none',
  );
  assert.equal(evaluate(el('div', { id: 'x' }), 'roles.label', '', 'textbox'), false,
    'a div is not labelable, so the route does not apply and no resolver is needed');
});

test('evaluate decides live.politeness from an implicit or explicit live region', () => {
  assert.equal(evaluate(el('div', { role: 'status' }), 'live.politeness', '', 'status'), true);
  assert.equal(evaluate(el('output'), 'live.politeness', '', 'status'), true, 'the implicit status role of <output>');
  assert.equal(evaluate(el('div', { role: 'alert' }), 'live.politeness', '', 'status'), true);
  assert.equal(evaluate(el('div', { 'aria-live': 'polite' }), 'live.politeness', '', 'status'), true);
  assert.equal(evaluate(el('div'), 'live.politeness', '', 'status'), false);
});

test('evaluate returns null for a requirement no single element can decide', () => {
  assert.equal(evaluate(el('div'), 'focus.trap', true, 'dialog-modal'), null);
  assert.equal(evaluate(el('div'), 'keyboard.Escape', 'close', 'dialog-modal'), null);
  assert.equal(evaluate(el('div'), 'content.noAutoDismiss', true, 'alert'), null);
  assert.equal(evaluate(el('div'), 'alternative.table', 'a real <table>', 'figure-with-data-table'), null);
});

test('evaluate treats the conditional states as behavioural, not as presence', () => {

  assert.equal(evaluate(el('button', {}, 'Save'), 'states.disabled', '', 'button'), null);
  for (const key of ['states.required', 'states.readonly', 'states.multiselectable', 'states.busy', 'states.posinset']) {
    assert.equal(evaluate(el('div'), key, '', 'textbox'), null, key);
  }
});

test('evaluate throws on an unrecognised requirement key', () => {

  assert.throws(() => evaluate(el('div'), 'states.chekced', '', 'checkbox'), /states\.chekced/);
  assert.throws(() => evaluate(el('div'), 'nonsense', '', 'checkbox'), /nonsense/);
});

test('DECIDABLE and evaluate agree: a decidable key never returns null', () => {
  const cases = [
    ['roles.element', el('button'), 'button', 'button'],
    ['roles.label', el('div', { 'aria-label': 'x' }), '', 'dialog-modal'],
    ['roles.expanded', el('div'), '', 'menu-button'],
    ['states.checked', el('div'), '', 'checkbox'],
    ['live.politeness', el('div'), '', 'status'],
  ];
  for (const [key, node, value, pattern] of cases as [string, any, any, string][]) {
    assert.ok(DECIDABLE.has(key), `${key} should be listed decidable`);
    assert.notEqual(evaluate(node, key, value, pattern), null, `${key} returned null`);
  }
});

test('DECIDABLE omits every behavioural family', () => {
  for (const key of ['focus.trap', 'focus.onOpen', 'keyboard.Escape', 'content.noAutoDismiss', 'alternative.table', 'states.disabled']) {
    assert.equal(DECIDABLE.has(key), false, `${key} should not be listed decidable`);
  }
});

const DIALOG_MODAL = {
  name: 'dialog-modal',
  requires: {
    'roles.element': 'dialog',
    'roles.aria-modal': 'true',
    'roles.label': 'aria-labelledby or aria-label',
    'focus.trap': true,
    'keyboard.Escape': 'close',
  },
};

const BEHAVIOURAL_MET = { 'focus.trap': true, 'keyboard.Escape': true };

test('comparePattern is silent when the DOM and the binding agree', () => {
  const subject = el('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Delete' });
  const problems = comparePattern({
    pattern: DIALOG_MODAL,
    binding: { pattern: 'dialog-modal', exceptions: [] },
    fallback: subject,
    behavioural: BEHAVIOURAL_MET,
  });
  assert.deepEqual(problems, []);
});

test('comparePattern treats a binding with no exceptions field as having none', () => {
  const subject = el('div', { role: 'dialog', 'aria-modal': 'true' });
  const problems = comparePattern({
    pattern: DIALOG_MODAL,
    binding: { pattern: 'dialog-modal' },
    fallback: subject,
    behavioural: BEHAVIOURAL_MET,
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /OVERCLAIM/);
});

test('comparePattern reports a stale exception when the requirement is met', () => {
  const subject = el('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Delete' });
  const problems = comparePattern({
    pattern: DIALOG_MODAL,
    binding: { pattern: 'dialog-modal', exceptions: [{ requirement: 'roles.label', reason: 'synthetic' }] },
    fallback: subject,
    behavioural: BEHAVIOURAL_MET,
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /STALE EXCEPTION/);
  assert.match(problems[0] ?? '', /roles\.label/);
});

test('comparePattern reports an overclaim when a requirement is unmet and unexcepted', () => {
  const subject = el('div', { role: 'dialog', 'aria-modal': 'true' }, 'Delete project');
  const problems = comparePattern({
    pattern: DIALOG_MODAL,
    binding: { pattern: 'dialog-modal', exceptions: [] },
    fallback: subject,
    behavioural: BEHAVIOURAL_MET,
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /OVERCLAIM/);
  assert.match(problems[0] ?? '', /roles\.label/);
});

test('comparePattern is silent for a correct button, which is the case it used to fail', () => {

  const button = PATTERNS.get('button');
  const problems = comparePattern({
    pattern: button,
    binding: { pattern: 'button', exceptions: [] },
    fallback: el('button', {}, 'Save'),
    behavioural: { 'keyboard.Space': true, 'keyboard.Enter': true, 'states.disabled': true },
  });
  assert.deepEqual(problems, []);
});

test('comparePattern refuses an undecidable requirement that was not declared behavioural', () => {
  const subject = el('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Delete' });
  const problems = comparePattern({
    pattern: DIALOG_MODAL,
    binding: { pattern: 'dialog-modal', exceptions: [] },
    fallback: subject,
    behavioural: {},
  });
  assert.equal(problems.length, 2);
  for (const p of problems) assert.match(p, /not declared behavioural/);
});

test('comparePattern reports a behavioural declaration the pattern no longer has', () => {
  const subject = el('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Delete' });
  const problems = comparePattern({
    pattern: DIALOG_MODAL,
    binding: { pattern: 'dialog-modal', exceptions: [] },
    fallback: subject,
    behavioural: { ...BEHAVIOURAL_MET, 'focus.roving': true },
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /never reached/);
  assert.match(problems[0] ?? '', /focus\.roving/);
});

const EXCEPTS_TRAP = {
  pattern: 'dialog-modal',
  exceptions: [{ requirement: 'focus.trap', reason: 'no focus trap is implemented' }],
};
const NAMED_DIALOG = () => el('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Delete' });

test('comparePattern reports a stale exception on a behavioural key declared met', () => {

  const problems = comparePattern({
    pattern: DIALOG_MODAL,
    binding: EXCEPTS_TRAP,
    fallback: NAMED_DIALOG(),
    behavioural: { ...BEHAVIOURAL_MET },
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /STALE EXCEPTION/);
  assert.match(problems[0] ?? '', /focus\.trap/);
  assert.match(problems[0] ?? '', /your behavioural test/, 'the message names where the verdict came from');
});

test('comparePattern reports an overclaim on a behavioural key declared unmet', () => {
  const problems = comparePattern({
    pattern: DIALOG_MODAL,
    binding: { pattern: 'dialog-modal', exceptions: [] },
    fallback: NAMED_DIALOG(),
    behavioural: { ...BEHAVIOURAL_MET, 'focus.trap': false },
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /OVERCLAIM/);
  assert.match(problems[0] ?? '', /focus\.trap/);
  assert.match(problems[0] ?? '', /your behavioural test/);
});

test('comparePattern is silent when a behavioural verdict of false matches an exception', () => {

  const problems = comparePattern({
    pattern: DIALOG_MODAL,
    binding: EXCEPTS_TRAP,
    fallback: NAMED_DIALOG(),
    behavioural: { ...BEHAVIOURAL_MET, 'focus.trap': false },
  });
  assert.deepEqual(problems, []);
});

test('comparePattern is silent when a behavioural verdict of true has no exception', () => {
  const problems = comparePattern({
    pattern: DIALOG_MODAL,
    binding: { pattern: 'dialog-modal', exceptions: [] },
    fallback: NAMED_DIALOG(),
    behavioural: { ...BEHAVIOURAL_MET },
  });
  assert.deepEqual(problems, []);
});

test('comparePattern still refuses an undecidable key absent from the map', () => {

  const problems = comparePattern({
    pattern: DIALOG_MODAL,
    binding: EXCEPTS_TRAP,
    fallback: NAMED_DIALOG(),
    behavioural: { 'keyboard.Escape': true },
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /focus\.trap/);
  assert.match(problems[0] ?? '', /not declared behavioural/);
});

test('comparePattern uses a per-requirement subject over the fallback', () => {

  const wrapper = el('span', { 'aria-haspopup': 'menu' });
  const trigger = el('button');
  const pattern = { name: 'menu-button', requires: { 'roles.haspopup': 'menu' } };
  const onTrigger = comparePattern({
    pattern,
    binding: { pattern: 'menu-button', exceptions: [{ requirement: 'roles.haspopup', reason: 'on the wrapper' }] },
    subjects: { 'roles.haspopup': trigger },
    fallback: wrapper,
    behavioural: {},
  });
  assert.deepEqual(onTrigger, [], 'the exception is true when judged against the trigger');

  const onWrapper = comparePattern({
    pattern,
    binding: { pattern: 'menu-button', exceptions: [{ requirement: 'roles.haspopup', reason: 'on the wrapper' }] },
    fallback: wrapper,
    behavioural: {},
  });
  assert.equal(onWrapper.length, 1);
  assert.match(onWrapper[0] ?? '', /STALE EXCEPTION/, 'and falsely stale when judged against the wrapper');
});

test('comparePattern reports a missing subject once per requirement', () => {
  const problems = comparePattern({
    pattern: DIALOG_MODAL,
    binding: { pattern: 'dialog-modal', exceptions: [] },
    fallback: null,
    behavioural: BEHAVIOURAL_MET,
  });

  const missing = problems.filter((p) => /no subject element/.test(p));
  const unreached = problems.filter((p) => /never reached/.test(p));
  assert.equal(missing.length, Object.keys(DIALOG_MODAL.requires).length);
  assert.equal(unreached.length, Object.keys(BEHAVIOURAL_MET).length);

  for (const p of unreached) assert.match(p, /because a subject element above was missing/);
  assert.equal(problems.length, missing.length + unreached.length);
});

test('an IDREF that resolves meets the requirement', () => {
  const tab = el('button', { 'aria-controls': 'panel-1' });
  const resolve = (id: string) => (id === 'panel-1' ? el('div') : null);
  assert.equal(evaluate(tab, 'roles.controls', 'each tab…', 'tabs', resolve), true);
});

test('an IDREF that dangles does NOT meet it, though the attribute is present', () => {
  const tab = el('button', { 'aria-controls': 'panel-9' });
  const resolve = (): null => null;
  assert.equal(evaluate(tab, 'roles.controls', 'each tab…', 'tabs', resolve), false);
});

test('a missing IDREF attribute is unmet without consulting the resolver', () => {
  let asked = false;
  const resolve = (): null => { asked = true; return null; };
  assert.equal(evaluate(el('button'), 'roles.controls', 'x', 'tabs', resolve), false);
  assert.equal(asked, false, 'the resolver was consulted for an absent attribute');
});

test('one resolving id in a list is enough', () => {
  const trigger = el('button', { 'aria-describedby': 'consumer-hint tooltip-1' });
  const resolve = (id: string) => (id === 'tooltip-1' ? el('span') : null);
  assert.equal(evaluate(trigger, 'roles.describedby', 'x', 'tooltip', resolve), true);
});

test('a list where nothing resolves is unmet', () => {
  const trigger = el('button', { 'aria-describedby': 'a b' });
  assert.equal(evaluate(trigger, 'roles.describedby', 'x', 'tooltip', () => null), false);
});

test('an IDREF requirement with no resolver THROWS rather than falling back', () => {
  const tab = el('button', { 'aria-controls': 'panel-1' });
  assert.throws(
    () => evaluate(tab, 'roles.controls', 'x', 'tabs'),
    /roles\.controls.*resolveId/s,
  );
});

test('a non-IDREF attribute requirement still needs no resolver', () => {
  const t = el('button', { 'aria-selected': 'false' });
  assert.equal(evaluate(t, 'states.selected', 'x', 'tabs'), true);
});

test('an aria-controls list is met only when EVERY id resolves', () => {
  const tab = el('button', { 'aria-controls': 'panel-1 panel-2' });
  const both = (id: string) => (id === 'panel-1' || id === 'panel-2' ? el('div') : null);
  const onlyOne = (id: string) => (id === 'panel-1' ? el('div') : null);
  assert.equal(evaluate(tab, 'roles.controls', 'x', 'tabs', both), true);
  assert.equal(evaluate(tab, 'roles.controls', 'x', 'tabs', onlyOne), false);
});

test('aria-describedby keeps the one-resolving-id rule, and keeps its reason', () => {
  const trigger = el('button', { 'aria-describedby': 'consumer-hint tooltip-1' });
  const resolve = (id: string) => (id === 'tooltip-1' ? el('span') : null);
  assert.equal(evaluate(trigger, 'roles.describedby', 'x', 'tooltip', resolve), true);
  assert.equal(IDREF_ATTRIBUTES.get('aria-describedby')?.match, 'some');
});

test('a reference attribute holding only whitespace names nothing', () => {
  const tab = el('button', { 'aria-controls': '   ' });
  assert.equal(evaluate(tab, 'roles.controls', 'x', 'tabs', () => el('div')), false);
});

test('IDREF holds exactly the reference keys that reach ATTRIBUTE_FOR', () => {
  assert.deepEqual(
    [...IDREF].sort(),
    ['roles.activedescendant', 'roles.controls', 'roles.describedby'],
  );
});

test('every IDREF_ATTRIBUTES entry names an attribute the evaluator actually consults', () => {
  const consulted = new Set([...Object.values(ATTRIBUTE_FOR), 'aria-labelledby']);
  for (const attr of IDREF_ATTRIBUTES.keys()) {
    assert.ok(consulted.has(attr), `${attr}: no branch of the evaluator reads it`);
  }
});

test('every IDREF_ATTRIBUTES entry declares a match rule and a reason', () => {
  for (const [attr, spec] of IDREF_ATTRIBUTES) {
    assert.ok(['every', 'some'].includes(spec.match), `${attr}: match must be "every" or "some"`);
    assert.ok(typeof spec.reason === 'string' && spec.reason.length > 20, `${attr}: no reason on file`);
  }
});

test('comparePattern reports a dangling reference as an OVERCLAIM', () => {
  const problems = comparePattern({
    pattern: { name: 'disclosure', requires: { 'roles.controls': 'aria-controls on the button' } },
    binding: { pattern: 'disclosure', exceptions: [] },
    subjects: { 'roles.controls': el('button', { 'aria-controls': 'gone' }) },
    resolveId: () => null,
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /roles\.controls: OVERCLAIM/);
});

test('a dangling reference with an exception declared is not a problem', () => {
  const problems = comparePattern({
    pattern: { name: 'disclosure', requires: { 'roles.controls': 'aria-controls on the button' } },
    binding: { pattern: 'disclosure', exceptions: [{ requirement: 'roles.controls', reason: 'known' }] },
    subjects: { 'roles.controls': el('button', { 'aria-controls': 'gone' }) },
    resolveId: () => null,
  });
  assert.deepEqual(problems, []);
});

test('a resolving reference with an exception declared is a STALE EXCEPTION', () => {
  const problems = comparePattern({
    pattern: { name: 'disclosure', requires: { 'roles.controls': 'aria-controls on the button' } },
    binding: { pattern: 'disclosure', exceptions: [{ requirement: 'roles.controls', reason: 'stale' }] },
    subjects: { 'roles.controls': el('button', { 'aria-controls': 'region-1' }) },
    resolveId: () => el('div'),
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /STALE EXCEPTION/);
});

test('an array subject is met only when every element meets it', () => {
  const ok = el('button', { 'aria-selected': 'false' });
  const bad = el('button');
  const p = (subject: unknown) => comparePattern({
    pattern: { name: 'tabs', requires: { 'states.selected': 'true on the active tab, false on the rest' } },
    binding: { pattern: 'tabs', exceptions: [] },
    subjects: { 'states.selected': subject },
    resolveId: () => el('div'),
  });
  assert.deepEqual(p([ok, ok, ok]), []);
  assert.equal(p([ok, bad, ok]).length, 1);
  assert.match(p([ok, bad, ok])[0] ?? '', /OVERCLAIM/);
});

test('the OVERCLAIM says how many of the collection failed', () => {
  const ok = el('button', { 'aria-selected': 'false' });
  const bad = el('button');
  const problems = comparePattern({
    pattern: { name: 'tabs', requires: { 'states.selected': 'x' } },
    binding: { pattern: 'tabs', exceptions: [] },
    subjects: { 'states.selected': [ok, bad, bad] },
    resolveId: () => el('div'),
  });
  assert.match(problems[0] ?? '', /2 of 3/);
});

test('a quantified requirement given ONE element throws', () => {
  assert.throws(
    () => comparePattern({
      pattern: { name: 'tabs', requires: { 'states.selected': 'x' } },
      binding: { pattern: 'tabs', exceptions: [] },
      subjects: { 'states.selected': el('button', { 'aria-selected': 'true' }) },
      resolveId: () => el('div'),
    }),
    /quantified.*array/s,
  );
});

test('a quantified requirement given a NULL subject says so, not "a single element"', () => {
  assert.throws(
    () => comparePattern({
      pattern: { name: 'tabs', requires: { 'states.selected': 'x' } },
      binding: { pattern: 'tabs', exceptions: [] },
      subjects: { 'states.selected': null },
      resolveId: () => el('div'),
    }),
    (e: Error) => /quantified.*array/s.test(e.message)
      && /subject is null/.test(e.message)
      && !/single element/.test(e.message),
  );
});

test('an unquantified requirement given one element is still fine', () => {
  const problems = comparePattern({
    pattern: { name: 'disclosure', requires: { 'roles.expanded': 'aria-expanded' } },
    binding: { pattern: 'disclosure', exceptions: [] },
    subjects: { 'roles.expanded': el('button', { 'aria-expanded': 'false' }) },
  });
  assert.deepEqual(problems, []);
});

test('an empty array reads as a missing subject, not as vacuously met', () => {
  const problems = comparePattern({
    pattern: { name: 'tabs', requires: { 'states.selected': 'x' } },
    binding: { pattern: 'tabs', exceptions: [] },
    subjects: { 'states.selected': [] },
    resolveId: () => el('div'),
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /no subject element/);
});

test('every QUANTIFIED and NOT_QUANTIFIED key names a real pattern requirement', () => {
  for (const map of [QUANTIFIED, NOT_QUANTIFIED]) {
    for (const key of map.keys()) {
      const [name = '', requirement = ''] = key.split(':');
      const pattern = PATTERNS.get(name);
      assert.ok(pattern, `${key}: no pattern file called "${name}"`);
      assert.ok(requirement in pattern.requires, `${key}: pattern "${name}" declares no "${requirement}"`);
    }
  }
});

test('every QUANTIFIED requirement is decidable per element', () => {
  for (const key of QUANTIFIED.keys()) {
    const requirement = key.split(':')[1] ?? '';
    assert.ok(DECIDABLE.has(requirement),
      `${key}: quantifying needs a per-element verdict, and this requirement is behavioural`);
  }
});

test('every entry carries a reason', () => {
  for (const map of [QUANTIFIED, NOT_QUANTIFIED]) {
    for (const [key, reason] of map) {
      assert.ok(typeof reason === 'string' && reason.length > 20, `${key}: no reason on file`);
    }
  }
});
