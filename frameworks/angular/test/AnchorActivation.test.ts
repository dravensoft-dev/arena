/* One rule, four components, and the browser half of it that no test environment has. What is
 * asserted is defaultPrevented: cancelled means Arena took the activation and the handler owns
 * it, uncancelled means the browser keeps it. The paths are asserted separately because they
 * diverged once, the same command routing twice with the mouse and once with the keyboard. On a
 * real anchor Enter is the platform's own synthesized click, which no test document
 * synthesizes, so that half is the by-hand Chromium check each prompt carries. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaCommand, ArenaCrumb } from '../Api.generated';
import { ArenaCard } from '../components/display/arena-card/ArenaCard';
import { ArenaBreadcrumbs } from '../components/navigation/arena-breadcrumbs/ArenaBreadcrumbs';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette';
import { ArenaSideNav } from '../components/navigation/arena-side-nav/ArenaSideNav';
import { ArenaSideNavItem } from '../components/navigation/arena-side-nav-item/ArenaSideNavItem';

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

test('ArenaCard.href reports the primary click and leaves every other one to the browser', () => {
  const { host, instance, destroy } = render(CardHost);
  try {
    assertConvention('ArenaCard', () => host.querySelector('a')!, () => instance.hits());
  } finally { destroy(); }
});

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

test('an ArenaCrumb reports the primary click and leaves every other one to the browser', () => {
  const { host, instance, destroy } = render(CrumbHost);
  try {
    assertConvention('ArenaBreadcrumbs', () => host.querySelector('a')!, () => instance.hits());
  } finally { destroy(); }
});

test('ArenaSideNavItem with href reports the primary click and leaves every other one alone', () => {
  const { host, instance, destroy } = render(NavHost);
  try {
    assertConvention('ArenaSideNavItem', () => host.querySelector('a')!, () => instance.hits());
  } finally { destroy(); }
});

test('an ArenaCommand with route reports the primary click and leaves every other one alone', () => {
  const { host, instance, destroy } = render(PaletteHost);
  try {
    assertConvention('ArenaCommandPalette', () => host.querySelector('a[role="option"]')!,
      () => instance.hits());
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
