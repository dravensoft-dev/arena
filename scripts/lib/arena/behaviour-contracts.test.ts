import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  validatePattern, loadPatterns, validateBinding, reactComponents, angularPrimitives,
  angularBindingPath, reactBindingPath, crossLayerAgrees, loadBinding, bindingCases, bindingAlso, caseSetRefusal,
} from './behaviour-contracts.ts';
import { layerBindings } from './vocabulary-index.ts';
import { pascal } from '../../utils/case.ts';
import { relPosix } from '../../utils/posix-path.ts';
import type { BehaviourBinding } from './behaviour-contracts.ts';

const ok = {
  name: 'dialog-modal',
  source: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
  element: 'dialog',
  requires: { 'roles.element': 'dialog', 'focus.trap': true },
};
type PatternRow = { name: string; stem: string; pattern: unknown; expected: RegExp | null; joined?: boolean; why?: string };
const { element: _element, ...OK_NO_ELEMENT } = ok;
const { source: _source, ...OK_NO_SOURCE } = ok;

const PATTERN_PROBLEMS: PatternRow[] = [
  { name: 'a pattern requiring roles.element and naming no element is a problem', stem: 'dialog-modal', pattern: OK_NO_ELEMENT, expected: /declares no "element"/ },
  {
    name: 'an element nobody required is a problem',
    stem: 'dialog-modal',
    pattern: { ...ok, requires: { 'focus.trap': true } },
    expected: /requires no roles.element/,
  },
  {
    name: 'an element the prose does not name is a problem',
    stem: 'dialog-modal',
    pattern: { ...ok, element: 'alertdialog' },
    expected: /which its roles.element does not name/,
  },
  { name: 'a well-formed pattern has no problems', stem: 'dialog-modal', pattern: ok, expected: null },
  { name: 'a pattern whose name disagrees with its filename is a problem', stem: 'modal', pattern: ok, expected: /name "dialog-modal" does not match/ },
  { name: 'a pattern with no source is a problem', stem: 'dialog-modal', pattern: OK_NO_SOURCE, expected: /source/ },
  { name: 'a pattern with an empty requires map is a problem', stem: 'dialog-modal', pattern: { ...ok, requires: {} }, expected: /at least one requirement/ },
  {
    name: 'a pattern description naming a component is a problem',
    stem: 'dialog-modal',
    pattern: { ...ok, description: 'Shared by ArenaDialog and ArenaOnboarding.' },
    expected: /names ArenaDialog, ArenaOnboarding/,
  },
  {
    name: 'a pattern description carrying no component name is not a problem',
    stem: 'dialog-modal',
    pattern: { ...ok, description: 'A window that takes the whole interaction until dismissed.' },
    expected: null,
  },
  {
    name: 'a requirement key must be dotted, so an exception can name exactly one leaf',
    stem: 'dialog-modal',
    pattern: { ...ok, requires: { trap: true } },
    expected: /"trap" must be dotted/,
  },
  {
    name: 'the none pattern is one of the two allowed to have no requirements',
    stem: 'none',
    pattern: { name: 'none', source: 'n/a', requires: {} },
    expected: null,
  },
  {
    name: 'the absent pattern is the other one allowed to have no requirements',
    stem: 'absent',
    pattern: { name: 'absent', source: 'n/a', requires: {} },
    expected: null,
  },
  {
    name: 'an additive pattern may require nothing in the roles family',
    stem: 'bad',
    pattern: { name: 'bad', source: 'x', additive: true, description: 'x', requires: { 'roles.element': 'main' } },
    expected: /may require nothing in the roles family/,
    joined: true,
    why: 'which element a component renders is answered once, by the pattern it binds; a second pattern '
      + 'answering it again is a contradiction with no way to report which of the two was broken',
  },
  {
    name: 'additive is true or it is absent',
    stem: 'bad',
    pattern: { name: 'bad', source: 'x', additive: false, requires: { 'focus.trap': true } },
    expected: /is present and not true/,
    joined: true,
  },
  {
    name: 'an additive pattern must say why a component owes it as well',
    stem: 'bad',
    pattern: { name: 'bad', source: 'x', additive: true, requires: { 'alternative.jsonLd': 'a block' } },
    expected: /must carry a description/,
    joined: true,
    why: 'it is bound alongside another pattern rather than instead of one, so nothing else on the page '
      + 'says why a component owes both',
  },
];

test('validatePattern names what is wrong with a pattern, and nothing with a sound one', () => {
  assert.ok(PATTERN_PROBLEMS.length > 0, 'the table has rows');
  for (const row of PATTERN_PROBLEMS) {
    const problems = validatePattern(row.stem, row.pattern as Parameters<typeof validatePattern>[1]);
    const message = row.why ? `${row.name}: ${row.why}` : row.name;
    if (row.expected === null) assert.deepEqual(problems, [], message);
    else assert.match(row.joined ? problems.join('\n') : (problems[0] ?? ''), row.expected, message);
  }
});

test('every pattern on disk is valid', () => {
  const patterns = loadPatterns('.');
  const problems = [...patterns].flatMap(([stem, p]) => validatePattern(stem, p));
  assert.deepEqual(problems, []);
});

test('every pattern but none and absent cites a w3.org source', () => {
  for (const [stem, p] of loadPatterns('.')) {
    if (stem === 'none' || stem === 'absent') continue;
    assert.match(p.source, /^https:\/\/www\.w3\.org\//, `${stem} must cite a w3.org source`);
  }
});

test('none aside, exactly the patterns with no APG pattern page cite something else', () => {
  const nonApg = [...loadPatterns('.')]
    .filter(([stem, p]) => stem !== 'none' && !p.source.includes('/ARIA/apg/'))
    .map(([stem]) => stem)
    .sort();
  assert.deepEqual(nonApg, ['absent', 'dialog-nonmodal', 'figure-with-data-table', 'group', 'progressbar', 'scrollable-region', 'select', 'status', 'structured-data', 'textbox']);
});

const patterns = new Map([
  ['dialog-modal', { name: 'dialog-modal', source: 'x', requires: { 'focus.trap': true, 'keyboard.Escape': 'close' } }],
  ['none', { name: 'none', source: 'n/a', requires: {} }],
  ['absent', { name: 'absent', source: 'n/a', requires: {} }],
  ['machine-readable', { name: 'machine-readable', source: 'x', additive: true, description: 'x', requires: { 'alternative.jsonLd': 'a block' } }],
]);

type BindingRow = {
  name: string;
  component: string;
  layer: string;
  binding: unknown;
  expected: [] | RegExp | number;
  joined?: boolean;
  why?: string;
};
const ALSO_MACHINE_READABLE = [{ pattern: 'machine-readable' }];

const BINDING_PROBLEMS: BindingRow[] = [
  { name: 'a binding naming a real pattern with no exceptions is valid', component: 'ArenaDialog', layer: 'react', binding: { pattern: 'dialog-modal' }, expected: [] },
  { name: 'a binding naming a pattern that does not exist is a problem', component: 'ArenaDialog', layer: 'react', binding: { pattern: 'modal' }, expected: /unknown pattern "modal"/ },
  { name: 'binding none without a reason is a problem', component: 'ArenaCard', layer: 'react', binding: { pattern: 'none' }, expected: /requires a reason/ },
  { name: 'binding none with a reason is valid', component: 'ArenaCard', layer: 'react', binding: { pattern: 'none', reason: 'a surface' }, expected: [] },
  { name: 'binding absent without a reason is a problem', component: 'ArenaCalendar', layer: 'angular-delegated', binding: { pattern: 'absent' }, expected: /binding absent requires a reason/ },
  {
    name: 'binding absent with a reason is valid',
    component: 'ArenaCalendar',
    layer: 'angular-delegated',
    binding: { pattern: 'absent', reason: 'no such component' },
    expected: [],
  },
  {
    name: 'an exception naming a requirement the pattern does not have is a problem',
    component: 'ArenaDialog',
    layer: 'react',
    binding: { pattern: 'dialog-modal', exceptions: [{ requirement: 'focus.restore', reason: 'x' }] },
    expected: /excepts "focus.restore", which pattern "dialog-modal" does not require/,
  },
  {
    name: 'an exception without a reason is a problem',
    component: 'ArenaDialog',
    layer: 'react',
    binding: { pattern: 'dialog-modal', exceptions: [{ requirement: 'focus.trap' }] },
    expected: /reason/,
  },
  {
    name: 'a cases entry that does not name itself is rejected, and does not clear the gate',
    component: 'ArenaDialog',
    layer: 'react',
    binding: { cases: [{ pattern: 'none', reason: 'a label' }] },
    expected: /cases\[0\] declares no "name"/,
  },
  {
    name: 'a nameless case skips the when rule too, so the name check must not depend on it',
    component: 'ArenaDialog',
    layer: 'react',
    binding: { cases: [{ pattern: 'dialog-modal', when: 'open' }] },
    expected: 1,
  },
  {
    name: 'a named case that omits when must say WHEN it is produced',
    component: 'ArenaDialog',
    layer: 'react',
    binding: { cases: [{ name: 'open', pattern: 'dialog-modal' }] },
    expected: /must say WHEN it is produced/,
  },
  {
    name: 'a duplicate case name is rejected, because crossLayerAgrees would compare only the last one',
    component: 'ArenaDialog',
    layer: 'react',
    binding: {
      cases: [
        { name: 'open', when: 'open is true', pattern: 'dialog-modal' },
        { name: 'open', when: 'open is true and inert', pattern: 'none', reason: 'inert' },
      ],
    },
    expected: /declares the case name "open" more than once/,
  },
  {
    name: 'distinct names on a well-formed cased binding are no problem',
    component: 'ArenaDialog',
    layer: 'react',
    binding: {
      cases: [
        { name: 'closed', when: 'open is false', pattern: 'none', reason: 'nothing renders' },
        { name: 'open', when: 'open is true', pattern: 'dialog-modal' },
      ],
    },
    expected: [],
  },
  {
    name: 'a delegated binding must name what provides the behaviour',
    component: 'ArenaDialog',
    layer: 'angular',
    binding: { pattern: 'dialog-modal', delegatedTo: '' },
    expected: /delegatedTo/,
  },
  { name: 'an angular binding must name its React counterpart', component: 'stat-card', layer: 'angular', binding: { pattern: 'dialog-modal' }, expected: /must declare "component"/ },
  {
    name: 'an angular binding that names its counterpart is valid',
    component: 'stat-card',
    layer: 'angular',
    binding: { pattern: 'dialog-modal', component: 'ArenaStatCard' },
    expected: [],
  },
  {
    name: 'a component may add an additive pattern to the one it binds',
    component: 'ArenaBreadcrumbs',
    layer: 'react',
    binding: { pattern: 'dialog-modal', also: ALSO_MACHINE_READABLE },
    expected: [],
    why: 'this is the whole reason "also" exists: a pattern that says what a component owes BESIDES its '
      + 'own has nowhere to go in a schema where a binding declares one pattern or a set of cases, '
      + 'and cases are alternative renders rather than a second thing true of the same one',
  },
  {
    name: 'an ordinary pattern cannot be added to another',
    component: 'ArenaBreadcrumbs',
    layer: 'react',
    binding: { pattern: 'machine-readable', also: [{ pattern: 'dialog-modal' }] },
    expected: /is not additive/,
    joined: true,
    why: 'a pattern answering roles, keys or focus belongs where a layer can be held to exactly one',
  },
  {
    name: 'an additive pattern cannot be bound on its own',
    component: 'ArenaBreadcrumbs',
    layer: 'react',
    binding: { pattern: 'machine-readable' },
    expected: /that one is additive/,
    joined: true,
    why: 'alone it would leave the roles, the keys and the focus unanswered rather than answered as none',
  },
  {
    name: 'adding the same pattern twice is a problem',
    component: 'ArenaBreadcrumbs',
    layer: 'react',
    binding: { pattern: 'dialog-modal', also: [...ALSO_MACHINE_READABLE, ...ALSO_MACHINE_READABLE] },
    expected: /adds "machine-readable" twice/,
    joined: true,
    why: 'one of the two would govern nothing, and an exception written on the wrong one would be '
      + 'silently ignored rather than reported',
  },
  {
    name: 'an exception against an additive pattern is held to that pattern',
    component: 'ArenaBreadcrumbs',
    layer: 'react',
    binding: {
      pattern: 'dialog-modal',
      also: [{ pattern: 'machine-readable', exceptions: [{ requirement: 'focus.trap', reason: 'x' }] }],
    },
    expected: /excepts "focus.trap", which pattern "machine-readable" does not require/,
    joined: true,
    why: 'the primary pattern requires it and the additive one does not, so naming it here excepts '
      + 'nothing while reading as though it excepted something',
  },
  {
    name: 'an exception against an additive pattern still needs its reason',
    component: 'ArenaBreadcrumbs',
    layer: 'react',
    binding: {
      pattern: 'dialog-modal',
      also: [{ pattern: 'machine-readable', exceptions: [{ requirement: 'alternative.jsonLd' }] }],
    },
    expected: /has no reason/,
    joined: true,
  },
];

test('validateBinding names what is wrong with a binding, and nothing with a sound one', () => {
  assert.ok(BINDING_PROBLEMS.length > 0, 'the table has rows');
  for (const row of BINDING_PROBLEMS) {
    const problems = validateBinding(row.component, row.layer, row.binding as Parameters<typeof validateBinding>[2], patterns);
    const message = row.why ? `${row.name}: ${row.why}` : row.name;
    if (Array.isArray(row.expected)) assert.deepEqual(problems, row.expected, message);
    else if (typeof row.expected === 'number') assert.equal(problems.length, row.expected, message);
    else assert.match(row.joined ? problems.join('\n') : (problems[0] ?? ''), row.expected, message);
  }
});

test('the React inventory finds every component, no category and no loose file', () => {
  const found = reactComponents('.');
  assert.equal(found.length, 100);
  assert.ok(found.includes('ArenaDialog'));
  assert.ok(found.includes('ArenaCalendarEvent'));
  assert.ok(found.includes('ArenaTableRow'));
  assert.ok(found.includes('ArenaTableCell'));
  assert.ok(found.includes('ArenaSideNavItem'));
  assert.ok(found.includes('ArenaSideNavSection'));
  assert.ok(found.includes('ArenaSideNavCollapsible'));

  assert.ok(!found.includes('SideNavInject'));

  assert.ok(!found.includes('side-nav-inject'));
  assert.ok(!found.some((c) => c.endsWith('.card.entry')));

  for (const category of ['brand', 'charts', 'display', 'feedback', 'forms', 'layout', 'navigation'])
    assert.ok(!found.includes(pascal(category)), `${category} is a category, not a component`);
});

test('the Angular inventory finds every component, no category and no bare module', () => {
  const found = angularPrimitives('.');
  assert.equal(found.length, 100);
  assert.ok(found.includes('arena-tag'));
  assert.ok(found.includes('arena-bar-chart'));
  assert.ok(found.includes('arena-button'));
  assert.ok(found.includes('arena-tooltip'));
  assert.ok(found.includes('arena-calendar'));
  assert.ok(found.includes('arena-calendar-event'));
  assert.ok(!found.includes('CalendarInternals.ts'));
  assert.ok(!found.includes('ArenaCalendarState.ts'));
  for (const category of ['brand', 'charts', 'display', 'feedback', 'forms', 'layout', 'navigation'])
    assert.ok(!found.includes(category), `${category} is a category, not a component`);
  assert.ok(!found.includes('ChartDataTable.test.ts'));
  assert.ok(!found.includes('index.ts'));
  assert.ok(!found.includes('chart-internals.ts'));
  const base = 'frameworks/angular/components';
  const categories = readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name);
  for (const name of found)
    assert.ok(
      categories.some((c) => {
        const p = join(base, c, name);
        return existsSync(p) && statSync(p).isDirectory();
      }),
      `${name} does not resolve to a component directory under ${base}/<category>/`,
    );
});

test('an Angular binding path resolves the category by looking and the stem as Pascal', () => {
  const found = angularBindingPath('.', 'arena-bar-chart');
  assert.equal(relPosix('.', found?.path ?? ''),
    'frameworks/angular/components/charts/arena-bar-chart/ArenaBarChart.behaviour.json',
    'the path is spelled for the host, since nothing but readJson ever receives it, so what is '
    + 'held here is where it looked and not which separator this machine writes');
  assert.equal(found?.stem, 'ArenaBarChart');
  assert.equal(found?.tail, 'charts/arena-bar-chart/ArenaBarChart.behaviour.json');
  assert.equal(angularBindingPath('.', 'no-such-component'), null);
});

test('a React binding path resolves the category by looking and the stem as Pascal', () => {
  const found = reactBindingPath('.', 'arena-bar-chart');
  assert.equal(relPosix('.', found?.path ?? ''),
    'frameworks/react/components/charts/arena-bar-chart/ArenaBarChart.behaviour.json');
  assert.equal(found?.stem, 'ArenaBarChart');
  assert.equal(found?.tail, 'charts/arena-bar-chart/ArenaBarChart.behaviour.json');
  assert.equal(reactBindingPath('.', 'no-such-component'), null);
});

test('a component bound in both layers now spells the same tail on both sides', () => {
  assert.equal(reactBindingPath('.', 'arena-tag')?.tail, angularBindingPath('.', 'arena-tag')?.tail);
  assert.equal(reactBindingPath('.', 'arena-tag')?.tail, 'display/arena-tag/ArenaTag.behaviour.json');
});

const caseOf = (name: string, when: string, pattern: string) => ({ name, when, pattern, exceptions: [] });
const DANGER = 'tone is "danger"';
const ANY_OTHER = 'any other tone';
const ALERT_STATUS: BehaviourBinding = { cases: [caseOf('danger', DANGER, 'alert'), caseOf('advisory', ANY_OTHER, 'status')] };
const STATUS_STATUS: BehaviourBinding = { cases: [caseOf('danger', DANGER, 'status'), caseOf('advisory', ANY_OTHER, 'status')] };
const ALERT_STATUS_REVERSED: BehaviourBinding = { cases: [caseOf('advisory', ANY_OTHER, 'status'), caseOf('danger', DANGER, 'alert')] };
const ROW_CARD: BehaviourBinding = { cases: [
  { name: 'row', when: 'wide', pattern: 'none', exceptions: [] },
  { name: 'card', when: 'narrow', pattern: 'button', exceptions: [] },
] };
const ABSENT = { pattern: 'absent', reason: 'Angular has no such component at all.' };
const ALERT_FLAT = { pattern: 'alert', delegatedTo: 'Angular Material MatSnackBar' };
const ALERT_DIVERGES: BehaviourBinding = { divergesFrom: 'alert', cases: ALERT_STATUS.cases };

const AGREEMENTS: { name: string; checks: [a: BehaviourBinding, b: BehaviourBinding, expected: boolean, why?: string][] }[] = [
  { name: 'two bindings naming the same pattern agree', checks: [[{ pattern: 'grid' }, { pattern: 'grid' }, true]] },
  {
    name: 'a declared divergesFrom on either side is accepted',
    checks: [
      [{ pattern: 'grid' }, { pattern: 'none', divergesFrom: 'grid' }, true],
      [{ pattern: 'grid', divergesFrom: 'none' }, { pattern: 'none' }, true],
    ],
  },
  { name: 'a real mismatch with no divergesFrom on either side disagrees', checks: [[{ pattern: 'grid' }, { pattern: 'none' }, false]] },
  {
    name: 'divergesFrom can name a pattern the other side binds in ONE of its cases',
    checks: [
      [ROW_CARD, { pattern: 'none', divergesFrom: 'button' }, true, 'a flat layer may diverge from a render only the cased layer has'],
      [{ pattern: 'none', divergesFrom: 'button' }, ROW_CARD, true, 'and in the other direction'],
      [ROW_CARD, { pattern: 'none', divergesFrom: 'grid' }, false, 'naming a pattern the other side binds nowhere is not a divergence, it is a typo'],
      [ROW_CARD, { pattern: 'none' }, false, 'without divergesFrom the case names still have to match'],
    ],
  },
  {
    name: 'absent on either side is skipped even with no divergesFrom declared',
    checks: [
      [{ pattern: 'grid' }, { pattern: 'absent' }, true],
      [{ pattern: 'absent' }, { pattern: 'grid' }, true],
    ],
  },
  {
    name: 'two cased bindings whose case names match but a case pattern disagrees do not agree',
    checks: [[ALERT_STATUS, STATUS_STATUS, false]],
  },
  {
    name: 'two cased bindings whose case names and per-case patterns all match agree',
    checks: [[ALERT_STATUS, ALERT_STATUS_REVERSED, true]],
  },
  {
    name: 'a cased binding against an absent binding agrees, both directions',
    checks: [[ALERT_STATUS, ABSENT, true], [ABSENT, ALERT_STATUS, true]],
  },
  {
    name: 'a cased binding whose divergesFrom names the other, flat side agrees',
    checks: [[ALERT_DIVERGES, ALERT_FLAT, true], [ALERT_FLAT, ALERT_DIVERGES, true]],
  },
  {
    name: 'two cased bindings with mismatched case patterns and no divergesFrom still disagree',
    checks: [[ALERT_STATUS, STATUS_STATUS, false]],
  },
];

test('crossLayerAgrees compares two layers\' bindings by pattern, case and declared divergence', () => {
  assert.ok(AGREEMENTS.length > 0, 'the table has rows');
  for (const row of AGREEMENTS) {
    for (const [a, b, expected, why] of row.checks) assert.equal(crossLayerAgrees(a, b), expected, why ? `${row.name}: ${why}` : row.name);
  }
});

test('loadBinding reads a real binding from disk', () => {
  const b = loadBinding('./frameworks/react/components/feedback/arena-dialog/ArenaDialog.behaviour.json');
  assert.equal(b.pattern, 'dialog-modal');
  assert.ok(Array.isArray(b.exceptions));
});

test('the real ArenaCalendar binding needs no divergesFrom to agree with React', () => {
  const reactBinding = { pattern: 'grid' };
  const angularCalendar = { pattern: 'absent', reason: 'Angular has no such component at all.' };
  assert.equal(crossLayerAgrees(reactBinding, angularCalendar), true);
});

test('a flat binding is one anonymous case', () => {
  const cases = bindingCases({ pattern: 'status', exceptions: [{ requirement: 'roles.label' }] });
  assert.equal(cases.length, 1);
  assert.equal(cases[0]?.name, null);
  assert.equal(cases[0]?.pattern, 'status');
  assert.equal(cases[0]?.exceptions.length, 1);
});

test('a flat binding with no exceptions still yields an exceptions array', () => {

  assert.deepEqual(bindingCases({ pattern: 'none' })[0]?.exceptions, []);
});

test('a cased binding yields one entry per case, in order', () => {
  const cases = bindingCases({
    cases: [
      { name: 'danger', when: 'tone is "danger"', pattern: 'alert', exceptions: [] },
      { name: 'advisory', when: 'any other tone', pattern: 'status', exceptions: [] },
    ],
  });
  assert.deepEqual(cases.map((c) => c.name), ['danger', 'advisory']);
  assert.deepEqual(cases.map((c) => c.pattern), ['alert', 'status']);
});

test('a case inherits the binding reason and may override it', () => {
  const [inherited] = bindingCases({ reason: 'from the binding',
    cases: [{ name: 'a', when: 'x', pattern: 'none', exceptions: [] }] });
  assert.equal(inherited?.reason, 'from the binding');
  const [own] = bindingCases({ reason: 'from the binding',
    cases: [{ name: 'a', when: 'x', pattern: 'none', reason: 'its own', exceptions: [] }] });
  assert.equal(own?.reason, 'its own');
  assert.equal(bindingCases({ pattern: 'status' })[0]?.reason, null);
});

test('a binding declaring both pattern and cases is rejected by validateBinding', () => {
  const problems = validateBinding('ArenaAlert', 'react',
    { pattern: 'alert', cases: [{ name: 'x', when: 'y', pattern: 'alert', exceptions: [] }] },
    new Map([['alert', { name: 'alert', requires: {} }]]));
  assert.ok(problems.some((p) => /both .*pattern.* and .*cases/i.test(p)), problems.join('\n'));
});

test('two layers must add the same patterns, or they are not one component', () => {
  const withIt = { pattern: 'dialog-modal', also: [{ pattern: 'machine-readable' }] };
  const without = { pattern: 'dialog-modal' };
  assert.equal(crossLayerAgrees(withIt, without), false,
    'an additive pattern one layer ships and the other does not is exactly the divergence this '
    + 'branch exists to catch: a crawler would be told about the React page and not the Angular one');
  assert.equal(crossLayerAgrees(withIt, { ...withIt }), true);
});

test('every binding of dialog-modal or alertdialog adds modal-focus', () => {
  const offenders = layerBindings()
    .filter(([, binding]) => bindingCases(binding).some(({ pattern }) => pattern === 'dialog-modal' || pattern === 'alertdialog'))
    .filter(([, binding]) => !bindingAlso(binding).some(({ pattern }) => pattern === 'modal-focus'))
    .map(([name]) => name);
  assert.deepEqual(offenders, [],
    'focus and Escape are written once, in modal-focus, and a dialog owes them under its own role: '
    + 'a binding that names the role and not the focus is a dialog nobody checked the focus of');
});

const CASES_PATH = '/x/Alert.behaviour.json';
const twoCases = bindingCases({
  cases: [
    { name: 'danger', when: 'tone is "danger"', pattern: 'alert', exceptions: [] },
    { name: 'advisory', when: 'any other tone', pattern: 'status', exceptions: [] },
  ],
});

test('caseSetRefusal refuses a flat binding', () => {
  const flat = bindingCases({ pattern: 'status', exceptions: [] });
  const refusal = caseSetRefusal(CASES_PATH, flat, ['only']) ?? '';
  assert.match(refusal, /declares no cases/);
  assert.ok(refusal.startsWith(CASES_PATH));
});

test('caseSetRefusal names the declared case a suite never rendered', () => {
  const refusal = caseSetRefusal(CASES_PATH, twoCases, ['danger']) ?? '';
  assert.match(refusal, /never rendered: advisory/);
  assert.ok(refusal.startsWith(CASES_PATH));
});

test('caseSetRefusal names a rendered case the binding does not declare', () => {
  const refusal = caseSetRefusal(CASES_PATH, twoCases, ['danger', 'advisory', 'typo']) ?? '';
  assert.match(refusal, /not declared in the binding: typo/);
  assert.ok(refusal.startsWith(CASES_PATH));
});

test('caseSetRefusal refuses a case name declared twice', () => {
  const twice = bindingCases({
    cases: [
      { name: 'danger', when: 'tone is "danger"', pattern: 'alert', exceptions: [] },
      { name: 'danger', when: 'tone is still "danger"', pattern: 'status', exceptions: [] },
    ],
  });
  const refusal = caseSetRefusal(CASES_PATH, twice, ['danger']) ?? '';
  assert.match(refusal, /declares the same case name more than once: danger/);
  assert.ok(refusal.startsWith(CASES_PATH));
});

test('caseSetRefusal is null when the rendered set is the declared set', () => {
  assert.equal(caseSetRefusal(CASES_PATH, twoCases, ['advisory', 'danger']), null);
});
