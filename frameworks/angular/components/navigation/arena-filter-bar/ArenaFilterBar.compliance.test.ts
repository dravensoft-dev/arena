/* The group pattern requires the role alone, so the name the bar promises is asserted directly.
 * The rest is the focus rule the bar owns: once the host drops a removed chip, focus lands on the
 * chip now in its place, else the last chip, else the first tab stop in content, and Clear all
 * lands on the first tab stop. A removal the host refuses moves nothing. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaAppliedFilter } from '../../../Api.generated';
import { ArenaFilterBar } from './ArenaFilterBar';
import { ArenaSelect } from '../../forms/arena-select/ArenaSelect';
import { ArenaInput } from '../../forms/arena-input/ArenaInput';
import { ArenaSegmentedControl } from '../arena-segmented-control/ArenaSegmentedControl';
import { ArenaCombobox } from '../../forms/arena-combobox/ArenaCombobox';
import { ArenaMultiSelect } from '../../forms/arena-multi-select/ArenaMultiSelect';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';

const BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-filter-bar/ArenaFilterBar.behaviour.json');
const APPLIED: ArenaAppliedFilter[] = [
  { id: 'region', label: 'Region: Europe West' },
  { id: 'status', label: 'Status: Failed' },
  { id: 'owner', label: 'Owner: Platform' },
];
const OPTIONS = [{ value: 'eu', label: 'Europe West' }, { value: 'us', label: 'US East' }];

const page = document.documentElement;
before(() => { page.style.setProperty('--bp-sm', '480px'); });
after(() => { page.style.removeProperty('--bp-sm'); });

@Component({
  selector: 'filter-bar-compliance-host',
  standalone: true,
  imports: [ArenaFilterBar, ArenaSelect, ArenaInput, ArenaSegmentedControl, ArenaCombobox, ArenaMultiSelect],
  template: `
    <arena-filter-bar label="Deployment filters" [applied]="applied()" [clearable]="clearable()" (remove)="removed.push($event); drop($event)" (clear)="cleared = cleared + 1; empty()">
      @switch (lead()) {
        @case ('input') { <arena-input label="Owner" /> }
        @case ('segmented') { <arena-segmented-control ariaLabel="Status" [options]="statuses" value="failed" /> }
        @case ('combobox') { <arena-combobox label="Team" [options]="options" /> }
        @case ('multi-select') { <arena-multi-select label="Teams" [options]="options" /> }
        @default { <arena-select label="Region" [options]="options" /> }
      }
      <arena-input label="Search" />
    </arena-filter-bar>
  `,
})
class Host {
  readonly applied = signal<readonly ArenaAppliedFilter[]>(APPLIED);
  readonly clearable = signal(true);
  readonly lead = signal('select');
  readonly options = OPTIONS;
  readonly statuses = [{ value: 'all', label: 'All' }, { value: 'failed', label: 'Failed' }];
  refuse = false;
  removed: ArenaAppliedFilter[] = [];
  cleared = 0;
  drop(filter: ArenaAppliedFilter): void { if (!this.refuse) this.applied.set(this.applied().filter((f) => f.id !== filter.id)); }
  empty(): void { if (!this.refuse) this.applied.set([]); }
}

function render(lead = 'select', refuse = false) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.lead.set(lead);
  fixture.componentInstance.refuse = refuse;
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const closes = () => [...root.querySelectorAll<HTMLButtonElement>('[data-arena-part="tag.close"]')];
  const active = () => root.ownerDocument.activeElement;
  const press = (button: HTMLElement) => { button.focus(); button.click(); fixture.detectChanges(); };
  return { fixture, root, closes, active, press, host: fixture.componentInstance };
}

test('ArenaFilterBar meets the group pattern, named by its label', () => {
  const { fixture, root } = render();
  try {
    const group = root.querySelector('arena-filter-bar') as HTMLElement;
    assert.equal(group.getAttribute('role'), 'group');
    assert.equal(group.getAttribute('aria-label'), 'Deployment filters');
    assertPattern({ root, bindingPath: BINDING, subjects: { default: group } });
  } finally { fixture.destroy(); }
});

test('the chips sit in a list the locale names, after the controls, with Clear all last', () => {
  const { fixture, root } = render();
  try {
    const list = root.querySelector('ul') as HTMLElement;
    assert.deepEqual([list.getAttribute('role'), list.getAttribute('aria-label')], ['list', 'Applied filters']);
    const parts = [...root.querySelectorAll('[data-arena-part^="filter-bar."]')].map((el) => el.getAttribute('data-arena-part'));
    assert.deepEqual(parts, ['filter-bar.controls', 'filter-bar.applied', 'filter-bar.chip', 'filter-bar.chip', 'filter-bar.chip', 'filter-bar.clear']);
    assert.equal(root.querySelectorAll('[data-arena-part="tag.close"]').length, 3);
    assert.equal(root.querySelectorAll('[tabindex="-1"]').length, 0, 'every remove button stays a tab stop');
    const clear = root.querySelector('[data-arena-part="filter-bar.clear"]') as HTMLElement;
    assert.deepEqual([clear.getAttribute('aria-label'), clear.textContent?.trim()], ['Clear all filters', 'Clear all']);
  } finally { fixture.destroy(); }
});

test('a removal emits the whole filter, and focus lands on the chip that takes its place', () => {
  const bar = render();
  try {
    bar.press(bar.closes()[0]!);
    assert.deepEqual(bar.host.removed, [APPLIED[0]]);
    assertSameNode(bar.active(), bar.closes()[0]);
    assert.match(bar.closes()[0]!.closest('li')?.textContent ?? '', /Status: Failed/);
  } finally { bar.fixture.destroy(); }
});

test('removing the final chip lands on the one before it', () => {
  const bar = render();
  try {
    bar.press(bar.closes()[2]!);
    assertSameNode(bar.active(), bar.closes()[1]);
  } finally { bar.fixture.destroy(); }
});

test('with every chip gone, and after Clear all, focus lands on the first tab stop in content', () => {
  const bar = render();
  try {
    for (let i = 0; i < 3; i += 1) bar.press(bar.closes()[0]!);
    assertSameNode(bar.active(), bar.root.querySelector('select'));
  } finally { bar.fixture.destroy(); }
  const cleared = render();
  try {
    cleared.press(cleared.root.querySelector<HTMLButtonElement>('[data-arena-part="filter-bar.clear"]')!);
    assert.equal(cleared.host.cleared, 1);
    assertSameNode(cleared.active(), cleared.root.querySelector('select'));
  } finally { cleared.fixture.destroy(); }
});

test('whichever control leads, the first tab stop it offers is where focus lands', () => {
  const leads: [string, string][] = [
    ['input', 'input'],
    ['segmented', 'input[type="radio"][value="failed"]'],
    ['combobox', 'input[role="combobox"]'],
    ['multi-select', 'input[role="combobox"]'],
  ];
  for (const [lead, selector] of leads) {
    const bar = render(lead);
    try {
      bar.press(bar.root.querySelector<HTMLButtonElement>('[data-arena-part="filter-bar.clear"]')!);
      assertSameNode(bar.active(), bar.root.querySelector(selector), lead);
    } finally { bar.fixture.destroy(); }
  }
});

test('a removal the host refuses leaves focus on the chip it came from', () => {
  const bar = render('select', true);
  try {
    const target = bar.closes()[1]!;
    bar.press(target);
    assert.equal(bar.host.removed.length, 1);
    assert.equal(bar.closes().length, 3);
    assertSameNode(bar.active(), target);
  } finally { bar.fixture.destroy(); }
});

test('Clear all is drawn only while a filter is applied and the bar is clearable, and no chip row is drawn empty', () => {
  const empty = render();
  try {
    empty.host.applied.set([]);
    empty.fixture.detectChanges();
    assertNoNode(empty.root.querySelector('[data-arena-part="filter-bar.clear"]'));
    assertNoNode(empty.root.querySelector('ul'));
  } finally { empty.fixture.destroy(); }
  const held = render();
  try {
    held.host.clearable.set(false);
    held.fixture.detectChanges();
    assertNoNode(held.root.querySelector('[data-arena-part="filter-bar.clear"]'));
    assert.equal(held.root.querySelectorAll('ul').length, 1);
  } finally { held.fixture.destroy(); }
});

test('the bar adds no tab stop of its own: the controls, each remove button and Clear all, in reading order', () => {
  const { fixture, root } = render('input');
  try {
    const stops = [...root.querySelectorAll<HTMLElement>('input, select, button')].filter((el) => el.getAttribute('tabindex') !== '-1');
    assert.deepEqual(stops.map((el) => el.getAttribute('data-arena-part')), ['input.input', 'input.input', 'tag.close', 'tag.close', 'tag.close', 'filter-bar.clear']);
  } finally { fixture.destroy(); }
});

test('a removal the host answers after the person moved to a control leaves focus in that control', () => {
  const bar = render('select', true);
  try {
    bar.press(bar.closes()[1]!);
    const select = bar.root.querySelector('select')!;
    select.focus();
    bar.host.applied.set(APPLIED.filter((filter) => filter.id !== 'status'));
    bar.fixture.detectChanges();
    assert.equal(bar.closes().length, 2);
    assertSameNode(bar.active(), select);
  } finally { bar.fixture.destroy(); }
});

test('a removal the host answers after focus left the bar leaves focus outside it', () => {
  const bar = render('select', true);
  try {
    bar.press(bar.closes()[1]!);
    const away = bar.root.ownerDocument.createElement('button');
    bar.root.ownerDocument.body.appendChild(away);
    away.focus();
    bar.host.applied.set(APPLIED.filter((filter) => filter.id !== 'status'));
    bar.fixture.detectChanges();
    assert.equal(bar.closes().length, 2);
    assertSameNode(bar.active(), away);
    away.remove();
  } finally { bar.fixture.destroy(); }
});

test('a late answer keeps focus on the chip the person chose after using a control', () => {
  const bar = render('select', true);
  try {
    bar.press(bar.closes()[0]!);
    bar.root.querySelector('select')!.focus();
    bar.fixture.detectChanges();
    const chosen = bar.closes()[2]!;
    chosen.focus();
    bar.fixture.detectChanges();
    bar.host.applied.set(APPLIED.filter((filter) => filter.id !== 'region'));
    bar.fixture.detectChanges();
    assert.equal(bar.closes().length, 2);
    assertSameNode(bar.active(), chosen);
  } finally { bar.fixture.destroy(); }
});

@Component({
  selector: 'filter-bar-blank-host',
  standalone: true,
  imports: [ArenaFilterBar],
  template: `<arena-filter-bar [label]="label"><select aria-label="Region"></select></arena-filter-bar>`,
})
class BlankHost { label = ' '; }

@Component({
  selector: 'filter-bar-empty-host',
  standalone: true,
  imports: [ArenaFilterBar],
  template: `<arena-filter-bar label="Deployment filters"></arena-filter-bar>`,
})
class EmptyHost {}

test('a blank label throws, and so does a bar with no control', () => {
  const blank = TestBed.createComponent(BlankHost);
  try {
    assert.throws(() => blank.detectChanges(), /ArenaFilterBar: `label` is required/);
  } finally { blank.destroy(); }
  const empty = TestBed.createComponent(EmptyHost);
  try {
    assert.throws(() => empty.detectChanges(), /no controls is not a legal shape/);
  } finally { empty.destroy(); }
});
