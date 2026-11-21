/* One rule, seven components, three activations each, which is why this sits here rather than
 * beside any one of them. happy-dom does not follow a link, so what is asserted is
 * defaultPrevented: cancelled means Arena took the activation and the handler owns it,
 * uncancelled means the browser keeps it. The three paths are asserted separately because
 * they diverged once: the same command routed twice with the mouse and once with the
 * keyboard. Enter is asserted only where a component handles the key itself: on a real anchor
 * Enter is the platform's own synthesized click, which happy-dom does not synthesize, so that
 * half is a Chromium check that no component checklist file holds. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mount, cleanup, act } from './Harness.tsx';
import { withIcons } from './IconsHarness.tsx';
import { ArenaCard } from '../components/display/arena-card/ArenaCard.tsx';
import { ArenaBreadcrumbs } from '../components/navigation/arena-breadcrumbs/ArenaBreadcrumbs.tsx';
import { ArenaSideNavItem } from '../components/navigation/arena-side-nav-item/ArenaSideNavItem.tsx';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette.tsx';
import { ArenaLink } from '../components/navigation/arena-link/ArenaLink.tsx';
import { ArenaBottomNav } from '../components/navigation/arena-bottom-nav/ArenaBottomNav.tsx';
import { ArenaBottomNavItem } from '../components/navigation/arena-bottom-nav-item/ArenaBottomNavItem.tsx';
import { ArenaTable } from '../components/display/arena-table/ArenaTable.tsx';
import { ArenaTableRow } from '../components/display/arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../components/display/arena-table-cell/ArenaTableCell.tsx';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

afterEach(cleanup);

type Modifier = 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey';

function click(el: Element, init: MouseEventInit = {}): MouseEvent {
  const event = new window.MouseEvent('click', { bubbles: true, cancelable: true, ...init });
  act(() => { el.dispatchEvent(event); });
  return event;
}

const MODIFIERS: Modifier[] = ['ctrlKey', 'metaKey', 'shiftKey', 'altKey'];

function assertConvention(
  name: string, anchor: () => Element, reported: () => number, values?: () => unknown[], expected?: unknown[],
) {
  const before = reported();
  const plain = click(anchor());
  assert.equal(reported(), before + 1, `${name}: a primary click with no modifier must report`);
  assert.equal(plain.defaultPrevented, true,
    `${name}: the anchor must be cancelled, or the router and the browser both navigate`);
  if (values && expected) assert.deepEqual(values(), expected, `${name}: a primary click must report exactly the destination`);

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
  if (values && expected) assert.deepEqual(values(), expected, `${name}: a modified or middle click reports nothing more`);
}

interface AnchorRow {
  name: string;
  source: string;
  render: (report: (value?: unknown) => void) => HTMLElement;
  anchor: (root: HTMLElement) => Element;
  values?: unknown[];
}

const ROWS: AnchorRow[] = [
  {
    name: 'ArenaCard', source: 'ArenaCard',
    render: (report) => mount(<ArenaCard href="/clients/acme" title="Acme Corp" onActivate={() => report()} />),
    anchor: (root) => root.firstElementChild!,
  },
  {
    name: 'ArenaBreadcrumbs', source: 'ArenaBreadcrumbs',
    render: (report) => mount(
      <ArenaBreadcrumbs ariaLabel="Project navigation" onNavigate={() => report()}
        items={[{ label: 'Clients', href: '/clients' }, { label: 'Acme' }]} />,
    ),
    anchor: (root) => root.querySelector('a')!,
  },
  {
    name: 'ArenaSideNavItem', source: 'ArenaSideNavItem',
    render: (report) => mount(
      <ArenaSideNavItem id="prod" label="Production" href="/deploys/prod" onActivate={() => report()} />,
    ),
    anchor: (root) => root.querySelector('a')!,
  },
  {
    name: 'ArenaCommandPalette', source: 'ArenaCommandPalette',
    render: (report) => mount(
      <ArenaCommandPalette open commands={[{ id: 'clients', label: 'Clients', route: '/clients' }]}
        onClose={() => {}} onRun={() => report()} />,
    ),
    anchor: (root) => root.querySelector('a[role="option"]')!,
  },
  {
    name: 'ArenaLink', source: 'ArenaLink',
    render: (report) => mount(<p><ArenaLink href="/notes" onNavigate={() => report()}>x</ArenaLink></p>),
    anchor: (root) => root.querySelector('a')!,
  },
  {
    name: 'ArenaBottomNav', source: 'ArenaBottomNavItem',
    render: (report) => mount(withIcons(
      <ArenaBottomNav ariaLabel="Primary" active="home" onNav={(id) => report(id)}>
        <ArenaBottomNavItem id="home" icon="ph-bold ph-house" label="Home" href="/home" />
        <ArenaBottomNavItem id="more" icon="ph-bold ph-dots-three" label="More" />
      </ArenaBottomNav>,
    )),
    anchor: (root) => root.querySelector('a')!,
    values: ['home'],
  },
  {
    name: 'ArenaTableCell', source: 'ArenaTableCell',
    render: (report) => mount(
      <ArenaTable label="Recent sales" columns={[{ header: 'Sale' }]} responsive={false}>
        <ArenaTableRow interactive onActivate={() => {}}>
          <ArenaTableCell href="/sales/4f2a1c9" onNavigate={() => report()}>4f2a1c9</ArenaTableCell>
        </ArenaTableRow>
      </ArenaTable>,
    ),
    anchor: (root) => root.querySelector('td a')!,
  },
];

test('every anchor that routes reports the primary click and leaves every other one to the browser', () => {
  const callers = readdirSync(ROOT, { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.|\.d\.ts$|node_modules|^dist|AnchorActivation\.ts$/.test(file))
    .filter((file) => readFileSync(join(ROOT, file), 'utf8').includes('isArenaPrimaryActivation('))
    .map((file) => basename(file).replace(/\.tsx?$/, ''))
    .sort();
  assert.ok(callers.length > 0, 'the scan found no component that calls isArenaPrimaryActivation');
  assert.deepEqual(ROWS.map((row) => row.source).sort(), callers,
    'a component calls isArenaPrimaryActivation with no row here, or a row names one that no longer does');
  for (const row of ROWS) {
    const got: unknown[] = [];
    const root = row.render((value) => { got.push(value); });
    assertConvention(row.name, () => row.anchor(root), () => got.length, () => got, row.values);
    cleanup();
  }
});

test('Enter on a routed row runs it exactly once, through the palette and not the anchor', () => {
  let ran = 0;
  const root = mount(
    <ArenaCommandPalette open commands={[{ id: 'clients', label: 'Clients', route: '/clients' }]}
      onClose={() => {}} onRun={() => { ran += 1; }} />,
  );
  const field = root.querySelector('input')!;
  const event = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  act(() => { field.dispatchEvent(event); });
  assert.equal(ran, 1, 'Enter must run the active command, the way a primary click does');
  assert.equal(event.defaultPrevented, true, 'Enter belongs to the palette, not to a form');
});

test('an ArenaSideNavItem WITHOUT href still activates on a modified click', () => {
  let navigated = 0;
  const root = mount(<ArenaSideNavItem id="prod" label="Production" onActivate={() => { navigated += 1; }} />);
  const button = root.querySelector('button')!;
  click(button, { ctrlKey: true });
  assert.equal(navigated, 1,
    'a button has no navigation to leave to the browser, so the convention must not reach it');
});

test('an ArenaCommand WITHOUT route still runs on a modified click', () => {
  let ran = 0;
  const root = mount(
    <ArenaCommandPalette open commands={[{ id: 'new', label: 'New invoice' }]}
      onClose={() => {}} onRun={() => { ran += 1; }} />,
  );
  click(root.querySelector('button[role="option"]')!, { metaKey: true });
  assert.equal(ran, 1, 'a row with no route is a button, and the convention must not reach it');
});
