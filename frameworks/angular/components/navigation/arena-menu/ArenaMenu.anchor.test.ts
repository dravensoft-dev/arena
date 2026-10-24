/* A composer that draws the menu inside a wider control provides the element the panel lines up
 * with, while the trigger stays the menu's own. The overlay watches the element it is connected to
 * for a change of size, so a stubbed observer reads which element that is. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, ElementRef, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaMenu } from './ArenaMenu';
import { ARENA_MENU_ANCHOR } from './MenuAnchor';
import type { ArenaMenuItem } from '../../../Api.generated';
import { assertNotSameNode, assertSameNode } from '../../../test/NodeAssert';
import { disposeOverlays } from '../../../test/Overlays';

const ITEMS: readonly ArenaMenuItem[] = [{ label: 'Rename' }];

@Component({
  selector: 'arena-menu-anchor-composer',
  standalone: true,
  imports: [ArenaMenu],
  viewProviders: [{
    provide: ARENA_MENU_ANCHOR,
    useFactory: () => {
      const host = inject<ElementRef<HTMLElement>>(ElementRef);
      return () => host.nativeElement;
    },
  }],
  template: `<arena-menu [items]="items"><button trigger type="button">More</button></arena-menu>`,
})
class Composer {
  protected readonly items = ITEMS;
}

@Component({
  selector: 'arena-menu-anchor-lone',
  standalone: true,
  imports: [ArenaMenu],
  template: `<arena-menu [items]="items"><button trigger type="button">More</button></arena-menu>`,
})
class Lone {
  protected readonly items = ITEMS;
}

async function connectedTo(host: new () => unknown): Promise<{ watched: Element[]; composer: Element; menu: Element }> {
  const watched: Element[] = [];
  const previous = globalThis.ResizeObserver;
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(element: Element): void { watched.push(element); }
    disconnect(): void {}
  };
  const fixture = TestBed.createComponent(host);
  try {
    fixture.detectChanges();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLElement>('button[trigger]')!.click();
    fixture.detectChanges();
    assert.ok(document.body.querySelector('[role="menu"]'), 'the menu never opened');
    return { watched: watched.filter((element) => !element.classList.contains('cdk-overlay-pane')), composer: root, menu: root.querySelector('arena-menu')! };
  } finally {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = previous;
    fixture.destroy();
    disposeOverlays();
  }
}

test('inside a composer the panel is connected to the element the composer provides', async () => {
  const { watched, composer, menu } = await connectedTo(Composer);
  assert.equal(watched.length, 1, 'the overlay watched some count of elements other than its one anchor');
  assertSameNode(watched[0], composer, 'the panel was connected to some element other than the one the composer provided');
  assertNotSameNode(watched[0], menu, 'the panel stayed connected to the menu host inside a composer');
});

test('with no composer the panel is connected to the menu host', async () => {
  const { watched, menu } = await connectedTo(Lone);
  assert.equal(watched.length, 1, 'the overlay watched some count of elements other than its one anchor');
  assertSameNode(watched[0], menu, 'a lone menu connected its panel to some element other than its host');
});

async function pressedOn(host: new () => unknown, target: (root: HTMLElement) => Element): Promise<boolean> {
  const fixture = TestBed.createComponent(host);
  try {
    fixture.detectChanges();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLElement>('button[trigger]')!.click();
    fixture.detectChanges();
    assert.ok(document.body.querySelector('[role="menu"]'), 'the menu never opened');
    target(root).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    return document.body.querySelector('[role="menu"]') !== null;
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
}

test('inside a composer a press on the provided element outside the trigger closes the menu', async () => {
  const open = await pressedOn(Composer, (root) => root);
  assert.equal(open, false, 'a press on the composer outside the trigger left the menu open');
});

test('with no composer a press on the menu host keeps the menu open', async () => {
  const open = await pressedOn(Lone, (root) => root.querySelector('arena-menu')!);
  assert.equal(open, true, 'a press on a lone menu\'s own host closed it');
});
