/* contracts/api/AGENTS.md requires a guarded name to be refused when it is blank AFTER TRIMMING:
 * a name of nothing but spaces satisfies a falsiness test and names nothing, and it is the one
 * input the guard exists to catch. Each guarded member is blanked on its own, in a host that
 * gives the component one child so no other guard fires first, and the message names the
 * component and the member. The set is derived from the contracts, so a guarded name joins by
 * being declared. A chart refuses only an empty label and has its own whole message. */
import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Component, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { REPO } from './Compliance';
import { ArenaAccordion } from '../components/layout/arena-accordion/ArenaAccordion';
import { ArenaAccordionItem } from '../components/layout/arena-accordion-item/ArenaAccordionItem';
import { ArenaActivityFeed } from '../components/display/arena-activity-feed/ArenaActivityFeed';
import { ArenaBoard } from '../components/layout/arena-board/ArenaBoard';
import { ArenaBoardColumn } from '../components/layout/arena-board-column/ArenaBoardColumn';
import { ArenaBottomNav } from '../components/navigation/arena-bottom-nav/ArenaBottomNav';
import { ArenaBreadcrumbs } from '../components/navigation/arena-breadcrumbs/ArenaBreadcrumbs';
import { ArenaCheckbox } from '../components/forms/arena-checkbox/ArenaCheckbox';
import { ArenaCheckboxGroup } from '../components/forms/arena-checkbox-group/ArenaCheckboxGroup';
import { ArenaCombobox } from '../components/forms/arena-combobox/ArenaCombobox';
import { ArenaFieldset } from '../components/forms/arena-fieldset/ArenaFieldset';
import { ArenaFileInput } from '../components/forms/arena-file-input/ArenaFileInput';
import { ArenaFilterBar } from '../components/navigation/arena-filter-bar/ArenaFilterBar';
import { ArenaHero } from '../components/layout/arena-hero/ArenaHero';
import { ArenaLink } from '../components/navigation/arena-link/ArenaLink';
import { ArenaMeter } from '../components/feedback/arena-meter/ArenaMeter';
import { ArenaMultiSelect } from '../components/forms/arena-multi-select/ArenaMultiSelect';
import { ArenaNumberField } from '../components/forms/arena-number-field/ArenaNumberField';
import { ArenaPagination } from '../components/navigation/arena-pagination/ArenaPagination';
import { ArenaPeopleList } from '../components/display/arena-people-list/ArenaPeopleList';
import { ArenaPersonRow } from '../components/display/arena-person-row/ArenaPersonRow';
import { ArenaPinInput } from '../components/forms/arena-pin-input/ArenaPinInput';
import { ArenaPopover } from '../components/feedback/arena-popover/ArenaPopover';
import { ArenaRadioGroup } from '../components/forms/arena-radio-group/ArenaRadioGroup';
import { ArenaScroller } from '../components/layout/arena-scroller/ArenaScroller';
import { ArenaSection } from '../components/layout/arena-section/ArenaSection';
import { ArenaSheet } from '../components/feedback/arena-sheet/ArenaSheet';
import { ArenaSideNav } from '../components/navigation/arena-side-nav/ArenaSideNav';
import { ArenaSideNavItem } from '../components/navigation/arena-side-nav-item/ArenaSideNavItem';
import { ArenaSideNavSection } from '../components/navigation/arena-side-nav-section/ArenaSideNavSection';
import { ArenaSkipLink } from '../components/layout/arena-skip-link/ArenaSkipLink';
import { ArenaSlider } from '../components/forms/arena-slider/ArenaSlider';
import { ArenaSplitButton } from '../components/forms/arena-split-button/ArenaSplitButton';
import { ArenaStepper } from '../components/navigation/arena-stepper/ArenaStepper';
import { ArenaTableRow } from '../components/display/arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../components/display/arena-table-cell/ArenaTableCell';
import { ArenaTable } from '../components/display/arena-table/ArenaTable';
import { ArenaTimeline } from '../components/display/arena-timeline/ArenaTimeline';
import { ArenaTreeView } from '../components/navigation/arena-tree-view/ArenaTreeView';
import { ArenaBarChart } from '../components/charts/arena-bar-chart/ArenaBarChart';
import { ArenaDoughnutChart } from '../components/charts/arena-doughnut-chart/ArenaDoughnutChart';
import { ArenaFunnelChart } from '../components/charts/arena-funnel-chart/ArenaFunnelChart';
import { ArenaGaugeChart } from '../components/charts/arena-gauge-chart/ArenaGaugeChart';
import { ArenaHeatmapChart } from '../components/charts/arena-heatmap-chart/ArenaHeatmapChart';
import { ArenaHorizontalBarChart } from '../components/charts/arena-horizontal-bar-chart/ArenaHorizontalBarChart';
import { ArenaLineChart } from '../components/charts/arena-line-chart/ArenaLineChart';
import { ArenaPyramidChart } from '../components/charts/arena-pyramid-chart/ArenaPyramidChart';
import { ArenaRadarChart } from '../components/charts/arena-radar-chart/ArenaRadarChart';
import { ArenaScatterChart } from '../components/charts/arena-scatter-chart/ArenaScatterChart';
import { ArenaSparkline } from '../components/charts/arena-sparkline/ArenaSparkline';
import { disposeOverlays } from './Overlays';

interface MemberSpec { form?: string; type?: string; required?: boolean; description?: string }
const CONTRACTS = join(REPO, 'contracts/api/components');

const IMPORTS: Type<unknown>[] = [
  ArenaAccordion, ArenaAccordionItem, ArenaActivityFeed, ArenaBoard, ArenaBoardColumn, ArenaBottomNav, ArenaBreadcrumbs, ArenaCheckbox,
  ArenaCheckboxGroup, ArenaCombobox, ArenaFieldset, ArenaFileInput, ArenaFilterBar, ArenaHero, ArenaLink, ArenaMeter,
  ArenaMultiSelect, ArenaNumberField, ArenaPagination, ArenaPeopleList, ArenaPersonRow, ArenaPinInput, ArenaPopover,
  ArenaRadioGroup, ArenaScroller, ArenaSection, ArenaSheet, ArenaSideNav, ArenaSideNavItem, ArenaSideNavSection,
  ArenaSkipLink, ArenaSlider, ArenaSplitButton, ArenaStepper, ArenaTable, ArenaTableRow, ArenaTableCell, ArenaTimeline, ArenaTreeView,
  ArenaBarChart, ArenaDoughnutChart, ArenaFunnelChart, ArenaGaugeChart, ArenaHeatmapChart, ArenaHorizontalBarChart,
  ArenaLineChart, ArenaPyramidChart, ArenaRadarChart, ArenaScatterChart, ArenaSparkline,
];

const CASES: Record<string, string> = {
  'ArenaAccordionItem.value': '<arena-accordion><arena-accordion-item value="   " label="Details"><p>x</p></arena-accordion-item></arena-accordion>',
  'ArenaAccordionItem.label': '<arena-accordion><arena-accordion-item value="details" label="   "><p>x</p></arena-accordion-item></arena-accordion>',
  'ArenaActivityFeed.label': '<arena-activity-feed label="   " [items]="[]" />',
  'ArenaBoard.label': '<arena-board label="   "><arena-board-column title="To do"><p>x</p></arena-board-column></arena-board>',
  'ArenaBoardColumn.title': '<arena-board-column title="   "><p>x</p></arena-board-column>',
  'ArenaBottomNav.ariaLabel': '<arena-bottom-nav ariaLabel="   "><p>x</p></arena-bottom-nav>',
  'ArenaBreadcrumbs.ariaLabel': '<arena-breadcrumbs ariaLabel="   " [items]="[{ label: \'Home\' }]" />',
  'ArenaCheckbox.label': '<arena-checkbox label="   " />',
  'ArenaCheckboxGroup.ariaLabel': '<arena-checkbox-group ariaLabel="   "><arena-checkbox value="a" label="A" /></arena-checkbox-group>',
  'ArenaCombobox.label': '<arena-combobox label="   " [options]="[]" />',
  'ArenaFieldset.legend': '<arena-fieldset legend="   "><p>x</p></arena-fieldset>',
  'ArenaFileInput.label': '<arena-file-input label="   " />',
  'ArenaFilterBar.label': '<arena-filter-bar label="   "><select aria-label="Region"></select></arena-filter-bar>',
  'ArenaHero.title': '<arena-hero title="   "><p>x</p></arena-hero>',
  'ArenaLink.href': '<arena-link href="   ">Release notes</arena-link>',
  'ArenaMeter.label': '<arena-meter label="   " [value]="1" />',
  'ArenaMultiSelect.label': '<arena-multi-select label="   " [options]="[]" />',
  'ArenaNumberField.label': '<arena-number-field label="   " />',
  'ArenaPagination.ariaLabel': '<arena-pagination ariaLabel="   " [page]="1" [pageCount]="3" />',
  'ArenaPeopleList.label': '<arena-people-list label="   "><arena-person-row name="Ada" /></arena-people-list>',
  'ArenaPersonRow.name': '<arena-person-row name="   " />',
  'ArenaPinInput.label': '<arena-pin-input label="   " />',
  'ArenaPopover.label': '<arena-popover label="   "><button trigger type="button">Filters</button><p>Only failing builds.</p></arena-popover>',
  'ArenaRadioGroup.ariaLabel': '<arena-radio-group ariaLabel="   "><p>x</p></arena-radio-group>',
  'ArenaScroller.label': '<arena-scroller label="   "><span>One</span></arena-scroller>',
  'ArenaSection.title': '<arena-section title="   "><p>x</p></arena-section>',
  'ArenaSheet.title': '<arena-sheet [open]="true" title="   "><p>x</p></arena-sheet>',
  'ArenaSideNav.ariaLabel': '<arena-side-nav ariaLabel="   "><arena-side-nav-item id="a" label="Alpha" /></arena-side-nav>',
  'ArenaSideNavSection.label': '<arena-side-nav ariaLabel="Primary"><arena-side-nav-section label="   "><arena-side-nav-item id="a" label="Alpha" /></arena-side-nav-section></arena-side-nav>',
  'ArenaSkipLink.label': '<arena-skip-link label="   " />',
  'ArenaSlider.label': '<arena-slider label="   " />',
  'ArenaSplitButton.label': '<arena-split-button label="   " menuLabel="More deploy options" [items]="[]">Deploy</arena-split-button>',
  'ArenaSplitButton.menuLabel': '<arena-split-button label="Deploy" menuLabel="   " [items]="[]">Deploy</arena-split-button>',
  'ArenaStepper.ariaLabel': '<arena-stepper ariaLabel="   " [steps]="[]" />',
  'ArenaTable.label': '<arena-table label="   " [columns]="[{ header: \'A\' }]"><tr arena-table-row><td arena-table-cell>x</td></tr></arena-table>',
  'ArenaTimeline.label': '<arena-timeline label="   " [items]="[]" />',
  'ArenaTreeView.label': '<arena-tree-view label="   " [nodes]="[]" />',
};

const SERIES = '[labels]="[\'Q1\', \'Q2\']" [series]="[{ label: \'Revenue\', values: [1, 2] }]"';
const CHART_CASES: Record<string, string> = {
  ArenaBarChart: `<arena-bar-chart label="" ${SERIES} />`,
  ArenaLineChart: `<arena-line-chart label="" ${SERIES} />`,
  ArenaHorizontalBarChart: `<arena-horizontal-bar-chart label="" ${SERIES} />`,
  ArenaPyramidChart: `<arena-pyramid-chart label="" ${SERIES} />`,
  ArenaRadarChart: `<arena-radar-chart label="" ${SERIES} />`,
  ArenaDoughnutChart: `<arena-doughnut-chart label="" ${SERIES} />`,
  ArenaSparkline: `<arena-sparkline label="" ${SERIES} />`,
  ArenaFunnelChart: `<arena-funnel-chart label="" ${SERIES} />`,
  ArenaHeatmapChart: `<arena-heatmap-chart label="" ${SERIES} />`,
  ArenaScatterChart: '<arena-scatter-chart label="" xLabel="Requests" yLabel="Latency" [series]="[{ label: \'Revenue\', x: [1, 2], y: [1, 2] }]" />',
  ArenaGaugeChart: '<arena-gauge-chart label="" [value]="1" />',
};

export function guardedNames(dir = CONTRACTS, read = readFileSync): Array<{ component: string; member: string }> {
  const found: Array<{ component: string; member: string }> = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const contract = JSON.parse(read(join(dir, file), 'utf8')) as { component: string; api?: Record<string, MemberSpec> };
    for (const [member, spec] of Object.entries(contract.api ?? {})) {
      if (spec.form === 'primitive' && spec.type === 'string' && /guarded at runtime/.test(spec.description ?? '')) {
        found.push({ component: contract.component, member });
      }
    }
  }
  return found;
}

let hosts = 0;
function drawn(template: string): void {
  const Host = Component({ selector: `guarded-host-${hosts += 1}`, standalone: true, imports: IMPORTS, template })(class {});
  const fixture = TestBed.createComponent(Host);
  try {
    fixture.detectChanges();
  } finally {
    try { fixture.destroy(); } catch { undefined; }
    disposeOverlays();
  }
}

const wholeMessage = (name: string) => new RegExp(
  `^Error: ${name}: \`label\` is required \\(it names the ${name === 'ArenaSparkline' ? 'sparkline' : 'chart'} for the accessible name, and nothing can derive that\\)$`);

test('a name of nothing but spaces is refused, naming its component and the member, one member at a time', () => {
  const declared = guardedNames();
  assert.ok(declared.length > 0, 'no contract declares a guarded name -- this suite matched nothing, so it proves nothing');
  for (const { component, member } of declared) {
    const template = CASES[`${component}.${member}`];
    assert.ok(template, `${component}.${member} is a guarded name and this suite has no case for it -- add one`);
    assert.throws(
      () => drawn(template),
      (error) => error instanceof Error && error.message.startsWith(`${component}: \`${member}\` is required`),
      `${component} accepted a \`${member}\` of nothing but spaces, or refused it without naming itself and it. A guard trims before it decides.`,
    );
  }
});

test('the cases are the guarded names and nothing else, so a retired one cannot sit here unnoticed', () => {
  const declared = new Set(guardedNames().map((g) => `${g.component}.${g.member}`));
  assert.ok(declared.size > 0, 'no contract declares a guarded name');
  for (const key of Object.keys(CASES)) {
    assert.ok(declared.has(key), `${key} has a case here and declares no guarded name -- stale, delete it`);
  }
  for (const key of declared) assert.ok(key in CASES, `${key} is a guarded name with no case here -- add one`);
});

test('a chart refuses an empty label with its own whole message, naming the chart', () => {
  assert.equal(Object.keys(CHART_CASES).length, 11, 'the eleven charts that guard a label');
  for (const [name, template] of Object.entries(CHART_CASES)) {
    assert.throws(() => drawn(template), wholeMessage(name), `${name} accepted an empty label, or refused it with another message`);
  }
});
