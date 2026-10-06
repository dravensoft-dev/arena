/* Every array input takes a `readonly T[]`, which is what an app that declares its data
 * `as const`, freezes it, or exposes it from a store actually holds. A mutable `T[]` input
 * rejects all three with TS4104 in the consumer's template, and this file is where that
 * fails: ngc compiles it under strictTemplates, so the binding below is the assertion. */

import '@angular/compiler';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { useTestEnvironment } from './TestbedEnv';
import type { ArenaSeries } from '../Api.generated';
import { ArenaActivityFeed } from '../components/display/arena-activity-feed/ArenaActivityFeed';
import { ArenaBarChart } from '../components/charts/arena-bar-chart/ArenaBarChart';
import { ArenaBreadcrumbs } from '../components/navigation/arena-breadcrumbs/ArenaBreadcrumbs';
import { ArenaBulkActionBar } from '../components/navigation/arena-bulk-action-bar/ArenaBulkActionBar';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette';
import { ArenaDoughnutChart } from '../components/charts/arena-doughnut-chart/ArenaDoughnutChart';
import { ArenaLineChart } from '../components/charts/arena-line-chart/ArenaLineChart';
import { ArenaMenu } from '../components/navigation/arena-menu/ArenaMenu';
import { ArenaOnboarding } from '../components/feedback/arena-onboarding/ArenaOnboarding';
import { ArenaSegmentedControl } from '../components/navigation/arena-segmented-control/ArenaSegmentedControl';
import { ArenaSelect } from '../components/forms/arena-select/ArenaSelect';
import { ArenaTable } from '../components/display/arena-table/ArenaTable';
import type {
  ArenaActivityItem, ArenaBulkAction, ArenaCommand, ArenaCrumb, ArenaMenuItem, ArenaOnboardingStep, ArenaSegmentOption, ArenaSelectOption,
  ArenaTableColumn,
} from '../Api.generated';

useTestEnvironment();

const LABELS: readonly string[] = Object.freeze(['Mon', 'Tue']);
const VALUES: readonly number[] = Object.freeze([1, 2]);
const SLOTS: readonly number[] = Object.freeze([1, 2]);

@Component({
  standalone: true,
  imports: [
    ArenaActivityFeed, ArenaBarChart, ArenaBreadcrumbs, ArenaBulkActionBar, ArenaCommandPalette, ArenaDoughnutChart, ArenaLineChart,
    ArenaMenu, ArenaOnboarding, ArenaSegmentedControl, ArenaSelect, ArenaTable,
  ],
  template: `
    <arena-activity-feed label="Activity" [items]="items" />
    <arena-breadcrumbs ariaLabel="Trail" [items]="crumbs" />
    <arena-bulk-action-bar [count]="0" [actions]="actions" />
    <arena-command-palette [open]="false" [commands]="commands" />
    <arena-menu [items]="menuItems" />
    <arena-onboarding [open]="false" [steps]="steps" />
    <arena-segmented-control ariaLabel="View" [options]="segments" />
    <arena-select [options]="selectOptions" />
    <arena-table label="Deployments" [columns]="columns" />
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
    'arena-activity-feed', 'arena-breadcrumbs', 'arena-bulk-action-bar', 'arena-command-palette',
    'arena-menu', 'arena-onboarding', 'arena-segmented-control', 'arena-select', 'arena-table',
    'arena-bar-chart', 'arena-doughnut-chart', 'arena-line-chart',
  ]) {
    assert.ok(host.querySelector(selector), `${selector} did not render, so its binding proves nothing`);
  }

  assert.deepEqual([...LABELS], ['Mon', 'Tue'], 'a frozen array reached a component that wrote to it');
  assert.deepEqual([...VALUES], [1, 2], 'a frozen array reached a component that wrote to it');
  fixture.destroy();
});
