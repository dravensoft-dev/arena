/* A required member that is absent, or blank where the member is text, is refused by name:
 * the render throws an Error that starts with the component and names the member. Each row
 * renders the component's demo fixture bare, without its host, with the member deleted or
 * blanked. A required member the component does not refuse by name has no row. */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { element } from './FixtureRender.tsx';
import { ArenaIconsProvider } from '../ArenaIcons.ts';
import { loadDemos } from '../../../scripts/generate/arena/generate-kitchen-sink.ts';
import { instanceNode } from '../../../scripts/lib/arena/kitchen-sink-model.ts';

type How = 'absent' | 'blank';
interface Case { how: How[]; message: RegExp }

const ABSENT: How[] = ['absent'];
const BOTH: How[] = ['absent', 'blank'];
const BLANK: How[] = ['blank'];
const required = (member: string) => new RegExp(`\`${member}\` is required`);

const CASES: Record<string, Case> = {
  'ArenaBarChart.labels': { how: ABSENT, message: /ArenaBarChart: `labels` is required/ },
  'ArenaBarChart.series': { how: ABSENT, message: /ArenaBarChart: `series` is required/ },
  'ArenaLineChart.labels': { how: ABSENT, message: /ArenaLineChart: `labels` is required/ },
  'ArenaLineChart.series': { how: ABSENT, message: /ArenaLineChart: `series` is required/ },
  'ArenaDoughnutChart.labels': { how: ABSENT, message: /ArenaDoughnutChart: `labels` is required/ },
  'ArenaDoughnutChart.series': { how: ABSENT, message: /ArenaDoughnutChart: `series` is required/ },
  'ArenaFunnelChart.label': { how: BLANK, message: required('label') },
  'ArenaFunnelChart.labels': { how: ABSENT, message: required('labels') },
  'ArenaFunnelChart.series': { how: ABSENT, message: required('series') },
  'ArenaHeatmapChart.label': { how: BLANK, message: /ArenaHeatmapChart: `label` is required/ },
  'ArenaHeatmapChart.labels': { how: ABSENT, message: /ArenaHeatmapChart: `labels` is required/ },
  'ArenaHeatmapChart.series': { how: ABSENT, message: /ArenaHeatmapChart: `series` is required/ },
  'ArenaSparkline.label': { how: ABSENT, message: /ArenaSparkline: `label` is required/ },
  'ArenaSparkline.labels': { how: ABSENT, message: /ArenaSparkline: `labels` is required/ },
  'ArenaSparkline.series': { how: ABSENT, message: /ArenaSparkline: `series` is required/ },
  'ArenaGaugeChart.label': { how: BOTH, message: /ArenaGaugeChart: `label` is required/ },
  'ArenaScatterChart.xLabel': { how: BLANK, message: required('xLabel') },
  'ArenaScatterChart.yLabel': { how: BLANK, message: required('yLabel') },
  'ArenaActivityFeed.items': { how: ABSENT, message: required('items') },
  'ArenaActivityFeed.label': { how: ABSENT, message: /ArenaActivityFeed: `label` is required/ },
  'ArenaCalendarEvent.id': { how: ABSENT, message: /ArenaCalendarEvent: `id` is required/ },
  'ArenaCalendarEvent.title': { how: ABSENT, message: /ArenaCalendarEvent: `title` is required/ },
  'ArenaCalendarEvent.start': { how: ABSENT, message: /ArenaCalendarEvent: `start` is required/ },
  'ArenaCalendarEvent.end': { how: ABSENT, message: /ArenaCalendarEvent: `end` is required/ },
  'ArenaStatCard.label': { how: ABSENT, message: /label.*required/ },
  'ArenaStatCard.value': { how: ABSENT, message: /value.*required/ },
  'ArenaTable.label': { how: ABSENT, message: /ArenaTable: `label` is required/ },
  'ArenaTable.columns': { how: ABSENT, message: /ArenaTable: `columns` is required/ },
  'ArenaKbd.keys': { how: ABSENT, message: /ArenaKbd: `keys` is required/ },
  'ArenaDialog.title': { how: ABSENT, message: /ArenaDialog: `title` is required/ },
  'ArenaDialog.open': { how: ABSENT, message: /ArenaDialog: `open` is required/ },
  'ArenaEmptyState.title': { how: ABSENT, message: /ArenaEmptyState: `title` is required/ },
  'ArenaOnboarding.open': { how: ABSENT, message: required('open') },
  'ArenaOnboarding.steps': { how: ABSENT, message: required('steps') },
  'ArenaTooltip.label': { how: ABSENT, message: /ArenaTooltip: `label` is required/ },
  'ArenaProgressBar.label': { how: ABSENT, message: required('label') },
  'ArenaFieldset.legend': { how: ABSENT, message: /ArenaFieldset: `legend` is required/ },
  'ArenaFileInput.label': { how: ABSENT, message: required('label') },
  'ArenaIconButton.icon': { how: ABSENT, message: /ArenaIconButton: `icon` is required/ },
  'ArenaIconButton.label': { how: ABSENT, message: /ArenaIconButton: `label` is required/ },
  'ArenaRadio.value': { how: ABSENT, message: /ArenaRadio: `value` is required/ },
  'ArenaRadioGroup.ariaLabel': { how: ABSENT, message: /ArenaRadioGroup: `ariaLabel` is required/ },
  'ArenaSplitButton.items': { how: ABSENT, message: /ArenaSplitButton: `items` is required/ },
  'ArenaHero.title': { how: ABSENT, message: required('title') },
  'ArenaScroller.label': { how: ABSENT, message: required('label') },
  'ArenaSection.title': { how: ABSENT, message: required('title') },
  'ArenaSkipLink.label': { how: ABSENT, message: required('label') },
  'ArenaAppLogo.name': { how: ABSENT, message: /required/ },
  'ArenaBreadcrumbs.items': { how: ABSENT, message: /items.*required/ },
  'ArenaBreadcrumbs.ariaLabel': { how: ABSENT, message: /ArenaBreadcrumbs: `ariaLabel` is required/ },
  'ArenaBulkActionBar.count': { how: ABSENT, message: required('count') },
  'ArenaCommandPalette.open': { how: ABSENT, message: required('open') },
  'ArenaCommandPalette.commands': { how: ABSENT, message: required('commands') },
  'ArenaMenu.items': { how: ABSENT, message: /ArenaMenu: `items` is required/ },
  'ArenaPageHead.title': { how: ABSENT, message: /ArenaPageHead: `title` is required/ },
  'ArenaPagination.ariaLabel': { how: ABSENT, message: /ArenaPagination: `ariaLabel` is required/ },
  'ArenaPagination.page': { how: ABSENT, message: /ArenaPagination: `page` is required/ },
  'ArenaPagination.pageCount': { how: ABSENT, message: /ArenaPagination: `pageCount` is required/ },
  'ArenaSegmentedControl.options': { how: ABSENT, message: /ArenaSegmentedControl: `options` is required/ },
  'ArenaSegmentedControl.ariaLabel': { how: ABSENT, message: /ArenaSegmentedControl: `ariaLabel` is required/ },
  'ArenaSideNav.ariaLabel': { how: ABSENT, message: /ArenaSideNav: `ariaLabel` is required/ },
  'ArenaSideNavItem.id': { how: BOTH, message: /ArenaSideNavItem: `id` is required/ },
  'ArenaSideNavItem.label': { how: BOTH, message: /ArenaSideNavItem: `label` is required/ },
  'ArenaSideNavSection.label': { how: ABSENT, message: /ArenaSideNavSection: `label` is required/ },
  'ArenaSideNavCollapsible.id': { how: BOTH, message: /ArenaSideNavCollapsible: `id` is required/ },
  'ArenaSideNavCollapsible.label': { how: BOTH, message: /ArenaSideNavCollapsible: `label` is required/ },
  'ArenaTab.value': { how: ABSENT, message: /ArenaTab: `value` is required/ },
  'ArenaTab.label': { how: BOTH, message: /ArenaTab: `label` is required/ },
  'ArenaLink.href': { how: ABSENT, message: /ArenaLink: `href` is required/ },
};

const DEMOS = loadDemos();

function draw(fixture: { seed?: Record<string, unknown> }, member: string, how: How) {
  const seed: Record<string, unknown> = { ...(fixture.seed ?? {}) };
  if (how === 'absent') delete seed[member];
  else seed[member] = '';
  return renderToStaticMarkup(
    <ArenaIconsProvider href="/icons.svg">{element(instanceNode({ ...fixture, host: undefined, seed } as never))}</ArenaIconsProvider>,
  );
}

test('a required member that is absent, or blank where the original blanked it, is refused by name', () => {
  assert.ok(Object.keys(CASES).length > 0, 'no row to render');
  for (const [key, row] of Object.entries(CASES)) {
    const [component, member] = key.split('.') as [string, string];
    const fixture = DEMOS.get(component);
    assert.ok(fixture, `${key}: ${component} has no demo fixture to render`);
    assert.ok(row.how.length > 0, `${key}: the row names no way to refuse`);
    for (const how of row.how) {
      assert.throws(
        () => draw(fixture, member, how),
        (error) => error instanceof Error
          && error.message.startsWith(`${component}:`)
          && error.message.includes('`' + member + '`')
          && row.message.test(error.message),
        `${key}: ${how === 'absent' ? 'an absent' : 'a blank'} \`${member}\` rendered instead of being refused by name`,
      );
    }
  }
});
