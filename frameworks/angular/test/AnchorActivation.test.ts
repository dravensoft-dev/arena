/* One rule, seven components, and the browser half of it that no test environment has. What is
 * asserted is defaultPrevented: cancelled means Arena took the activation and the handler owns
 * it, uncancelled means the browser keeps it. The paths are asserted separately because they
 * diverged once, the same command routing twice with the mouse and once with the keyboard. On a
 * real anchor Enter is the platform's own synthesized click, which no test document
 * synthesizes, so that half is a Chromium check that no component checklist file holds. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Component, signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaCommand, ArenaCrumb } from '../Api.generated';
import { ArenaBottomNav } from '../components/navigation/arena-bottom-nav/ArenaBottomNav';
import { ArenaBottomNavItem } from '../components/navigation/arena-bottom-nav-item/ArenaBottomNavItem';
import { ArenaLink } from '../components/navigation/arena-link/ArenaLink';
import { ArenaTable } from '../components/display/arena-table/ArenaTable';
import { ArenaTableCell } from '../components/display/arena-table-cell/ArenaTableCell';
import { ArenaTableRow } from '../components/display/arena-table-row/ArenaTableRow';
import { ANGULAR_COMPONENTS } from './Compliance';
import { ArenaCard } from '../components/display/arena-card/ArenaCard';
import { ArenaBreadcrumbs } from '../components/navigation/arena-breadcrumbs/ArenaBreadcrumbs';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette';
import { ArenaSideNav } from '../components/navigation/arena-side-nav/ArenaSideNav';
import { ArenaSideNavItem } from '../components/navigation/arena-side-nav-item/ArenaSideNavItem';

const root = document.documentElement;
before(() => { root.style.setProperty('--bp-md', '768px'); });
after(() => { root.style.removeProperty('--bp-md'); });

const MODIFIERS = ['ctrlKey', 'metaKey', 'shiftKey', 'altKey'] as const;

function click(el: Element, init: MouseEventInit = {}): MouseEvent {
  const event = new (el.ownerDocument.defaultView as Window & typeof globalThis).MouseEvent(
    'click', { bubbles: true, cancelable: true, ...init },
  );
  el.dispatchEvent(event);
  return event;
}

function assertConvention(name: string, anchor: () => Element, reported: () => number): void {
  const before = reported();
  const plain = click(anchor());
  assert.equal(reported(), before + 1, `${name}: a primary click with no modifier must report`);
  assert.equal(plain.defaultPrevented, true,
    `${name}: the anchor must be cancelled, or the router and the browser both navigate`);

  for (const modifier of MODIFIERS) {
    const count = reported();
    const event = click(anchor(), { [modifier]: true });
    assert.equal(reported(), count,
      `${name}: ${modifier} is the browser's, and reporting it would route in the current tab`);
    assert.equal(event.defaultPrevented, false,
      `${name}: ${modifier} must reach the browser, or open-in-new-tab silently stops working`);
  }

  const count = reported();
  const middle = click(anchor(), { button: 1 });
  assert.equal(reported(), count, `${name}: a middle click is the browser's`);
  assert.equal(middle.defaultPrevented, false, `${name}: a middle click must reach the browser`);
}

@Component({
  standalone: true,
  imports: [ArenaCard],
  template: '<arena-card href="/clients/acme" title="Acme Corp" (activate)="hits.set(hits() + 1)" />',
})
class CardHost { readonly hits = signal(0); }

@Component({
  standalone: true,
  imports: [ArenaCard],
  template: '<arena-card href="/clients/acme" title="Acme Corp" disabled'
    + ' (activate)="hits.set(hits() + 1)" />',
})
class DisabledCardHost { readonly hits = signal(0); }

@Component({
  standalone: true,
  imports: [ArenaBreadcrumbs],
  template: '<arena-breadcrumbs ariaLabel="Project navigation" [items]="items"'
    + ' (navigate)="hits.set(hits() + 1)" />',
})
class CrumbHost {
  readonly hits = signal(0);
  readonly items: ArenaCrumb[] = [{ label: 'Clients', href: '/clients' }, { label: 'Acme' }];
}

@Component({
  standalone: true,
  imports: [ArenaSideNav, ArenaSideNavItem],
  template: '<arena-side-nav ariaLabel="Primary" (nav)="hits.set(hits() + 1)">'
    + '<arena-side-nav-item id="prod" label="Production" href="/deploys/prod" />'
    + '<arena-side-nav-item id="local" label="Local" />'
    + '</arena-side-nav>',
})
class NavHost { readonly hits = signal(0); }

@Component({
  standalone: true,
  imports: [ArenaCommandPalette],
  template: '<arena-command-palette open [commands]="commands" (run)="hits.set(hits() + 1)" />',
})
class PaletteHost {
  readonly hits = signal(0);
  readonly commands: ArenaCommand[] = [
    { id: 'clients', label: 'Clients', route: '/clients' },
    { id: 'new', label: 'New invoice' },
  ];
}

function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  return {
    host: fixture.nativeElement as Element,
    instance: fixture.componentInstance,
    destroy: () => fixture.destroy(),
  };
}

test('an href ArenaCard reports ONCE, and the native click still reaches the page', () => {
  const { host, instance, destroy } = render(CardHost);
  let heard = 0;
  const count = (): void => { heard += 1; };
  document.addEventListener('click', count);
  try {
    const event = click(host.querySelector('a')!);
    assert.equal(instance.hits(), 1,
      'an (activate) handler on an href card must run once for one press');
    assert.equal(heard, 1, 'the native click must reach the document');
    assert.equal(event.cancelBubble, false);
  } finally { document.removeEventListener('click', count); destroy(); }
});

test('a disabled href ArenaCard reports nothing at all', () => {
  const { host, instance, destroy } = render(DisabledCardHost);
  try {
    const event = click(host.querySelector('a')!);
    assert.equal(instance.hits(), 0, 'a refused activation must not reach the host binding either');
    assert.equal(event.defaultPrevented, true, 'and the anchor must not navigate');
  } finally { destroy(); }
});

test('Enter on a routed row runs it exactly once, through the palette and not the anchor', () => {
  const { host, instance, destroy } = render(PaletteHost);
  try {
    const field = host.querySelector('input')!;
    const view = field.ownerDocument.defaultView as Window & typeof globalThis;
    const event = new view.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    field.dispatchEvent(event);
    assert.equal(instance.hits(), 1, 'Enter must run the active command, the way a primary click does');
    assert.equal(event.defaultPrevented, true, 'Enter belongs to the palette, not to a form');
  } finally { destroy(); }
});

test('an ArenaSideNavItem WITHOUT href still activates on a modified click', () => {
  const { host, instance, destroy } = render(NavHost);
  try {
    click(host.querySelector('button')!, { ctrlKey: true });
    assert.equal(instance.hits(), 1,
      'a button has no navigation to leave to the browser, so the convention must not reach it');
  } finally { destroy(); }
});

test('an ArenaCommand WITHOUT route still runs on a modified click', () => {
  const { host, instance, destroy } = render(PaletteHost);
  try {
    click(host.querySelector('button[role="option"]')!, { metaKey: true });
    assert.equal(instance.hits(), 1,
      'a row with no route is a button, and the convention must not reach it');
  } finally { destroy(); }
});

@Component({
  standalone: true,
  imports: [ArenaLink],
  template: '<arena-link href="/notes" (navigate)="hits.set(hits() + 1)">the release notes</arena-link>',
})
class LinkHost { readonly hits = signal(0); }

@Component({
  standalone: true,
  imports: [ArenaBottomNav, ArenaBottomNavItem],
  template: '<arena-bottom-nav ariaLabel="Primary" active="home" (nav)="hits.set(hits() + 1)">'
    + '<arena-bottom-nav-item id="home" icon="ph-bold ph-house" label="Home" href="/home" />'
    + '</arena-bottom-nav>',
})
class BottomNavHost { readonly hits = signal(0); }

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Recent sales" [columns]="columns" [responsive]="false">
      <tr arena-table-row [interactive]="true">
        <td arena-table-cell href="/sales/4f2a1c9" (navigate)="hits.set(hits() + 1)">4f2a1c9</td>
      </tr>
    </arena-table>
  `,
})
class CellHost {
  readonly hits = signal(0);
  readonly columns = [{ header: 'Sale' }];
}

interface ConventionRow {
  component: string;
  host: Type<{ hits: () => number }>;
  anchor: string;
}

const CONVENTION_ROWS: ConventionRow[] = [
  { component: 'ArenaCard', host: CardHost, anchor: 'a' },
  { component: 'ArenaBreadcrumbs', host: CrumbHost, anchor: 'a' },
  { component: 'ArenaSideNavItem', host: NavHost, anchor: 'a' },
  { component: 'ArenaCommandPalette', host: PaletteHost, anchor: 'a[role="option"]' },
  { component: 'ArenaLink', host: LinkHost, anchor: 'a' },
  { component: 'ArenaBottomNavItem', host: BottomNavHost, anchor: 'a' },
  { component: 'ArenaTableCell', host: CellHost, anchor: 'td[arena-table-cell] a' },
];

function consumersOfTheConvention(): string[] {
  const skipped = new Set(['build', 'dist', 'node_modules']);
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skipped.has(entry.name)) walk(join(dir, entry.name));
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.test.ts')
        && entry.name !== 'AnchorActivation.ts' && readFileSync(join(dir, entry.name), 'utf8').includes('isArenaPrimaryActivation')) {
        found.push(basename(entry.name, '.ts'));
      }
    }
  };
  walk(join(ANGULAR_COMPONENTS, '..'));
  return found.sort();
}

test('every component that reads isArenaPrimaryActivation reports the primary click and leaves every other one to the browser', () => {
  const consumers = consumersOfTheConvention();
  assert.ok(consumers.length > 0, 'no consumer of isArenaPrimaryActivation found -- the scan would check nothing');
  const rows = CONVENTION_ROWS.map((row) => row.component).sort();
  assert.deepEqual(consumers.filter((name) => !rows.includes(name)), [], 'a consumer of the convention has no row here');
  assert.deepEqual(rows.filter((name) => !consumers.includes(name)), [], 'a row names a component that no longer reads the convention -- stale');
  for (const row of CONVENTION_ROWS) {
    const { host, instance, destroy } = render(row.host);
    try {
      assertConvention(row.component, () => host.querySelector(row.anchor)!, () => instance.hits());
    } finally { destroy(); }
  }
});
