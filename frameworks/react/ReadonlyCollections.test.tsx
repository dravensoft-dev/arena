/* Every collection prop takes a `readonly T[]`, which is what an app that declares its data
 * `as const`, freezes it, or reads it from a store actually holds. A mutable `T[]` prop rejects
 * all three with TS4104 at the call site, and this file is where that fails: check:react-types
 * compiles the layer under strict, so the elements below are the assertion. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaActivityFeed } from './components/display/arena-activity-feed/ArenaActivityFeed.tsx';
import { ArenaBarChart } from './components/charts/arena-bar-chart/ArenaBarChart.tsx';
import { ArenaBreadcrumbs } from './components/navigation/arena-breadcrumbs/ArenaBreadcrumbs.tsx';
import { ArenaBulkActionBar } from './components/navigation/arena-bulk-action-bar/ArenaBulkActionBar.tsx';
import { ArenaDoughnutChart } from './components/charts/arena-doughnut-chart/ArenaDoughnutChart.tsx';
import { ArenaLineChart } from './components/charts/arena-line-chart/ArenaLineChart.tsx';
import { ArenaSegmentedControl } from './components/navigation/arena-segmented-control/ArenaSegmentedControl.tsx';
import { ArenaSelect } from './components/forms/arena-select/ArenaSelect.tsx';
import { ArenaTable } from './components/display/arena-table/ArenaTable.tsx';
import type {
  ArenaActivityItem, ArenaBulkAction, ArenaCrumb, ArenaSegmentOption, ArenaSelectOption, ArenaTableColumn,
} from './Api.generated.ts';

const LABELS: readonly string[] = Object.freeze(['Mon', 'Tue']);
const VALUES: readonly number[] = Object.freeze([1, 2]);
const SLOTS: readonly number[] = Object.freeze([1, 2]);
const ITEMS: readonly ArenaActivityItem[] = Object.freeze([{ id: '1', actor: 'Marta', action: 'deployed' }]);
const CRUMBS: readonly ArenaCrumb[] = Object.freeze([{ label: 'Clients', href: '/clients' }]);
const ACTIONS: readonly ArenaBulkAction[] = Object.freeze([{ id: 'archive', label: 'Archive' }]);
const SEGMENTS: readonly ArenaSegmentOption[] = Object.freeze([{ value: 'grid', label: 'Grid' }]);
const OPTIONS: readonly ArenaSelectOption[] = Object.freeze([{ value: 'a', label: 'A' }]);
const COLUMNS: readonly ArenaTableColumn[] = Object.freeze([{ header: 'Build' }]);

test('every collection prop takes data the consumer holds as readonly, and nothing writes to it', () => {
  const markup = [
    renderToStaticMarkup(<ArenaActivityFeed label="Activity" items={ITEMS} />),
    renderToStaticMarkup(<ArenaBreadcrumbs ariaLabel="Trail" items={CRUMBS} />),
    renderToStaticMarkup(<ArenaBulkActionBar count={1} actions={ACTIONS} />),
    renderToStaticMarkup(<ArenaSegmentedControl ariaLabel="View" options={SEGMENTS} value="grid" onChange={() => {}} />),
    renderToStaticMarkup(<ArenaSelect options={OPTIONS} />),
    renderToStaticMarkup(<ArenaTable label="Deployments" columns={COLUMNS} />),
    renderToStaticMarkup(<ArenaBarChart label="Deploys" labels={LABELS} series={[{ label: 'Deploys', values: VALUES, colorIds: SLOTS }]} />),
    renderToStaticMarkup(<ArenaDoughnutChart label="Traffic" labels={LABELS} series={[{ label: 'Traffic', values: VALUES, colorIds: SLOTS }]} />),
    renderToStaticMarkup(<ArenaLineChart label="Latency" labels={LABELS} series={[{ label: 'Latency', values: VALUES }]} />),
  ];

  for (const html of markup) assert.ok(html.length > 0, 'a component rendered nothing, so its prop proves nothing');
  assert.deepEqual([...LABELS], ['Mon', 'Tue'], 'a frozen array reached a component that wrote to it');
  assert.deepEqual([...VALUES], [1, 2], 'a frozen array reached a component that wrote to it');
});
