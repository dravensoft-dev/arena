/* Every array input takes a `readonly T[]`, which is what an app that declares its data
 * `as const`, freezes it, or exposes it from a store actually holds. A mutable `T[]` input
 * rejects all three with TS4104 in the consumer's template, and this file is where that
 * fails: ngc compiles it under strictTemplates, so the binding below is the assertion. */

import '@angular/compiler';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { useTestEnvironment } from './TestbedEnv';
import type { ArenaSeries } from '../Api.generated';
import { ArenaAccordion } from '../components/layout/arena-accordion/ArenaAccordion';
import { ArenaActivityFeed } from '../components/display/arena-activity-feed/ArenaActivityFeed';
import { ArenaBarChart } from '../components/charts/arena-bar-chart/ArenaBarChart';
import { ArenaBreadcrumbs } from '../components/navigation/arena-breadcrumbs/ArenaBreadcrumbs';
import { ArenaBulkActionBar } from '../components/navigation/arena-bulk-action-bar/ArenaBulkActionBar';
import { ArenaCheckboxGroup } from '../components/forms/arena-checkbox-group/ArenaCheckboxGroup';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette';
import { ArenaDoughnutChart } from '../components/charts/arena-doughnut-chart/ArenaDoughnutChart';
import { ArenaLineChart } from '../components/charts/arena-line-chart/ArenaLineChart';
import { ArenaMenu } from '../components/navigation/arena-menu/ArenaMenu';
import { ArenaOnboarding } from '../components/feedback/arena-onboarding/ArenaOnboarding';
import { ArenaSegmentedControl } from '../components/navigation/arena-segmented-control/ArenaSegmentedControl';
import { ArenaSelect } from '../components/forms/arena-select/ArenaSelect';
import { ArenaCombobox } from '../components/forms/arena-combobox/ArenaCombobox';
import { ArenaMultiSelect } from '../components/forms/arena-multi-select/ArenaMultiSelect';
import { ArenaStepper } from '../components/navigation/arena-stepper/ArenaStepper';
import { ArenaTable } from '../components/display/arena-table/ArenaTable';
import { ArenaTimeline } from '../components/display/arena-timeline/ArenaTimeline';
import type {
  ArenaActivityItem, ArenaBulkAction, ArenaCommand, ArenaCrumb, ArenaMenuItem, ArenaOnboardingStep, ArenaSegmentOption, ArenaSelectOption,
  ArenaStepperStep, ArenaTableColumn, ArenaTimelineItem,
} from '../Api.generated';

useTestEnvironment();

const root = document.documentElement;
before(() => {
  root.style.setProperty('--bp-md', '768px');
  root.style.setProperty('--bp-sm', '480px');
});
after(() => {
  root.style.removeProperty('--bp-md');
  root.style.removeProperty('--bp-sm');
});

const LABELS: readonly string[] = Object.freeze(['Mon', 'Tue']);
const VALUES: readonly number[] = Object.freeze([1, 2]);
const SLOTS: readonly number[] = Object.freeze([1, 2]);

@Component({
  standalone: true,
  imports: [
    ArenaAccordion, ArenaActivityFeed, ArenaBarChart, ArenaBreadcrumbs, ArenaBulkActionBar, ArenaCheckboxGroup, ArenaCombobox, ArenaCommandPalette, ArenaDoughnutChart, ArenaLineChart,
    ArenaMenu, ArenaMultiSelect, ArenaOnboarding, ArenaSegmentedControl, ArenaSelect, ArenaStepper, ArenaTable, ArenaTimeline,
  ],
  template: `
    <arena-accordion multiple [values]="labels" [defaultValues]="labels" />
    <arena-activity-feed label="Activity" [items]="items" />
    <arena-breadcrumbs ariaLabel="Trail" [items]="crumbs" />
    <arena-bulk-action-bar [count]="0" [actions]="actions" />
    <arena-checkbox-group ariaLabel="Days" [value]="labels" />
    <arena-combobox label="Region" [options]="selectOptions" />
    <arena-command-palette [open]="false" [commands]="commands" />
    <arena-menu [items]="menuItems"><button trigger type="button">Actions</button></arena-menu>
    <arena-multi-select label="Days" [options]="selectOptions" [value]="labels" />
    <arena-onboarding [open]="false" [steps]="steps" />
    <arena-segmented-control ariaLabel="View" [options]="segments" />
    <arena-select [options]="selectOptions" />
    <arena-stepper ariaLabel="Checkout" [steps]="stepperSteps" [index]="1" interactive />
    <arena-table label="Deployments" [columns]="columns" />
    <arena-timeline label="Order 4821" [items]="milestones" [index]="1" />
    <arena-bar-chart label="Deploys" [labels]="labels" [series]="series" />
    <arena-doughnut-chart label="Traffic" [labels]="labels" [series]="series" />
    <arena-line-chart label="Latency" [labels]="labels" [series]="series" />
  `,
})
class FrozenDataHost {
  readonly items: readonly ArenaActivityItem[] = Object.freeze([{ id: '1', actor: 'Marta', action: 'deployed' }]);
  readonly crumbs: readonly ArenaCrumb[] = Object.freeze([{ label: 'Clients', href: '/clients' }]);
  readonly actions: readonly ArenaBulkAction[] = Object.freeze([{ id: 'archive', label: 'Archive' }]);
  readonly commands: readonly ArenaCommand[] = Object.freeze([{ id: 'open', label: 'Open project' }]);
  readonly menuItems: readonly ArenaMenuItem[] = Object.freeze([{ id: 'rename', label: 'Rename' }]);
  readonly steps: readonly ArenaOnboardingStep[] = Object.freeze([{ title: 'Welcome', body: 'Start here' }]);
  readonly segments: readonly ArenaSegmentOption[] = Object.freeze([{ value: 'grid', label: 'Grid' }]);
  readonly selectOptions: readonly ArenaSelectOption[] = Object.freeze([{ value: 'a', label: 'A' }]);
  readonly stepperSteps: readonly ArenaStepperStep[] = Object.freeze([{ label: 'Account' }, { label: 'Review' }]);
  readonly milestones: readonly ArenaTimelineItem[] = Object.freeze([{ title: 'Placed' }, { title: 'Shipped' }]);
  readonly columns: readonly ArenaTableColumn[] = Object.freeze([{ header: 'Build' }]);
  readonly labels = LABELS;
  readonly values = VALUES;
  readonly series: readonly ArenaSeries[] = [{ label: 'One', values: VALUES, colorIds: SLOTS }];
  readonly slots = SLOTS;
}

test('every array input binds data the consumer holds as readonly, and nothing writes to it', () => {
  const fixture = TestBed.createComponent(FrozenDataHost);
  fixture.detectChanges();

  const host = fixture.nativeElement as HTMLElement;
  for (const selector of [
    'arena-accordion', 'arena-activity-feed', 'arena-breadcrumbs', 'arena-bulk-action-bar', 'arena-checkbox-group', 'arena-combobox', 'arena-command-palette',
    'arena-menu', 'arena-multi-select', 'arena-onboarding', 'arena-segmented-control', 'arena-select', 'arena-stepper', 'arena-table', 'arena-timeline',
    'arena-bar-chart', 'arena-doughnut-chart', 'arena-line-chart',
  ]) {
    assert.ok(host.querySelector(selector), `${selector} did not render, so its binding proves nothing`);
  }

  assert.deepEqual([...LABELS], ['Mon', 'Tue'], 'a frozen array reached a component that wrote to it');
  assert.deepEqual([...VALUES], [1, 2], 'a frozen array reached a component that wrote to it');
  fixture.destroy();
});
