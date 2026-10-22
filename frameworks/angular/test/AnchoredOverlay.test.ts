/* The overlay every anchored panel in this layer stands on, driven through a probe host that
 * renders a trigger and a panel template the way a component does. The pane sits on the body, so
 * every query starts there. What is held here is the stack: Escape reaches the topmost panel alone
 * and stops there, a press inside a panel above is inside, and focus moves only where an option
 * asks it to. Placement is the CDK's, and check:anchoring measures it in a real browser. */
import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, ElementRef, TemplateRef, input, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ArenaAnchoredOverlay, arenaConnectedPositions, arenaFirstFocusable, arenaPhysicalPositions, arenaScopeClasses,
} from '../AnchoredOverlay';
import type { ArenaAnchoredOverlayOptions, ArenaPanelDismissal } from '../AnchoredOverlay';
import { assertNotSameNode, assertSameNode } from './NodeAssert';
import { disposeOverlays } from './Overlays';

@Component({
  selector: 'arena-test-probe',
  standalone: true,
  template: `
    <span #anchor><button type="button" class="probe-trigger">{{ name() }}</button></span>
    <ng-template #panel>
      <div role="dialog" tabindex="-1" [attr.data-panel]="name()">
        @if (bare()) {
          <p>Nothing to press.</p>
        } @else {
          <button type="button">first</button><button type="button">last</button>
        }
        @if (modal()) {
          <div role="alertdialog" aria-modal="true"><button type="button" class="inner">inner</button></div>
        }
      </div>
    </ng-template>
  `,
})
class Probe {
  readonly name = input('p');
  readonly focus = input(false);
  readonly plain = input(false);
  readonly bare = input(false);
  readonly modal = input(false);
  readonly wide = input(false);
  readonly seen: string[] = [];
  readonly anchorRef = viewChild.required<ElementRef<HTMLElement>>('anchor');
  readonly panelRef = viewChild.required<TemplateRef<unknown>>('panel');
  readonly overlay = new ArenaAnchoredOverlay(((probe: Probe): ArenaAnchoredOverlayOptions => ({
    anchor: () => probe.anchorRef().nativeElement,
    trigger: () => probe.anchorRef().nativeElement.querySelector('button'),
    panel: () => probe.panelRef(),
    positions: () => arenaConnectedPositions('start', 'below', 6),
    onDismiss: (reason: ArenaPanelDismissal) => {
      probe.seen.push(`${probe.name()}:${reason}`);
      probe.overlay.close();
    },
    get matchAnchorWidth() { return probe.wide(); },
    get focusOnOpen() {
      return probe.plain() ? undefined : (panel: HTMLElement) => (probe.focus() ? arenaFirstFocusable(panel) : null);
    },
    get restoreFocus() { return !probe.plain(); },
    tabOut: true,
  }))(this));
}

@Component({
  standalone: true,
  imports: [Probe],
  template: `<arena-test-probe name="lower" [focus]="true" /><arena-test-probe name="upper" [focus]="true" />`,
})
class Pair {}

@Component({
  standalone: true,
  imports: [Probe],
  template: `<arena-test-probe name="solo" [focus]="focus()" [plain]="plain()" [bare]="bare()" [modal]="modal()" [wide]="wide()" />`,
})
class Solo {
  readonly focus = input(true);
  readonly plain = input(false);
  readonly bare = input(false);
  readonly modal = input(false);
  readonly wide = input(false);
}

function renderSolo(flags: Partial<Record<'focus' | 'plain' | 'bare' | 'modal' | 'wide', boolean>> = {}) {
  const fixture = TestBed.createComponent(Solo);
  for (const [name, value] of Object.entries(flags)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  const solo = fixture.debugElement.children[0]!.componentInstance as Probe;
  return { fixture, solo, trigger: fixture.nativeElement.querySelector('.probe-trigger') as HTMLElement };
}

function render() {
  const fixture = TestBed.createComponent(Pair);
  fixture.detectChanges();
  const probes = fixture.debugElement.children.map((child) => child.componentInstance as Probe);
  return { fixture, lower: probes[0] as Probe, upper: probes[1] as Probe };
}

const panelOf = (name: string) => document.body.querySelector<HTMLElement>(`.cdk-overlay-container [data-panel="${name}"]`);

function key(target: EventTarget, name: string, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

function press(target: EventTarget) {
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}

test('Escape reaches the topmost panel alone, and stops before anything under it hears the key', () => {
  const { fixture, lower, upper } = render();
  let heard = 0;
  const below = () => { heard += 1; };
  document.addEventListener('keydown', below);
  try {
    lower.overlay.open();
    upper.overlay.open();
    fixture.detectChanges();
    key(panelOf('upper')!.querySelector('button')!, 'Escape');
    assert.deepEqual([...lower.seen, ...upper.seen], ['upper:escape'], 'Escape closed a panel under the topmost one');
    assert.equal(heard, 0, 'the key went on to a listener under the panel');
    key(document.body, 'Escape');
    assert.deepEqual(lower.seen, ['lower:escape'], 'once the topmost closed, Escape did not reach the one under it');
  } finally {
    document.removeEventListener('keydown', below);
    fixture.destroy();
    disposeOverlays();
  }
});

test('opening moves focus to the first control when asked, and Escape returns it to the trigger', () => {
  const { fixture, lower } = render();
  try {
    lower.overlay.open();
    fixture.detectChanges();
    assertSameNode(document.activeElement, panelOf('lower')!.querySelector('button'), 'opening did not move focus into the pane');
    key(document.activeElement as Element, 'Escape');
    assertSameNode(document.activeElement, fixture.nativeElement.querySelector('.probe-trigger'), 'Escape dropped focus');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('a press outside dismisses, and one on the trigger, inside the pane or inside a pane above does not', () => {
  const { fixture, lower, upper } = render();
  try {
    lower.overlay.open();
    fixture.detectChanges();
    press(fixture.nativeElement.querySelector('.probe-trigger'));
    press(panelOf('lower')!.querySelector('button')!);
    assert.deepEqual(lower.seen, [], 'a press on the trigger or inside the pane dismissed it');
    upper.overlay.open();
    fixture.detectChanges();
    press(panelOf('upper')!.querySelector('button')!);
    assert.deepEqual(lower.seen, [], 'a press inside a pane opened above the lower panel closed it');
    press(panelOf('lower')!.querySelector('button')!);
    assert.deepEqual(upper.seen, ['upper:outside'], 'a press in the lower pane is outside the upper one');
    press(document.body);
    assert.deepEqual(lower.seen, ['lower:outside']);
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('Tab from the last control and Shift+Tab from the first leave the pane for the trigger', () => {
  const { fixture, lower } = render();
  try {
    lower.overlay.open();
    fixture.detectChanges();
    const last = [...panelOf('lower')!.querySelectorAll<HTMLElement>('button')].pop();
    last!.focus();
    assert.equal(key(last!, 'Tab').defaultPrevented, true);
    assert.deepEqual(lower.seen, ['lower:tab']);
    assertSameNode(document.activeElement, fixture.nativeElement.querySelector('.probe-trigger'), 'Tab out did not return to the trigger');
    lower.overlay.open();
    fixture.detectChanges();
    const again = panelOf('lower')!.querySelector<HTMLElement>('button')!;
    again.focus();
    assert.equal(key(again, 'Tab').defaultPrevented, false, 'Tab between two controls is the browser\'s');
    key(again, 'Tab', true);
    assert.deepEqual(lower.seen, ['lower:tab', 'lower:tab']);
    assertSameNode(document.activeElement, fixture.nativeElement.querySelector('.probe-trigger'), 'Shift+Tab out did not return to the trigger');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('a pane taken out of the document never holds Escape from the panel under it, and destroy closes', () => {
  const { fixture, lower, upper } = render();
  try {
    lower.overlay.open();
    upper.overlay.open();
    fixture.detectChanges();
    panelOf('upper')!.closest('.cdk-overlay-pane')!.remove();
    key(document.body, 'Escape');
    assert.deepEqual(upper.seen, [], 'a detached pane answered Escape');
    assert.deepEqual(lower.seen, ['lower:escape'], 'a detached pane above held Escape from the panel under it');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
  assert.equal(upper.overlay.isOpen(), false, 'destroying the host left its overlay open');
});

test('a press outside dismisses without moving focus', () => {
  const { fixture, lower } = render();
  try {
    lower.overlay.open();
    fixture.detectChanges();
    assertSameNode(document.activeElement, panelOf('lower')!.querySelector('button'), 'opening did not focus the pane');
    const trigger = fixture.nativeElement.querySelector('.probe-trigger') as HTMLElement;
    let pulled = 0;
    trigger.addEventListener('focus', () => { pulled += 1; });
    press(document.body);
    assert.deepEqual(lower.seen, ['lower:outside']);
    assert.equal(pulled, 0, 'an outside press moved focus to the trigger');
    assertNotSameNode(document.activeElement, trigger);
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('opening focuses the pane itself when it holds no control', () => {
  const { fixture, solo } = renderSolo({ bare: true });
  try {
    solo.overlay.open();
    fixture.detectChanges();
    assertSameNode(document.activeElement, panelOf('solo'), 'a pane with nothing to press did not take focus');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('focus moves only where an option asks: without focusOnOpen and restoreFocus nothing moves', () => {
  const { fixture, solo, trigger } = renderSolo({ plain: true });
  try {
    trigger.focus();
    solo.overlay.open();
    fixture.detectChanges();
    assertSameNode(document.activeElement, trigger, 'a panel that does not ask for focus took it');
    const inside = panelOf('solo')!.querySelector('button')!;
    inside.focus();
    let pulled = 0;
    trigger.addEventListener('focus', () => { pulled += 1; });
    key(inside, 'Escape');
    assert.deepEqual(solo.seen, ['solo:escape']);
    assert.equal(pulled, 0, 'a panel that does not restore focus moved it to the trigger');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('a pane that was closed leaves the stack for good, even if its node is put back in the document', () => {
  const { fixture, lower, upper } = render();
  try {
    lower.overlay.open();
    upper.overlay.open();
    fixture.detectChanges();
    const pane = panelOf('upper')!.closest('.cdk-overlay-pane')!;
    upper.overlay.close();
    document.body.append(pane);
    key(document.body, 'Escape');
    assert.deepEqual(lower.seen, ['lower:escape'], 'a closed pane still held Escape from the panel under it');
    assert.deepEqual(upper.seen, []);
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('Tab out of a pane with another pane above it is ignored, since only the topmost pane answers', () => {
  const { fixture, lower, upper } = render();
  try {
    lower.overlay.open();
    upper.overlay.open();
    fixture.detectChanges();
    const last = [...panelOf('lower')!.querySelectorAll<HTMLElement>('button')].pop()!;
    last.focus();
    assert.equal(key(last, 'Tab').defaultPrevented, false, 'a pane under another took the Tab');
    assert.deepEqual([...lower.seen, ...upper.seen], [], 'a pane under another dismissed on Tab');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('Escape from inside a modal that sits inside the topmost pane is the modal\'s, not the pane\'s', () => {
  const { fixture, solo } = renderSolo({ modal: true });
  let heard = 0;
  const after = () => { heard += 1; };
  document.addEventListener('keydown', after);
  try {
    solo.overlay.open();
    fixture.detectChanges();
    const event = key(panelOf('solo')!.querySelector('.inner')!, 'Escape');
    assert.deepEqual(solo.seen, [], 'the pane closed under a modal that holds the key');
    assert.equal(event.defaultPrevented, false, 'the pane consumed the modal\'s Escape');
    assert.equal(heard, 1, 'the pane stopped a key that belongs to the modal');
    key(panelOf('solo')!.querySelector('button')!, 'Escape');
    assert.deepEqual(solo.seen, ['solo:escape'], 'a control outside the modal lost its Escape');
  } finally {
    document.removeEventListener('keydown', after);
    fixture.destroy();
    disposeOverlays();
  }
});

test('while open, a pane that matches its anchor follows the anchor\'s width, and the observer goes with the pane', () => {
  const callbacks: Array<() => void> = [];
  const watched: Element[] = [];
  let disconnected = 0;
  const previous = globalThis.ResizeObserver;
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    constructor(callback: () => void) { callbacks.push(callback); }
    observe(element: Element): void { watched.push(element); }
    disconnect(): void { disconnected += 1; }
  };
  const rect = Element.prototype.getBoundingClientRect;
  let width = 240;
  const { fixture, solo } = renderSolo({ wide: true });
  Element.prototype.getBoundingClientRect = function wide(this: Element) {
    const w = this === (solo.anchorRef().nativeElement) ? width : 0;
    return { x: 0, y: 0, left: 0, top: 0, right: w, bottom: 0, width: w, height: 0, toJSON() { return this; } } as DOMRect;
  };
  try {
    solo.overlay.open();
    fixture.detectChanges();
    const pane = panelOf('solo')!.closest<HTMLElement>('.cdk-overlay-pane')!;
    assert.equal(pane.style.minWidth, '240px');
    assert.ok(watched.includes(solo.anchorRef().nativeElement), 'the anchor was never observed');
    width = 320;
    for (const callback of callbacks) callback();
    assert.equal(pane.style.minWidth, '320px', 'the pane kept the width it had at opening');
    solo.overlay.close();
    assert.ok(disconnected >= 1, 'closing left the observer running');
  } finally {
    Element.prototype.getBoundingClientRect = rect;
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = previous;
    fixture.destroy();
    disposeOverlays();
  }
});

const corner = (position: { originX: string; originY: string }) => `${position.originY}:${position.originX}`;

test('an aligned panel tries its preferred side at both alignments before the other side', () => {
  const list = (align: 'start' | 'end', prefer: 'below' | 'above') => arenaConnectedPositions(align, prefer, 6).map(corner);
  assert.deepEqual(list('end', 'below'), ['bottom:end', 'bottom:start', 'top:end', 'top:start']);
  assert.deepEqual(list('start', 'below'), ['bottom:start', 'bottom:end', 'top:start', 'top:end']);
  assert.deepEqual(list('end', 'above'), ['top:end', 'top:start', 'bottom:end', 'bottom:start']);
  assert.deepEqual(list('start', 'above'), ['top:start', 'top:end', 'bottom:start', 'bottom:end']);
});

test('a centred panel keeps its two positions, one per side', () => {
  assert.deepEqual(arenaConnectedPositions('center', 'above', 6).map(corner), ['top:center', 'bottom:center']);
});

test('start and end are the physical left and right, whatever the writing direction', () => {
  const sides = (rtl: boolean) => arenaPhysicalPositions(arenaConnectedPositions('end', 'below', 6), rtl)
    .map((position) => [position.originX, position.overlayX]);
  assert.deepEqual(sides(false), [['end', 'end'], ['start', 'start'], ['end', 'end'], ['start', 'start']]);
  assert.deepEqual(sides(true), [['start', 'start'], ['end', 'end'], ['start', 'start'], ['end', 'end']],
    'in a right-to-left page the CDK reads end as the left edge');
  assert.deepEqual(arenaPhysicalPositions(arenaConnectedPositions('center', 'above', 6), true).map((p) => p.originX), ['center', 'center']);
});

test('arenaScopeClasses names the palette, plugin and density the anchor carries, and nothing when it carries none', () => {
  const anchor = document.createElement('span');
  document.body.append(anchor);
  try {
    assert.deepEqual(arenaScopeClasses(anchor), []);
    anchor.style.setProperty('--arena-palette', ' light ');
    anchor.style.setProperty('--arena-plugin', 'complete');
    assert.deepEqual(arenaScopeClasses(anchor), ['arena-light', 'arena-complete']);
    anchor.style.setProperty('--arena-density', 'compact');
    assert.deepEqual(arenaScopeClasses(anchor), ['arena-light', 'arena-complete', 'arena-compact']);
  } finally { anchor.remove(); }
});

test('refreshes the pane classes on every open', () => {
  const { fixture, solo } = renderSolo({ plain: true });
  const anchor = fixture.nativeElement.querySelector('arena-test-probe span') as HTMLElement;
  const paneOf = () => panelOf('solo')!.closest('.cdk-overlay-pane') as HTMLElement;
  try {
    anchor.style.setProperty('--arena-palette', 'light');
    solo.overlay.open();
    fixture.detectChanges();
    assert.ok(paneOf().classList.contains('arena-light'), 'the pane did not take the anchor palette');
    solo.overlay.close();
    anchor.style.setProperty('--arena-palette', 'dark');
    solo.overlay.open();
    fixture.detectChanges();
    assert.ok(paneOf().classList.contains('arena-dark'), 'the second open did not take the new palette');
    assert.ok(!paneOf().classList.contains('arena-light'), 'the previous palette class stayed on the pane');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});
