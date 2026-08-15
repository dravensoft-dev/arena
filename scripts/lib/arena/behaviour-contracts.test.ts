import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  validatePattern, loadPatterns, validateBinding, reactComponents, angularPrimitives,
  angularBindingPath, reactBindingPath, crossLayerAgrees, loadBinding, bindingCases,
} from './behaviour-contracts.ts';
import { pascal } from '../../utils/case.ts';
import { relPosix } from '../../utils/posix-path.ts';
import type { BehaviourBinding } from './behaviour-contracts.ts';

const ok = {
  name: 'dialog-modal',
  source: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
  requires: { 'roles.element': 'dialog', 'focus.trap': true },
};

test('a well-formed pattern has no problems', () => {
  assert.deepEqual(validatePattern('dialog-modal', ok), []);
});

test('a pattern whose name disagrees with its filename is a problem', () => {
  assert.match(validatePattern('modal', ok)[0] ?? '', /name "dialog-modal" does not match/);
});

test('a pattern with no source is a problem', () => {
  const { source, ...noSource } = ok;
  assert.match(validatePattern('dialog-modal', noSource)[0] ?? '', /source/);
});

test('a pattern with an empty requires map is a problem', () => {
  assert.match(validatePattern('dialog-modal', { ...ok, requires: {} })[0] ?? '', /at least one requirement/);
});

test('a requirement key must be dotted, so an exception can name exactly one leaf', () => {
  const flat = { ...ok, requires: { trap: true } };
  assert.match(validatePattern('dialog-modal', flat)[0] ?? '', /"trap" must be dotted/);
});

test('the none pattern is one of the two allowed to have no requirements', () => {
  const none = { name: 'none', source: 'n/a', requires: {} };
  assert.deepEqual(validatePattern('none', none), []);
});

test('the absent pattern is the other one allowed to have no requirements', () => {
  const absent = { name: 'absent', source: 'n/a', requires: {} };
  assert.deepEqual(validatePattern('absent', absent), []);
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
  assert.deepEqual(nonApg, ['absent', 'figure-with-data-table', 'progressbar', 'scrollable-region', 'select', 'status', 'textbox']);
});

const patterns = new Map([
  ['dialog-modal', { name: 'dialog-modal', source: 'x', requires: { 'focus.trap': true, 'keyboard.Escape': 'close' } }],
  ['none', { name: 'none', source: 'n/a', requires: {} }],
  ['absent', { name: 'absent', source: 'n/a', requires: {} }],
]);

test('a binding naming a real pattern with no exceptions is valid', () => {
  assert.deepEqual(validateBinding('ArenaDialog', 'react', { pattern: 'dialog-modal' }, patterns), []);
});

test('a binding naming a pattern that does not exist is a problem', () => {
  assert.match(validateBinding('ArenaDialog', 'react', { pattern: 'modal' }, patterns)[0] ?? '', /unknown pattern "modal"/);
});

test('binding none without a reason is a problem', () => {
  assert.match(validateBinding('ArenaCard', 'react', { pattern: 'none' }, patterns)[0] ?? '', /requires a reason/);
});

test('binding none with a reason is valid', () => {
  assert.deepEqual(validateBinding('ArenaCard', 'react', { pattern: 'none', reason: 'a surface' }, patterns), []);
});

test('binding absent without a reason is a problem', () => {
  assert.match(
    validateBinding('ArenaCalendar', 'angular-delegated', { pattern: 'absent' }, patterns)[0] ?? '',
    /binding absent requires a reason/,
  );
});

test('binding absent with a reason is valid', () => {
  assert.deepEqual(
    validateBinding('ArenaCalendar', 'angular-delegated', { pattern: 'absent', reason: 'no such component' }, patterns),
    [],
  );
});

test('none and absent are distinct patterns, not the same fact spelled two ways', () => {
  const renders = { pattern: 'none', reason: 'a presentational surface that renders' };
  const doesNotExist = { pattern: 'absent', reason: 'no such component exists in this layer' };
  assert.notEqual(renders.pattern, doesNotExist.pattern);
  assert.deepEqual(validateBinding('ArenaCard', 'angular-delegated', renders, patterns), []);
  assert.deepEqual(validateBinding('ArenaCalendar', 'angular-delegated', doesNotExist, patterns), []);
});

test('an exception naming a requirement the pattern does not have is a problem', () => {
  const b = { pattern: 'dialog-modal', exceptions: [{ requirement: 'focus.restore', reason: 'x' }] };
  assert.match(validateBinding('ArenaDialog', 'react', b, patterns)[0] ?? '', /excepts "focus.restore", which pattern "dialog-modal" does not require/);
});

test('an exception without a reason is a problem', () => {
  const b = { pattern: 'dialog-modal', exceptions: [{ requirement: 'focus.trap' }] };
  assert.match(validateBinding('ArenaDialog', 'react', b, patterns)[0] ?? '', /reason/);
});

test('a cases entry that does not name itself is rejected, and it used to clear the gate entirely', () => {
  const b = { cases: [{ pattern: 'none', reason: 'a label' }] };
  const problems = validateBinding('ArenaDialog', 'react', b, patterns);
  assert.match(problems[0] ?? '', /cases\[0\] declares no "name"/);
});

test('a nameless case skips the when rule too, so the name check must not depend on it', () => {
  const nameless = { cases: [{ pattern: 'dialog-modal', when: 'open' }] };
  assert.equal(validateBinding('ArenaDialog', 'react', nameless, patterns).length, 1);

  const named = { cases: [{ name: 'open', pattern: 'dialog-modal' }] };
  assert.match(validateBinding('ArenaDialog', 'react', named, patterns)[0] ?? '', /must say WHEN it is produced/);
});

test('a duplicate case name is rejected, because crossLayerAgrees would compare only the last one', () => {
  const b = {
    cases: [
      { name: 'open', when: 'open is true', pattern: 'dialog-modal' },
      { name: 'open', when: 'open is true and inert', pattern: 'none', reason: 'inert' },
    ],
  };
  assert.match(validateBinding('ArenaDialog', 'react', b, patterns)[0] ?? '', /declares the case name "open" more than once/);
});

test('distinct names on a well-formed cased binding are no problem', () => {
  const b = {
    cases: [
      { name: 'closed', when: 'open is false', pattern: 'none', reason: 'nothing renders' },
      { name: 'open', when: 'open is true', pattern: 'dialog-modal' },
    ],
  };
  assert.deepEqual(validateBinding('ArenaDialog', 'react', b, patterns), []);
});

test('a delegated binding must name what provides the behaviour', () => {
  const b = { pattern: 'dialog-modal', delegatedTo: '' };
  assert.match(validateBinding('ArenaDialog', 'angular', b, patterns)[0] ?? '', /delegatedTo/);
});

test('an angular binding must name its React counterpart', () => {
  const b = { pattern: 'dialog-modal' };
  assert.match(validateBinding('stat-card', 'angular', b, patterns)[0] ?? '', /must declare "component"/);
});

test('an angular binding that names its counterpart is valid', () => {
  const b = { pattern: 'dialog-modal', component: 'ArenaStatCard' };
  assert.deepEqual(validateBinding('stat-card', 'angular', b, patterns), []);
});

test('the React inventory finds every component, no category and no loose file', () => {
  const found = reactComponents('.');
  assert.equal(found.length, 62);
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
  assert.equal(found.length, 62);
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

test('two bindings naming the same pattern agree', () => {
  assert.equal(crossLayerAgrees({ pattern: 'grid' }, { pattern: 'grid' }), true);
});

test('a declared divergesFrom on either side is accepted', () => {
  assert.equal(crossLayerAgrees({ pattern: 'grid' }, { pattern: 'none', divergesFrom: 'grid' }), true);
  assert.equal(crossLayerAgrees({ pattern: 'grid', divergesFrom: 'none' }, { pattern: 'none' }), true);
});

test('a real mismatch with no divergesFrom on either side disagrees', () => {
  assert.equal(crossLayerAgrees({ pattern: 'grid' }, { pattern: 'none' }), false);
});

test('divergesFrom can name a pattern the other side binds in ONE of its cases', () => {
  const cased: BehaviourBinding = { cases: [
    { name: 'row', when: 'wide', pattern: 'none', exceptions: [] },
    { name: 'card', when: 'narrow', pattern: 'button', exceptions: [] },
  ] };

  assert.equal(crossLayerAgrees(cased, { pattern: 'none', divergesFrom: 'button' }), true,
    'a flat layer may diverge from a render only the cased layer has');
  assert.equal(crossLayerAgrees({ pattern: 'none', divergesFrom: 'button' }, cased), true,
    'and in the other direction');

  assert.equal(crossLayerAgrees(cased, { pattern: 'none', divergesFrom: 'grid' }), false,
    'naming a pattern the other side binds nowhere is not a divergence, it is a typo');
  assert.equal(crossLayerAgrees(cased, { pattern: 'none' }), false,
    'without divergesFrom the case names still have to match');
});

test('absent on either side is skipped even with no divergesFrom declared', () => {
  assert.equal(crossLayerAgrees({ pattern: 'grid' }, { pattern: 'absent' }), true);
  assert.equal(crossLayerAgrees({ pattern: 'absent' }, { pattern: 'grid' }), true);
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

test('two cased bindings whose case names match but a case pattern disagrees do not agree', () => {
  const react: BehaviourBinding = { cases: [
    { name: 'danger', when: 'tone is "danger"', pattern: 'alert', exceptions: [] },
    { name: 'advisory', when: 'any other tone', pattern: 'status', exceptions: [] },
  ] };
  const angular: BehaviourBinding = { cases: [
    { name: 'danger', when: 'tone is "danger"', pattern: 'status', exceptions: [] },
    { name: 'advisory', when: 'any other tone', pattern: 'status', exceptions: [] },
  ] };
  assert.equal(crossLayerAgrees(react, angular), false);
});

test('two cased bindings whose case names and per-case patterns all match agree', () => {
  const react: BehaviourBinding = { cases: [
    { name: 'danger', when: 'tone is "danger"', pattern: 'alert', exceptions: [] },
    { name: 'advisory', when: 'any other tone', pattern: 'status', exceptions: [] },
  ] };
  const angular: BehaviourBinding = { cases: [
    { name: 'advisory', when: 'any other tone', pattern: 'status', exceptions: [] },
    { name: 'danger', when: 'tone is "danger"', pattern: 'alert', exceptions: [] },
  ] };
  assert.equal(crossLayerAgrees(react, angular), true);
});

test('a cased binding against an absent binding agrees, both directions', () => {
  const cased: BehaviourBinding = { cases: [
    { name: 'danger', when: 'tone is "danger"', pattern: 'alert', exceptions: [] },
    { name: 'advisory', when: 'any other tone', pattern: 'status', exceptions: [] },
  ] };
  const absent = { pattern: 'absent', reason: 'Angular has no such component at all.' };
  assert.equal(crossLayerAgrees(cased, absent), true);
  assert.equal(crossLayerAgrees(absent, cased), true);
});

test('a cased binding whose divergesFrom names the other, flat side agrees', () => {
  const cased: BehaviourBinding = { divergesFrom: 'alert', cases: [
    { name: 'danger', when: 'tone is "danger"', pattern: 'alert', exceptions: [] },
    { name: 'advisory', when: 'any other tone', pattern: 'status', exceptions: [] },
  ] };
  const flat = { pattern: 'alert', delegatedTo: 'Angular Material MatSnackBar' };
  assert.equal(crossLayerAgrees(cased, flat), true);
  assert.equal(crossLayerAgrees(flat, cased), true);
});

test('two cased bindings with mismatched case patterns and no divergesFrom still disagree', () => {
  const react: BehaviourBinding = { cases: [
    { name: 'danger', when: 'tone is "danger"', pattern: 'alert', exceptions: [] },
    { name: 'advisory', when: 'any other tone', pattern: 'status', exceptions: [] },
  ] };
  const angular: BehaviourBinding = { cases: [
    { name: 'danger', when: 'tone is "danger"', pattern: 'status', exceptions: [] },
    { name: 'advisory', when: 'any other tone', pattern: 'status', exceptions: [] },
  ] };
  assert.equal(crossLayerAgrees(react, angular), false);
});
