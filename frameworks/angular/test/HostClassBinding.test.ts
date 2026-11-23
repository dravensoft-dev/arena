import '@angular/compiler';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { assertNoNode } from './NodeAssert';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { useTestEnvironment, glyphIds, symbol } from './TestbedEnv';
import { ANGULAR_COMPONENTS, LIB, TAILWIND_COMPONENTS, UTILS } from './Compliance';
import { ArenaActivityFeed } from '../components/display/arena-activity-feed/ArenaActivityFeed';
import { ArenaAppLogo } from '../components/brand/arena-app-logo/ArenaAppLogo';
import { arenaAppLogoStyles } from '../components/brand/arena-app-logo/ArenaAppLogo.variants';
import { ArenaAvatar } from '../components/display/arena-avatar/ArenaAvatar';
import { ArenaBarChart } from '../components/charts/arena-bar-chart/ArenaBarChart';
import { ArenaBreadcrumbs } from '../components/navigation/arena-breadcrumbs/ArenaBreadcrumbs';
import type { ArenaCrumb } from '../Api.generated';
import { ArenaBulkActionBar } from '../components/navigation/arena-bulk-action-bar/ArenaBulkActionBar';
import type { ArenaBulkAction } from '../Api.generated';
import { ArenaChartCard } from '../components/charts/arena-chart-card/ArenaChartCard';
import { ArenaDoughnutChart } from '../components/charts/arena-doughnut-chart/ArenaDoughnutChart';
import { ArenaEmptyState } from '../components/feedback/arena-empty-state/ArenaEmptyState';
import { ArenaErrorState } from '../components/feedback/arena-error-state/ArenaErrorState';
import { ArenaLineChart } from '../components/charts/arena-line-chart/ArenaLineChart';
import { ArenaPageHead } from '../components/navigation/arena-page-head/ArenaPageHead';
import { ArenaSkeleton } from '../components/display/arena-skeleton/ArenaSkeleton';
import { ArenaStatCard } from '../components/display/arena-stat-card/ArenaStatCard';
import { arenaStatCardStyles } from '../components/display/arena-stat-card/ArenaStatCard.variants';
import type { ArenaStatDelta } from '../Api.generated';
import { ArenaTag } from '../components/display/arena-tag/ArenaTag';
import { ArenaUnauthCard } from '../components/display/arena-unauth-card/ArenaUnauthCard';

useTestEnvironment();

const root = document.documentElement;
before(() => {
  root.style.setProperty('--bp-sm', '480px');
});
after(() => {
  root.style.removeProperty('--bp-sm');
});

@Component({
  standalone: true,
  imports: [ArenaAppLogo],
  template: `<arena-app-logo name="Draven" class="consumer-class"><span mark>mark</span></arena-app-logo>`,
})
class AppLogoStaticAttributeHost {}

@Component({
  standalone: true,
  imports: [ArenaAvatar],
  template: `<arena-avatar class="consumer-class" name="Juan Carlos" />`,
})
class AvatarHost {}

@Component({
  standalone: true,
  imports: [ArenaTag],
  template: `<arena-tag class="consumer-class">Blocked</arena-tag>`,
})
class TagHost {}

@Component({
  standalone: true,
  imports: [ArenaSkeleton],
  template: `<arena-skeleton class="consumer-class" />`,
})
class SkeletonHost {}

@Component({
  standalone: true,
  imports: [ArenaBreadcrumbs],
  host: { 'data-host': 'breadcrumbs' },
  template: `<arena-breadcrumbs class="consumer-class" ariaLabel="Project navigation" [items]="items" />`,
})
class BreadcrumbsHost {
  items: ArenaCrumb[] = [];
}

function createBreadcrumbsHost(items: ArenaCrumb[] = []) {
  const fixture = TestBed.createComponent(BreadcrumbsHost);
  fixture.componentInstance.items = items;
  return fixture;
}

@Component({
  standalone: true,
  imports: [ArenaStatCard],
  template: `<arena-stat-card class="consumer-class" label="Revenue" value="$48.2k" />`,
})
class StatCardHost {}

function renderStatCard(label: string, value: string, delta?: ArenaStatDelta, icon?: string) {
  const fixture = TestBed.createComponent(ArenaStatCard);
  fixture.componentRef.setInput('label', label);
  fixture.componentRef.setInput('value', value);
  if (delta !== undefined) fixture.componentRef.setInput('delta', delta);
  if (icon !== undefined) fixture.componentRef.setInput('icon', icon);
  return fixture;
}

test('arena-stat-card: a static "label"/"value" attribute satisfies the required string input and stays on the element', () => {
  const fixture = TestBed.createComponent(StatCardHost);
  fixture.detectChanges();
  const host = fixture.nativeElement.querySelector('arena-stat-card') as HTMLElement;
  assert.equal(host.getAttribute('label'), 'Revenue', 'the literal attribute should still land on the host element itself');
  assert.equal(host.getAttribute('value'), '$48.2k', 'sanity: the second literal attribute lands the same way');
  assert.ok(host.classList.contains('consumer-class'), `sanity: the static class attribute survives the host [class] binding: "${host.className}"`);
  const labelClass = arenaStatCardStyles().label().split(/\s+/)[0];
  const valueClass = arenaStatCardStyles().value().split(/\s+/)[0];
  assert.equal(host.querySelector(`.${labelClass}`)?.textContent, 'Revenue', 'the attribute must reach the label input, not only the DOM');
  assert.equal(host.querySelector(`.${valueClass}`)?.textContent, '$48.2k', 'the attribute must reach the value input, not only the DOM');
  fixture.destroy();
});

@Component({
  standalone: true,
  imports: [ArenaBulkActionBar],
  host: { 'data-host': 'bulk-action-bar' },
  template: `<arena-bulk-action-bar class="consumer-class" [count]="count" [actions]="actions" />`,
})
class BulkActionBarHost {
  count = 0;
  actions: ArenaBulkAction[] = [];
}

function createBulkActionBarHost() {
  return TestBed.createComponent(BulkActionBarHost);
}

@Component({
  standalone: true,
  imports: [ArenaChartCard],
  host: { 'data-host': 'chart-card' },
  template: `<arena-chart-card class="consumer-class" />`,
})
class ChartCardHost {}

@Component({
  standalone: true,
  imports: [ArenaErrorState],
  template: `<arena-error-state class="consumer-class" title="Something went wrong" [retryLabel]="retryLabel" />`,
})
class ErrorStateWithoutActionHost {
  retryLabel: string | undefined;
}

@Component({
  standalone: true,
  imports: [ArenaPageHead],
  host: { 'data-host': 'page-head' },
  template: `<arena-page-head class="consumer-class" [title]="title" />`,
})
class PageHeadWithoutActionsHost {
  title = '';
}

function createPageHeadWithoutActionsFixture() {
  const fixture = TestBed.createComponent(PageHeadWithoutActionsHost);
  fixture.componentInstance.title = 'Portal';
  return fixture;
}

@Component({
  standalone: true,
  imports: [ArenaUnauthCard],
  host: { 'data-host': 'unauth-card' },
  template: `<arena-unauth-card class="consumer-class" />`,
})
class UnauthCardWithoutProjectionHost {}

@Component({
  standalone: true,
  imports: [ArenaBarChart],
  host: { 'data-host': 'bar-chart' },
  template: `<arena-bar-chart [label]="label" [labels]="labels" [series]="series" />`,
})
class BarChartHost {
  label = 'Deployments per week';
  labels: string[] = [];
  values: number[] = [];
  series: { label: string; values: number[] }[] = [{ label: 'One', values: [] }];
}

function createBarChartHost() {
  const fixture = TestBed.createComponent(BarChartHost);
  fixture.detectChanges();
  return fixture;
}

@Component({
  standalone: true,
  imports: [ArenaLineChart],
  host: { 'data-host': 'line-chart' },
  template: `<arena-line-chart [label]="label" [labels]="labels" [series]="series" />`,
})
class LineChartHost {
  label = 'p95 latency';
  labels: string[] = [];
  values: number[] = [];
  series: { label: string; values: number[] }[] = [{ label: 'One', values: [] }];
}

function createLineChartHost() {
  const fixture = TestBed.createComponent(LineChartHost);
  fixture.detectChanges();
  return fixture;
}

@Component({
  standalone: true,
  imports: [ArenaDoughnutChart],
  host: { 'data-host': 'doughnut-chart' },
  template: `<arena-doughnut-chart [label]="label" [labels]="labels" [series]="series" />`,
})
class DoughnutChartHost {
  label = 'Traffic by region';
  labels: string[] = [];
  values: number[] = [];
  series: { label: string; values: number[] }[] = [{ label: 'One', values: [] }];
}

function createDoughnutChartHost() {
  const fixture = TestBed.createComponent(DoughnutChartHost);
  fixture.detectChanges();
  return fixture;
}

function renderAppLogo(name: string, dim?: string) {
  const fixture = TestBed.createComponent(ArenaAppLogo);
  fixture.componentRef.setInput('name', name);
  if (dim !== undefined) fixture.componentRef.setInput('dim', dim);
  return fixture;
}

test('arena-app-logo: the two-ink wordmark renders as one word with no space -- "DRAVEN" + "SOFT" reads as exactly "DRAVENSOFT"', () => {
  const fixture = renderAppLogo('DRAVEN', 'SOFT');
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const nameClass = arenaAppLogoStyles().name().split(/\s+/)[0];
  const nameEl = host.querySelector(`.${nameClass}`) as HTMLElement;
  assert.ok(nameEl, 'the name slot did not render');
  assert.equal(
    nameEl.textContent,
    'DRAVENSOFT',
    `expected the wordmark to read as one word with no space, got ${JSON.stringify(nameEl.textContent)}`,
  );

  const significant = Array.from(nameEl.childNodes).filter((n) => n.nodeType !== Node.COMMENT_NODE);
  assert.equal(significant.length, 2, `expected exactly two non-comment child nodes, got ${significant.length}`);
  assert.equal(significant[0].nodeType, Node.TEXT_NODE);
  assert.equal(significant[0].textContent, 'DRAVEN');
  const dimEl = significant[1] as HTMLElement;
  assert.equal(dimEl.nodeType, Node.ELEMENT_NODE);
  assert.equal(dimEl.textContent, 'SOFT');
  const dimClass = arenaAppLogoStyles().dim().split(/\s+/)[0];
  assert.ok(dimEl.classList.contains(dimClass), `the dim span is missing its recipe class "${dimClass}"`);
  fixture.destroy();
});

test('arena-app-logo: with no dim, the wordmark renders the name alone and no dim span at all', () => {
  const fixture = renderAppLogo('Draven');
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const nameClass = arenaAppLogoStyles().name().split(/\s+/)[0];
  const nameEl = host.querySelector(`.${nameClass}`) as HTMLElement;
  assert.equal(nameEl.textContent, 'Draven');

  for (const node of Array.from(nameEl.childNodes))
    assert.notEqual(node.nodeType, Node.ELEMENT_NODE, 'no dim was set, so no dim <span> should render');

  assert.equal(nameEl.children.length, 0, 'no dim was set, so the name slot should have no element children');
  fixture.destroy();
});

test('arena-app-logo: a static "name" attribute satisfies the required input and reaches it', () => {
  const fixture = TestBed.createComponent(AppLogoStaticAttributeHost);
  fixture.detectChanges();
  const host = fixture.nativeElement.querySelector('arena-app-logo') as HTMLElement;
  assert.ok(host.classList.contains('consumer-class'), `sanity: the static class attribute survives the host [class] binding: "${host.className}"`);
  const nameClass = arenaAppLogoStyles().name().split(/\s+/)[0];
  assert.equal(
    (host.querySelector(`.${nameClass}`) as HTMLElement | null)?.textContent,
    'Draven',
    'the attribute must reach the name input, not merely sit on the element',
  );
  fixture.destroy();
});

test('arena-app-logo: content selected for [mark] projects into the mark slot', () => {
  const fixture = TestBed.createComponent(AppLogoStaticAttributeHost);
  fixture.detectChanges();
  const host = fixture.nativeElement.querySelector('arena-app-logo') as HTMLElement;
  const markClass = arenaAppLogoStyles().mark().split(/\s+/)[0];
  const markSlot = host.querySelector(`.${markClass}`);
  assert.ok(markSlot, 'the mark slot element itself is missing');
  assert.equal(markSlot?.querySelector('span')?.textContent, 'mark', 'the projected <span mark> should render inside the mark slot');
  fixture.destroy();
});

function renderActivityFeed(items: unknown[]) {
  const fixture = TestBed.createComponent(ArenaActivityFeed);
  fixture.componentRef.setInput('label', 'Deployment activity');
  fixture.componentRef.setInput('items', items);
  return fixture;
}

test('arena-activity-feed: the first <li> carries no divider and every later one does, in a real render', () => {
  const fixture = renderActivityFeed([
    { id: '1', actor: 'Marta', action: 'deployed', tone: 'success' },
    { id: '2', actor: 'Ivan', action: 'opened an incident', tone: 'danger' },
    { id: '3', actor: 'Rae', action: 'approved the rollback' },
  ]);
  fixture.detectChanges();
  const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li'));
  assert.equal(rows.length, 3);
  assert.equal(rows[0].hasAttribute('data-arena-divided'), false, 'the first <li> must not carry the divider');
  for (const row of rows.slice(1))
    assert.equal(row.getAttribute('data-arena-divided'), '', 'every <li> after the first must carry the divider');
  fixture.destroy();
});

test('arena-activity-feed: actor, action and target compose with exactly one space between them, and time is absent when unset', () => {
  const fixture = renderActivityFeed([
    { id: '1', actor: 'Marta', action: 'deployed', target: 'billing@2.4.1' },
  ]);
  fixture.detectChanges();
  const li = (fixture.nativeElement as HTMLElement).querySelector('li') as HTMLElement;

  const spans = li.querySelectorAll('span');
  const text = spans[1] as HTMLElement;
  assert.equal(
    text.textContent?.replace(/\s+/g, ' ').trim(),
    'Marta deployed billing@2.4.1',
    `expected "Marta deployed billing@2.4.1" with single spaces, got ${JSON.stringify(text.textContent)}`,
  );
  assert.equal(spans.length, 3, 'dot, text and target spans only -- no time span when time is unset');
  fixture.destroy();
});

test('arena-activity-feed: an item with neither target nor time renders only the dot and the actor/action text', () => {
  const fixture = renderActivityFeed([{ id: '1', actor: 'Rae', action: 'approved the rollback' }]);
  fixture.detectChanges();
  const li = (fixture.nativeElement as HTMLElement).querySelector('li') as HTMLElement;
  assert.equal(li.querySelectorAll('span').length, 2, 'dot and text spans only -- no target, no time');
  const text = li.querySelectorAll('span')[1] as HTMLElement;
  assert.equal(text.textContent?.replace(/\s+/g, ' ').trim(), 'Rae approved the rollback');
  fixture.destroy();
});

test('arena-skeleton: the host itself carries the loading status, not a wrapper inside it', async () => {
  const fixture = TestBed.createComponent(SkeletonHost);
  fixture.detectChanges();
  await fixture.whenStable();
  const host = fixture.nativeElement.querySelector('arena-skeleton') as HTMLElement;
  assert.equal(host.getAttribute('role'), 'status');
  assert.equal(host.getAttribute('aria-label'), 'Loading');
  assert.equal(host.children.length, 0, 'a skeleton with no lines renders no children of its own');
});

test('arena-breadcrumbs: a real <nav> carries the landmark, rather than role="navigation" on the host', async () => {
  const fixture = createBreadcrumbsHost();
  fixture.detectChanges();
  await fixture.whenStable();
  const host = fixture.nativeElement.querySelector('arena-breadcrumbs') as HTMLElement;
  const nav = host.querySelector('nav') as HTMLElement;
  assert.equal(host.getAttribute('role'), null,
    'the pattern offers role="navigation" for when <nav> cannot be used, and here it can');
  assert.equal(nav.getAttribute('aria-label'), 'Project navigation',
    'the landmark name must come from the ariaLabel input, not from a constant the component owns');
  assert.equal(nav.children.length, 0, 'with no items, the trail renders no crumbs of its own');
  fixture.destroy();
});

test('arena-breadcrumbs: a crumb click emits the clicked ArenaCrumb alone through navigate', async () => {
  const fixture = createBreadcrumbsHost();
  fixture.detectChanges();
  await fixture.whenStable();
  const breadcrumbs = fixture.debugElement.query(By.directive(ArenaBreadcrumbs)).componentInstance as ArenaBreadcrumbs;

  let received: ArenaCrumb | undefined;
  breadcrumbs.navigate.subscribe((payload) => {
    received = payload;
  });

  const crumb: ArenaCrumb = { label: 'Clients', href: '/clients' };
  const event = new (fixture.nativeElement as Element).ownerDocument.defaultView!.MouseEvent(
    'click', { cancelable: true },
  );
  (breadcrumbs as unknown as { onCrumbClick(crumb: ArenaCrumb, event: MouseEvent): void })
    .onCrumbClick(crumb, event);

  assert.ok(received, 'navigate did not emit');
  assert.equal(received, crumb, 'the emitted payload is not the same crumb object the click targeted');
  fixture.destroy();
});

test('arena-stat-card: a delta with a value renders the pill; a delta with a tone but no value renders nothing', () => {
  const withValue = renderStatCard('Deploys', '128', { value: '+12%', direction: 'up', tone: 'positive' });
  withValue.detectChanges();
  const deltaClass = arenaStatCardStyles().delta().split(/\s+/)[0];
  assert.ok((withValue.nativeElement as HTMLElement).querySelector(`.${deltaClass}`), 'a delta with a value must render the pill');
  withValue.destroy();

  const emptyValue = renderStatCard('Deploys', '128', { value: '', direction: 'up', tone: 'positive' });
  emptyValue.detectChanges();
  assertNoNode(
    (emptyValue.nativeElement as HTMLElement).querySelector(`.${deltaClass}`),
    'a delta with a tone/direction but an empty value must render no pill at all',
  );
  emptyValue.destroy();
});

test('arena-stat-card: an icon class name renders the glyph inside the aria-hidden wrapper', () => {
  const fixture = renderStatCard('Deploys', '128', undefined, 'ph-bold ph-rocket');
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const iconClass = arenaStatCardStyles().icon().split(/\s+/)[0];
  const iconSlot = host.querySelector(`.${iconClass}`);
  assert.ok(iconSlot, 'the icon wrapper element itself is missing');
  assert.equal(iconSlot?.getAttribute('aria-hidden'), 'true', 'the wrapper must stay aria-hidden');
  assert.deepEqual(glyphIds(iconSlot!), [symbol('bold', 'rocket')], 'the glyph must be the one the icon class name names');
  fixture.destroy();
});

function renderEmptyState(title: string) {
  const fixture = TestBed.createComponent(ArenaEmptyState);
  fixture.componentRef.setInput('title', title);
  return fixture;
}

function createErrorStateWithRetryFixture() {
  const fixture = TestBed.createComponent(ErrorStateWithoutActionHost);
  fixture.componentInstance.retryLabel = 'Retry';
  return fixture;
}

test('arena-error-state: retryLabel draws a real retry button carrying the manifest\'s retry slot classes', async () => {
  const fixture = createErrorStateWithRetryFixture();
  fixture.detectChanges();
  await fixture.whenStable();
  const host = fixture.nativeElement.querySelector('arena-error-state') as HTMLElement;
  const button = host.querySelector('button');
  assert.notEqual(button, null, 'retryLabel was supplied, so a retry button must render');
  assert.equal(button!.textContent, 'Retry');
  assert.ok(button!.closest('arena-button'), 'the retry action IS an ArenaButton, composed rather '
    + 'than typed out, so both layers reach the same part');
  fixture.destroy();
});

test('arena-page-head: an unmeasured width renders the WIDE layout, so the narrow branch never flashes on first paint', async () => {
  const fixture = createPageHeadWithoutActionsFixture();
  fixture.detectChanges();
  await fixture.whenStable();
  const host = fixture.nativeElement.querySelector('arena-page-head') as HTMLElement;
  assert.equal(host.hasAttribute('data-arena-narrow'), false,
    'an unmeasured page head must render as a row, and the narrow branch must not render before anything has been measured');
  assert.equal(host.hasAttribute('data-arena-align'), false,
    'the align is a class an adopter writes, so the head writes no attribute for it');
});

test('arena-page-head: a platform with no ResizeObserver still renders, on the wide layout', async () => {
  const globals = globalThis as { ResizeObserver?: typeof ResizeObserver };
  const saved = globals.ResizeObserver;
  delete globals.ResizeObserver;
  try {
    const fixture = createPageHeadWithoutActionsFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement.querySelector('arena-page-head') as HTMLElement;
    assert.equal(host.hasAttribute('data-arena-narrow'), false,
      'with no ResizeObserver the width stays null, which is the wide layout');
  } finally {
    globals.ResizeObserver = saved;
  }
});

const DISPLAY_UTILITY =
  /(?:^|\s)(?:block|inline-block|inline|flex|inline-flex|grid|inline-grid|table|inline-table|table-[a-z-]+|flow-root|contents|list-item|hidden)(?=\s|$)/;

const { pascal: kebabToPascal } = await import(
  pathToFileURL(join(UTILS, 'case.ts')).href
) as { pascal: (dirName: string) => string };

const { manifestFiles } = await import(pathToFileURL(join(LIB, 'tailwind', 'tailwind-compile.ts')).href);

function findManifestFile(componentsDir: string, filename: string): string | undefined {
  const paths: string[] = manifestFiles(componentsDir);
  return paths.find((p) => basename(p) === filename);
}

const OWN_HOST = new Set(['arena-bar-chart', 'arena-line-chart', 'arena-doughnut-chart', 'arena-horizontal-bar-chart', 'arena-pyramid-chart', 'arena-radar-chart', 'arena-scatter-chart', 'arena-sparkline', 'arena-gauge-chart', 'arena-funnel-chart', 'arena-heatmap-chart']);

const HOST_SLOT: Record<string, { manifest?: string; slot: string }> = {
  'arena-accordion-item': { manifest: 'ArenaAccordion.manifest.json', slot: 'item' },
  'arena-bottom-nav-item': { manifest: 'ArenaBottomNav.manifest.json', slot: 'item' },
  'arena-calendar-event': { manifest: 'ArenaCalendar.manifest.json', slot: 'chip' },
  'arena-dialog': { slot: 'scrim' },
  'arena-board-column': { manifest: 'ArenaBoard.manifest.json', slot: 'column' },
  'arena-people-list': { slot: 'root' },
  'arena-person-row': { manifest: 'ArenaPeopleList.manifest.json', slot: 'row' },
  'arena-radio-group': { manifest: 'ArenaRadio.manifest.json', slot: 'group' },
  'arena-checkbox-group': { manifest: 'ArenaCheckbox.manifest.json', slot: 'group' },
  'arena-multi-select': { manifest: 'ArenaCombobox.manifest.json', slot: 'root' },
  'arena-side-nav-collapsible': { manifest: 'ArenaSideNav.manifest.json', slot: 'section' },
  'arena-side-nav-item': { manifest: 'ArenaSideNav.manifest.json', slot: 'item' },
  'arena-side-nav-section': { manifest: 'ArenaSideNav.manifest.json', slot: 'section' },
  'arena-segmented-control': { slot: 'track' },
  'arena-tab': { manifest: 'ArenaTabs.manifest.json', slot: 'panel' },
  'arena-table-cell': { manifest: 'ArenaTable.manifest.json', slot: 'td' },
  'arena-table-row': { manifest: 'ArenaTable.manifest.json', slot: 'row' },
};

test('every Angular primitive host-binds a slot that carries a display utility, so the host never collapses to the UA-default inline box', () => {
  const componentsDir = ANGULAR_COMPONENTS;
  const manifestsDir = TAILWIND_COMPONENTS;

  const names = readdirSync(componentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((category) =>
      readdirSync(join(componentsDir, category.name), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
    );
  assert.ok(names.length > 0, 'no primitive directories found -- the guard would silently check nothing');

  for (const dir of Object.keys(HOST_SLOT)) {
    assert.ok(names.includes(dir), `HOST_SLOT names "${dir}", which is not a primitive directory -- stale entry`);
  }

  for (const owner of OWN_HOST) {
    assert.ok(names.includes(owner), `OWN_HOST names "${owner}", which is not a primitive directory -- stale entry`);
    const ownerPath = findManifestFile(manifestsDir, `${kebabToPascal(owner)}.manifest.json`);
    const ownerSlots = ownerPath === undefined ? {} : (JSON.parse(readFileSync(ownerPath, 'utf8')) as { slots?: Record<string, string> }).slots ?? {};
    assert.ok(!('root' in ownerSlots), `OWN_HOST names "${owner}", but its manifest now carries a root slot -- the exclusion is stale and should be removed so this primitive is checked like every other one`);
  }

  const onAdoptersElement = new Set(primitiveSources()
    .filter(({ source }) => /selector:\s*'\[\w+\]'/.test(source))
    .map(({ name }) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()));

  for (const name of names) {
    if (OWN_HOST.has(name)) continue;
    if (onAdoptersElement.has(name)) continue;
    const override = HOST_SLOT[name];
    const slot = override?.slot ?? 'root';
    const manifestName = override?.manifest ?? `${kebabToPascal(name)}.manifest.json`;

    if (override?.manifest !== undefined) {
      const ownName = `${kebabToPascal(name)}.manifest.json`;
      assert.equal(
        findManifestFile(manifestsDir, ownName), undefined,
        `HOST_SLOT sends "${name}" to ${manifestName}, but ${ownName} now exists -- it no longer shares its family's recipe, so the entry is stale`,
      );
    }

    const manifestPath = findManifestFile(manifestsDir, manifestName);
    assert.ok(manifestPath !== undefined, `${name}: no manifest named ${manifestName} found anywhere under ${manifestsDir}`);
    const manifest = JSON.parse(readFileSync(manifestPath as string, 'utf8')) as { slots?: Record<string, string> };
    const classes = manifest.slots?.[slot];
    assert.ok(typeof classes === 'string', `${name}: ${manifestPath} has no "slots.${slot}" string`);
    assert.match(
      classes as string,
      DISPLAY_UTILITY,
      `${name}: the "${slot}" slot it host-binds carries no display utility -- host-binding it collapses to the UA-default inline box`,
    );
  }
});

const HOST_BOUND_ROOT = /'\[class\]':/;
const HOST_STATIC_DISPLAY = /\bstyle:\s*'[^']*display\s*:/;

test('a primitive that does not host-bind its root takes its host out of layout with display: contents', () => {
  const sources = primitiveSources();
  assert.ok(sources.length > 0, 'no primitive sources found -- the guard would silently check nothing');

  for (const { name, path, source } of sources) {
    const hostBlock = hostBlockOf(source);
    if (HOST_BOUND_ROOT.test(hostBlock)) continue;
    assert.match(
      hostBlock,
      HOST_STATIC_DISPLAY,
      `${path}: ${name} leaves its host bare and declares no display on it. An <arena-x> with no `
      + 'display is an inline box, and as a flex item it blockifies to shrink-to-fit -- so a '
      + "w-full on the real element inside resolves against the shrunk host and does nothing. "
      + 'Either host-bind the root slot, or take the host out of layout with display: contents.',
    );
  }
});

const HOST_BOXLESS = /\bstyle:\s*'[^']*\bdisplay\s*:\s*contents/;

test('a chart host keeps no box and its frame slot fills the inline axis, so a chart in a row is not shrink-to-fit', () => {
  const charts = primitiveSources().filter(({ path }) => path.startsWith(join(ANGULAR_COMPONENTS, 'charts')) && /Chart\.ts$/.test(path));
  assert.ok(charts.length > 0, 'no chart sources found -- the guard would silently check nothing');

  for (const { name, path, source } of charts) {
    assert.match(hostBlockOf(source), HOST_BOXLESS, `${path}: ${name} gives its host a box, so the frame slot is not what the chart measures and lays out in`);
    assert.match(source, /\[attr\.data-arena-part\]="parts\.frame"/, `${path}: ${name} draws no frame part`);
    const manifestPath = findManifestFile(TAILWIND_COMPONENTS, `${name}.manifest.json`);
    assert.ok(manifestPath, `${name}: no manifest found`);
    const frame = (JSON.parse(readFileSync(manifestPath as string, 'utf8')) as { slots: Record<string, string> }).slots['frame'] ?? '';
    assert.match(frame, /(?:^|\s)w-full(?=\s|$)/, `${name}: its frame slot declares no w-full, so the chart is shrink-to-fit as a flex item`);
  }
});

const GLOBAL_ATTRIBUTE_INPUTS = ['title', 'name', 'id', 'align'] as const;

const HOST_COST: Record<(typeof GLOBAL_ATTRIBUTE_INPUTS)[number], string> = {
  title: ' and the browser draws a tooltip over it',
  name: '',
  id: ' AND on the real control inside -- two elements with one id, where a <label for> resolves to the host, which is not a labelable control',
  align: ' and the browser maps the legacy attribute to text-align on the host',
};

function hostBlockOf(source: string): string {
  const at = source.indexOf('host: {');
  if (at === -1) return '';
  let depth = 0;
  for (let i = source.indexOf('{', at); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(at, i + 1);
    }
  }
  return '';
}

function primitiveSources(): Array<{ name: string; path: string; source: string }> {
  const out: Array<{ name: string; path: string; source: string }> = [];
  for (const category of readdirSync(ANGULAR_COMPONENTS, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    for (const dir of readdirSync(join(ANGULAR_COMPONENTS, category.name), { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const name = kebabToPascal(dir.name);
      const path = join(ANGULAR_COMPONENTS, category.name, dir.name, `${name}.ts`);
      out.push({ name, path, source: readFileSync(path, 'utf8') });
    }
  }
  return out;
}

test('a primitive whose input is named after a global HTML attribute clears that attribute off its host', () => {
  const sources = primitiveSources();
  assert.ok(sources.length > 0, 'no primitive sources found -- the guard would silently check nothing');

  const problems: string[] = [];
  let declared = 0;

  for (const { name, path, source } of sources) {
    const host = hostBlockOf(source);
    const tag = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    for (const attribute of GLOBAL_ATTRIBUTE_INPUTS) {
      const takesInput = new RegExp(`^  readonly ${attribute} = input`, 'm').test(source);
      const clears = host.includes(`'[attr.${attribute}]': 'null'`);
      if (takesInput) declared += 1;

      if (takesInput && !clears) {
        problems.push(
          `${path}: ${name} takes a \`${attribute}\` input and does not clear the attribute. `
          + 'Angular writes a static attribute to the DOM during the creation pass whether or not it '
          + `also matches an input, so <${tag} ${attribute}="…"> leaves a real `
          + `${attribute} on the host` + HOST_COST[attribute]
          + `. Add '[attr.${attribute}]': 'null' to the host block.`,
        );
      }
      if (!takesInput && clears) {
        problems.push(
          `${path}: ${name} clears the ${attribute} attribute and declares no \`${attribute}\` input -- `
          + 'stale, and it now removes an attribute a consumer may have meant to set.',
        );
      }
    }
  }

  assert.ok(declared > 0, `no primitive declares an input named one of ${GLOBAL_ATTRIBUTE_INPUTS.join(', ')} -- the guard matched nothing, so it proves nothing`);
  assert.deepEqual(problems, [], `\n  ${problems.join('\n  ')}`);
});

@Component({
  standalone: true,
  imports: [ArenaPageHead, ArenaAvatar],
  template: `
    <arena-page-head title="Projects" />
    <arena-page-head [title]="bound" />
    <arena-avatar name="Ada Lovelace" />
  `,
})
class StrayAttributeHost {
  bound = 'Deployments';
}

test('the clearing binding removes a STATIC attribute and leaves the input holding its value', () => {
  const fixture = TestBed.createComponent(StrayAttributeHost);
  fixture.detectChanges();
  try {
    const [statik, bound] = [...fixture.nativeElement.querySelectorAll('arena-page-head')] as HTMLElement[];
    const avatar = fixture.nativeElement.querySelector('arena-avatar') as HTMLElement;

    assert.equal(statik.hasAttribute('title'), false,
      'the static title survived on the host, so the browser draws a tooltip over the whole header');
    assert.equal(statik.querySelector('h1')?.textContent?.trim(), 'Projects',
      'clearing the attribute also took the value away from the input, which is the wrong half to remove');

    assert.equal(bound.hasAttribute('title'), false, 'a bound title must never reach the DOM as an attribute');
    assert.equal(bound.querySelector('h1')?.textContent?.trim(), 'Deployments');

    assert.equal(avatar.hasAttribute('name'), false, 'the static name survived on the host');
    assert.match(avatar.textContent ?? '', /AL/,
      'the initials are derived from the `name` input, so clearing the attribute must not empty it');
  } finally {
    fixture.destroy();
  }
});

test('arena-doughnut-chart: the style objects that render without data reach the DOM as real declarations', async () => {
  const fixture = createDoughnutChartHost();
  await fixture.whenStable();
  const host = fixture.nativeElement.querySelector('arena-doughnut-chart') as HTMLElement;

  const svg = host.querySelector('svg') as SVGElement;
  assert.equal(svg.style.display, 'block');
  assert.equal(svg.style.flexShrink, '0');

  const legend = host.querySelector(':scope > div > div') as HTMLElement;
  assert.ok(legend, 'the legend column did not render');
  assert.ok(legend.classList.contains('arena-doughnut-chart__legend'), 'the legend column carries its manifest class, which the sheet gives its gap and direction');
  assert.ok(legend.hasAttribute('data-arena-part'), 'the legend column is a drawn part of the manifest');
});

test('arena-doughnut-chart: with no data it draws no slice at all, rather than an empty ring', async () => {
  const fixture = createDoughnutChartHost();
  await fixture.whenStable();
  const host = fixture.nativeElement.querySelector('arena-doughnut-chart') as HTMLElement;

  assertNoNode(host.querySelector('path'), 'an empty doughnut must paint no slice');
  assertNoNode(host.querySelector('text'), 'the centre label must not render with nothing hovered');
  assert.equal(host.querySelectorAll('tbody tr').length, 0, 'the numbers table must have no rows');
});

const consumerClass = 'consumer-class';


interface HostRow {
  name: string;
  tag: string;
  render: () => ComponentFixture<unknown>;
  inHost: boolean;
  preClass?: boolean;
  inner?: string;
  bare?: boolean;
  check?: (host: HTMLElement, name: string) => void;
}

const HOST_ROWS: HostRow[] = [
  { name: 'arena-app-logo', tag: 'arena-app-logo', render: () => renderAppLogo('Draven'), inHost: false, preClass: true },
  { name: 'arena-avatar', tag: 'arena-avatar', render: () => TestBed.createComponent(AvatarHost), inHost: true },
  { name: 'arena-tag', tag: 'arena-tag', render: () => TestBed.createComponent(TagHost), inHost: true },
  { name: 'arena-skeleton', tag: 'arena-skeleton', render: () => TestBed.createComponent(SkeletonHost), inHost: true },
  { name: 'arena-stat-card', tag: 'arena-stat-card', render: () => renderStatCard('Revenue', '$48.2k'), inHost: false, preClass: true },
  {
    name: 'arena-bulk-action-bar', tag: 'arena-bulk-action-bar', render: createBulkActionBarHost, inHost: true,
    check: (host, name) => assert.equal(host.hasAttribute('data-arena-open'), false, `${name}: a bar with no selection (count 0) must render hidden`),
  },
  { name: 'arena-chart-card', tag: 'arena-chart-card', render: () => TestBed.createComponent(ChartCardHost), inHost: true },
  {
    name: 'arena-error-state', tag: 'arena-error-state', render: () => TestBed.createComponent(ErrorStateWithoutActionHost), inHost: true,
    check: (host, name) => assert.equal(host.getAttribute('role'), 'alert', `${name}: the host carries the alert role`),
  },
  { name: 'arena-page-head', tag: 'arena-page-head', render: createPageHeadWithoutActionsFixture, inHost: true },
  { name: 'arena-unauth-card', tag: 'arena-unauth-card', render: () => TestBed.createComponent(UnauthCardWithoutProjectionHost), inHost: true },
  { name: 'arena-activity-feed (carve-out)', tag: 'arena-activity-feed', render: () => renderActivityFeed([]), inHost: false, inner: 'ul', bare: true },
  { name: 'arena-breadcrumbs (carve-out)', tag: 'arena-breadcrumbs', render: () => createBreadcrumbsHost(), inHost: true, inner: 'nav' },
];

test('a primitive host-binds its root slot so the recipe classes and a consumer class both sit on the host, and a carve-out puts the root on the real element inside a bare host', async () => {
  assert.ok(HOST_ROWS.length > 0, 'no rows -- the table would check nothing');
  for (const row of HOST_ROWS) {
    const fixture = row.render();
    if (row.preClass) (fixture.nativeElement as HTMLElement).classList.add(consumerClass);
    fixture.detectChanges();
    await fixture.whenStable();
    const host = (row.inHost ? (fixture.nativeElement as HTMLElement).querySelector(row.tag) : fixture.nativeElement) as HTMLElement;
    const slot = HOST_SLOT[row.tag]?.slot ?? 'root';
    const rootClass = `${row.tag}__${slot}`;
    const carrier = row.inner === undefined ? host : host.querySelector(row.inner) as HTMLElement;
    assert.ok(carrier, `${row.name}: no ${row.inner === undefined ? `<${row.tag}> host` : `<${row.inner}> inside the host`} rendered`);
    assert.ok(carrier.classList.contains(rootClass), `${row.name}: ${row.inner === undefined ? 'host' : `the <${row.inner}>`} is missing root class "${rootClass}"`);
    if (row.bare) {
      assert.equal(host.className, '', `${row.name}: the host must carry no recipe classes of its own -- root is not host-bound here`);
    } else {
      assert.ok(host.classList.contains(consumerClass), `${row.name}: host lost the consumer's class: "${host.className}"`);
    }
    if (row.inner !== undefined && !row.bare) {
      assert.ok(!carrier.classList.contains(consumerClass),
        `${row.name}: a carve-out gives the consumer no route to the semantic element inside the host, so a consumer class lands on the host alone`);
    }
    row.check?.(host, row.name);
    fixture.destroy();
  }
});

interface AbsentRow {
  name: string;
  render: () => ComponentFixture<unknown>;
  inHost?: string;
  absent: Array<[selector: string, message: string]>;
  present?: Array<[selector: string, message: string]>;
  children?: number;
}

const ABSENT_ROWS: AbsentRow[] = [
  {
    name: 'arena-bulk-action-bar', render: createBulkActionBarHost, inHost: 'arena-bulk-action-bar', absent: [], children: 0,
  },
  {
    name: 'arena-chart-card', render: () => TestBed.createComponent(ChartCardHost), inHost: 'arena-chart-card',
    absent: [['.arena-chart-card__head', 'an empty chart card (no title, no actions) must not render the head row at all']], children: 0,
  },
  {
    name: 'arena-empty-state', render: () => renderEmptyState('No projects yet'),
    absent: [
      ['button', 'no action was projected, so no action markup should exist at all'],
      [':scope > .arena-empty-state__action', 'the action wrapper div must not render when the action slot is empty'],
    ],
  },
  {
    name: 'arena-error-state', render: () => TestBed.createComponent(ErrorStateWithoutActionHost), inHost: 'arena-error-state',
    absent: [
      ['button', 'neither retryLabel nor a secondary action was supplied, so no action markup should exist at all'],
      [':scope > .arena-error-state__actions', 'the actions wrapper div must not render when both retryLabel and secondaryAction are absent'],
    ],
  },
  {
    name: 'arena-page-head', render: createPageHeadWithoutActionsFixture, inHost: 'arena-page-head',
    absent: [
      ['button', 'no actions were projected, so no action markup should exist at all'],
      [':scope > .arena-page-head__actions', 'the actions wrapper div must not render when the actions slot is empty'],
    ],
    children: 1,
  },
  {
    name: 'arena-unauth-card', render: () => TestBed.createComponent(UnauthCardWithoutProjectionHost), inHost: 'arena-unauth-card',
    absent: [
      ['.arena-unauth-card__brand', 'the brand wrapper div must not render when the [brand] slot is empty'],
      ['.arena-unauth-card__footer', 'the footer wrapper div must not render when the [footer] slot is empty'],
    ],
    present: [
      ['arena-card', 'the panel IS an ArenaCard, composed rather than typed out a second time, so both layers reach the same part'],
      ['.arena-unauth-card__body', 'the body wrapper must always render -- it is not gated'],
    ],
    children: 1,
  },
  {
    name: 'arena-stat-card', render: () => renderStatCard('Deploys', '128'),
    absent: [['.arena-stat-card__icon', 'no icon means no icon wrapper at all']],
  },
];

test('a wrapper gated on projected content is absent from the DOM when nothing is projected', async () => {
  assert.ok(ABSENT_ROWS.length > 0, 'no rows -- the table would check nothing');
  for (const row of ABSENT_ROWS) {
    const fixture = row.render();
    fixture.detectChanges();
    await fixture.whenStable();
    const host = (row.inHost === undefined ? fixture.nativeElement : (fixture.nativeElement as HTMLElement).querySelector(row.inHost)) as HTMLElement;
    for (const [selector, message] of row.absent) assertNoNode(host.querySelector(selector), `${row.name}: ${message}`);
    for (const [selector, message] of row.present ?? []) assert.ok(host.querySelector(selector), `${row.name}: ${message}`);
    if (row.children !== undefined) assert.equal(host.children.length, row.children, `${row.name}: the host renders ${row.children} children with nothing projected`);
    fixture.destroy();
  }
});

interface ChartRow {
  name: string;
  make: () => ComponentFixture<unknown>;
  part: string;
  label: string;
  framed: boolean;
  tokens: boolean;
}

const CHART_ROWS: ChartRow[] = [
  { name: 'arena-bar-chart', make: createBarChartHost, part: 'bar-chart', label: 'Deployments per week — bar chart', framed: true, tokens: true },
  { name: 'arena-line-chart', make: createLineChartHost, part: 'line-chart', label: 'p95 latency — line chart', framed: true, tokens: true },
  { name: 'arena-doughnut-chart', make: createDoughnutChartHost, part: 'doughnut-chart', label: 'Traffic by region — doughnut chart', framed: false, tokens: false },
];

async function eachChart(rows: ChartRow[], body: (row: ChartRow, host: HTMLElement) => void): Promise<void> {
  assert.ok(rows.length > 0, 'no chart rows -- the table would check nothing');
  for (const row of rows) {
    const fixture = row.make();
    await fixture.whenStable();
    body(row, fixture.nativeElement.querySelector(row.name) as HTMLElement);
  }
}

test('a chart host keeps no box and the frame part carries the frame class, with no inline position or width', async () => {
  await eachChart(CHART_ROWS, (row, host) => {
    assert.equal(host.style.display, 'contents', `${row.name}: host declared display "${host.style.display}"`);
    const frame = host.querySelector(':scope > div') as HTMLElement;
    assert.equal(frame.getAttribute('data-arena-part'), `${row.part}.frame`, `${row.name}: the frame part`);
    assert.ok(frame.classList.contains(`${row.name}__frame`), `${row.name}: frame carries "${frame.className}"`);
    if (row.framed) {
      assert.equal(frame.style.position, '', `${row.name}: the frame carries no inline position`);
      assert.equal(frame.style.width, '', `${row.name}: the frame carries no inline width`);
    } else {
      assert.equal(frame.getAttribute('style'), null, `${row.name}: the doughnut frame carries no inline style`);
    }
  });
});

test('a chart binds its numbers table as a style object, not stringified into the attribute', async () => {
  await eachChart(CHART_ROWS, (row, host) => {
    const table = host.querySelector('table') as HTMLElement;
    assert.ok(table, `${row.name}: the visually-hidden numbers table did not render`);
    const box = table.parentElement as HTMLElement;
    assert.ok(!(box.getAttribute('style') ?? '').includes('[object Object]'),
      `${row.name}: the style object was stringified: "${box.getAttribute('style')}"`);
    assert.equal(box.style.position, 'absolute', `${row.name}: position`);
    assert.equal(box.style.width, '1px', `${row.name}: width`);
    assert.equal(box.style.height, '1px', `${row.name}: height`);
    assert.equal(box.style.margin, '-1px', `${row.name}: margin`);
  });
});

test('a chart carries an accessible name on its picture and a caption on its numbers', async () => {
  await eachChart(CHART_ROWS, (row, host) => {
    const svg = host.querySelector('svg') as SVGElement;
    assert.equal(svg.getAttribute('role'), 'img', `${row.name}: the picture's role`);
    assert.equal(svg.getAttribute('aria-label'), row.label, `${row.name}: the picture's accessible name`);
    const caption = host.querySelector('table caption') as HTMLElement;
    assert.equal(caption.textContent?.trim(), row.label, `${row.name}: the numbers' caption`);
  });
});

test('a chart reaches the DOM with its SVG presentation styles as tokens, not as literals', async () => {
  await eachChart(CHART_ROWS.filter((row) => row.tokens), (row, host) => {
    const line = host.querySelector('line') as SVGElement;
    assert.equal(line.style.strokeWidth, 'var(--bw)', `${row.name}: line stroke width`);
    assert.equal(line.getAttribute('style'), 'stroke-width: var(--bw);', `${row.name}: line style attribute`);
    const text = host.querySelector('text') as SVGElement;
    assert.equal(text.getAttribute('style'), 'font-size: var(--dz-text-2xs);', `${row.name}: text style attribute`);
  });
});
