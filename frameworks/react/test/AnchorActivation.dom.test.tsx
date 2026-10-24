/* One rule, four components, three activations each, which is why this sits here rather than
 * beside any one of them. happy-dom does not follow a link, so what is asserted is
 * defaultPrevented: cancelled means Arena took the activation and the handler owns it,
 * uncancelled means the browser keeps it. The three paths are asserted separately because
 * they diverged once: the same command routed twice with the mouse and once with the
 * keyboard. Enter is asserted only where a component handles the key itself: on a real anchor
 * Enter is the platform's own synthesized click, which happy-dom does not synthesize, so that
 * half is the by-hand Chromium check each prompt carries. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from './Harness.tsx';
import { ArenaCard } from '../components/display/arena-card/ArenaCard.tsx';
import { ArenaBreadcrumbs } from '../components/navigation/arena-breadcrumbs/ArenaBreadcrumbs.tsx';
import { ArenaSideNavItem } from '../components/navigation/arena-side-nav-item/ArenaSideNavItem.tsx';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette.tsx';

afterEach(cleanup);

type Modifier = 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey';

function click(el: Element, init: MouseEventInit = {}): MouseEvent {
  const event = new window.MouseEvent('click', { bubbles: true, cancelable: true, ...init });
  act(() => { el.dispatchEvent(event); });
  return event;
}

const MODIFIERS: Modifier[] = ['ctrlKey', 'metaKey', 'shiftKey', 'altKey'];

function assertConvention(name: string, anchor: () => Element, reported: () => number) {
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

test('ArenaCard.href reports the primary click and leaves every other one to the browser', () => {
  let clicked = 0;
  const root = mount(<ArenaCard href="/clients/acme" title="Acme Corp" onActivate={() => { clicked += 1; }} />);
  assertConvention('ArenaCard', () => root.firstElementChild!, () => clicked);
});

test('an ArenaCrumb reports the primary click and leaves every other one to the browser', () => {
  let navigated = 0;
  const root = mount(
    <ArenaBreadcrumbs ariaLabel="Project navigation" onNavigate={() => { navigated += 1; }}
      items={[{ label: 'Clients', href: '/clients' }, { label: 'Acme' }]} />,
  );
  assertConvention('ArenaBreadcrumbs', () => root.querySelector('a')!, () => navigated);
});

test('ArenaSideNavItem with href reports the primary click and leaves every other one alone', () => {
  let navigated = 0;
  const root = mount(
    <ArenaSideNavItem id="prod" label="Production" href="/deploys/prod"
      onActivate={() => { navigated += 1; }} />,
  );
  assertConvention('ArenaSideNavItem', () => root.querySelector('a')!, () => navigated);
});

test('an ArenaCommand with route reports the primary click and leaves every other one alone', () => {
  let ran = 0;
  const root = mount(
    <ArenaCommandPalette open commands={[{ id: 'clients', label: 'Clients', route: '/clients' }]}
      onClose={() => {}} onRun={() => { ran += 1; }} />,
  );
  assertConvention('ArenaCommandPalette', () => root.querySelector('a[role="option"]')!, () => ran);
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
