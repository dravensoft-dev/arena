/* Every requirement of `menu-button` is about the TRIGGER, which is projected content the
 * primitive does not own -- so `subjects.default` is the resolved trigger and not the host.
 * Resolution is the interesting part: an <arena-button> is display:contents and stops its own
 * click, so the wrapping node is neither focusable nor reachable, and writing the attributes
 * onto it is the defect the delegated entry named. keyboard.Enter, keyboard.Space,
 * keyboard.Escape and focus.onOpen are each earned by a named assertion below. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { disposeOverlays } from '../../../test/Overlays';
import type { ArenaMenuItem } from '../../../Api.generated';
import { ArenaButton } from '../../forms/arena-button/ArenaButton';
import { delayTypeahead } from '../../../Tokens.generated';
import { ArenaMenu } from './ArenaMenu';
import { ArenaPopover } from '../../feedback/arena-popover/ArenaPopover';

const BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-menu/ArenaMenu.behaviour.json');

const ITEMS: ArenaMenuItem[] = [
  { header: 'Build 482' },
  { label: 'Promote', icon: 'ph-bold ph-rocket-launch', shortcut: 'P' },
  { label: 'Download logs', disabled: true },
  { divider: true },
  { label: 'Delete', destructive: true },
];

@Component({
  standalone: true,
  imports: [ArenaMenu],
  template: `<arena-menu [items]="items" (select)="chosen.push($event)"><button trigger type="button">More actions</button></arena-menu>`,
})
class MenuHost {
  readonly items = ITEMS;
  readonly chosen: ArenaMenuItem[] = [];
}

@Component({
  selector: 'arena-menu-compliance-wrapped-trigger-host',
  standalone: true,
  imports: [ArenaButton, ArenaMenu],
  template: `<arena-menu [items]="items"><arena-button trigger>More actions</arena-button></arena-menu>`,
})
class WrappedTriggerHost {
  readonly items = ITEMS;
}

@Component({
  selector: 'arena-menu-compliance-items-host',
  standalone: true,
  imports: [ArenaMenu],
  template: `<arena-menu [items]="items()"><button trigger type="button">More actions</button></arena-menu>`,
})
class ItemsHost {
  readonly items = signal<readonly ArenaMenuItem[]>([]);
}

let restoreClock: (() => void) | null = null;

function captureClock(): Array<() => void> {
  const fires: Array<() => void> = [];
  const savedSet = globalThis.setTimeout;
  const own = new Set<number>();
  (globalThis as { setTimeout: unknown }).setTimeout = ((fn: () => void, ms?: number, ...rest: unknown[]) => {
    if (ms !== delayTypeahead) return savedSet(fn, ms, ...rest);
    fires.push(fn);
    own.add(fires.length);
    return fires.length as unknown as ReturnType<typeof setTimeout>;
  });
  const savedClear = globalThis.clearTimeout;
  (globalThis as { clearTimeout: unknown }).clearTimeout = ((handle: unknown) => {
    if (typeof handle === 'number' && own.has(handle)) return;
    savedClear(handle as ReturnType<typeof setTimeout>);
  });
  restoreClock = () => { globalThis.setTimeout = savedSet; globalThis.clearTimeout = savedClear; };
  return fires;
}

function opened(items: readonly ArenaMenuItem[]) {
  const fixture = TestBed.createComponent(ItemsHost);
  fixture.componentInstance.items.set(items);
  fixture.detectChanges();
  (fixture.nativeElement.querySelector('button') as HTMLElement).click();
  fixture.detectChanges();
  const menu = panel()!;
  const rows = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  const finish = () => { fixture.destroy(); disposeOverlays(); restoreClock?.(); restoreClock = null; };
  return { fixture, menu, rows, finish };
}

const ROWS: ArenaMenuItem[] = [{ label: 'Rename' }, { label: 'Duplicate', disabled: true }, { label: 'Delete' }];

function render() {
  const fixture = TestBed.createComponent(MenuHost);
  fixture.detectChanges();
  const host = fixture.nativeElement.querySelector('arena-menu') as HTMLElement;
  const trigger = host.querySelector('button') as HTMLButtonElement;
  return { fixture, host, trigger };
}

function panel(): HTMLElement | null {
  return document.body.querySelector('.cdk-overlay-container [role="menu"]');
}

function press(el: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

test('arena-menu meets the menu-button pattern it binds', () => {
  const { fixture, host, trigger } = render();
  try {
    assert.equal(trigger.getAttribute('aria-haspopup'), 'menu');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');

    const enter = press(trigger, 'Enter');
    fixture.detectChanges();
    assert.equal(enter.defaultPrevented, true,
      'keyboard.Enter: the trigger must intercept Enter rather than leave it to a synthesized click, ' +
      'or the menu opens twice in a browser and never in a suite');
    assert.ok(panel(), 'keyboard.Enter: Enter did not open the menu');
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');

    const first = panel()!.querySelector('[role="menuitem"]:not([disabled])') as HTMLElement;
    assertSameNode(document.activeElement, first,
      'focus.onOpen: opening did not move focus to the first enabled item');

    const rowsDrawn = [...panel()!.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    assertPattern({
      root: document.body,
      bindingPath: BINDING,
      subjects: {
        default: trigger,
        'roles.item': rowsDrawn,
        'roles.separator': [...panel()!.querySelectorAll<HTMLElement>('[data-arena-part="menu.divider"]')],
      },
      behavioural: {
        'keyboard.Enter': true,
        'keyboard.Space': true,
        'keyboard.Escape': true,
        'focus.onOpen': true,
        'focus.roving': true,
        'keyboard.ArrowDown': true,
        'keyboard.ArrowUp': true,
        'keyboard.Home': true,
        'keyboard.End': true,
        'keyboard.TypeAhead': true,
      },
    });

    const escape = press(document.activeElement as Element, 'Escape');
    fixture.detectChanges();
    assertNoNode(panel(), 'keyboard.Escape: Escape did not close the menu');
    assertSameNode(document.activeElement, trigger, 'keyboard.Escape: closing did not restore focus to the trigger');
    assert.equal(escape.type, 'keydown');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('Space opens it too, and is prevented so the platform does not also synthesize a click', () => {
  const { fixture, trigger } = render();
  try {
    const space = press(trigger, ' ');
    fixture.detectChanges();
    assert.equal(space.defaultPrevented, true, 'keyboard.Space: Space must be intercepted');
    assert.ok(panel(), 'keyboard.Space: Space did not open the menu');

    press(trigger, ' ');
    fixture.detectChanges();
    assertNoNode(panel(), 'keyboard.Space: a second Space must close it again');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('the panel is in the CDK overlay container, not inside the host, so no ancestor can clip it', () => {
  const { fixture, host, trigger } = render();
  try {
    trigger.click();
    fixture.detectChanges();
    const menu = panel();
    assert.ok(menu, 'the menu must render');
    assert.equal(host.contains(menu), false,
      'the panel must not be a descendant of the trigger wrapper -- that is what an overflow:hidden ancestor clips');
    assert.ok(menu!.closest('.cdk-overlay-container'), 'the panel must live in the CDK overlay container');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('a divider and a header are not activatable, a disabled row reports nothing, and an enabled one carries the whole item', () => {
  const { fixture, trigger } = render();
  try {
    trigger.click();
    fixture.detectChanges();
    const menu = panel()!;

    const rows = Array.from(menu.querySelectorAll('[role="menuitem"]'));
    assert.equal(rows.length, 3, 'only the three activatable entries are menuitems -- a divider and a header are neither');
    assert.equal(menu.querySelectorAll('button:disabled').length, 1);

    const disabled = rows.find((r) => r.textContent?.includes('Download logs')) as HTMLButtonElement;
    disabled.click();
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.chosen, [], 'a disabled entry must report nothing');
    assert.ok(panel(), 'and must not close the menu either');

    const promote = rows.find((r) => r.textContent?.includes('Promote')) as HTMLButtonElement;
    promote.click();
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.chosen, [ITEMS[1]],
      'select carries the whole item, not a key into the list');
    assertNoNode(panel(), 'activating an entry must close the menu');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('a pointer press outside closes it and leaves focus where the pointer put it', () => {
  const { fixture, trigger } = render();
  try {
    trigger.click();
    fixture.detectChanges();
    assert.ok(panel());

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    assertNoNode(panel(), 'a press outside the host and outside the pane must close the menu');

    trigger.click();
    fixture.detectChanges();
    panel()!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    assert.ok(panel(), 'a press inside the pane must not close it, even though the pane is not inside the host');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('the trigger is resolved to the focusable control, never to a display:contents wrapper around it', () => {
  const fixture = TestBed.createComponent(WrappedTriggerHost);
  try {
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('arena-menu') as HTMLElement;
    const wrapper = host.querySelector('arena-button') as HTMLElement;
    const control = wrapper.querySelector('button') as HTMLButtonElement;

    assert.equal(wrapper.getAttribute('aria-haspopup'), null,
      'the wrapping node must carry nothing: it is display:contents, so an ARIA attribute on it reaches no one');
    assert.equal(control.getAttribute('aria-haspopup'), 'menu',
      'the attributes belong on the actual focusable element');
    assert.equal(control.getAttribute('aria-expanded'), 'false');

    control.click();
    fixture.detectChanges();
    assert.ok(panel(),
      'a click on the wrapped control must open the menu -- arena-button stops the native click bubbling, ' +
      'so a listener on the host would never hear it');
    assert.equal(control.getAttribute('aria-expanded'), 'true');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('Tab from the last row closes the menu and returns focus to the trigger', () => {
  const { fixture, trigger } = render();
  try {
    trigger.click();
    fixture.detectChanges();
    const rows = [...panel()!.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const last = rows[rows.length - 1]!;
    last.focus();
    assert.equal(press(last, 'Tab').defaultPrevented, true);
    fixture.detectChanges();
    assertNoNode(panel(), 'Tab from the last row left the menu open');
    assertSameNode(document.activeElement, trigger, 'Tab out did not return focus to the trigger');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

@Component({
  standalone: true,
  imports: [ArenaPopover, ArenaMenu],
  template: `
    <arena-popover label="Filters" [open]="open()" (openChange)="open.set($event)">
      <button trigger type="button" class="filters">Filters</button>
      <arena-menu [items]="[{ label: 'Reset' }]"><button trigger type="button" class="more">More</button></arena-menu>
    </arena-popover>
  `,
})
class MenuInPopoverHost {
  readonly open = signal(false);
}

test('a menu inside a popover closes alone on Escape, and a press on its row stays inside the popover', () => {
  const fixture = TestBed.createComponent(MenuInPopoverHost);
  const dialog = () => document.body.querySelector<HTMLElement>('.cdk-overlay-container [role="dialog"]');
  try {
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.filters') as HTMLElement).click();
    fixture.detectChanges();
    const more = dialog()!.querySelector<HTMLElement>('.more')!;
    more.click();
    fixture.detectChanges();
    const row = panel()!.querySelector<HTMLElement>('[role="menuitem"]')!;
    row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    assert.ok(dialog(), 'a press on a row of the nested menu closed the popover');
    press(row, 'Escape');
    fixture.detectChanges();
    assertNoNode(panel(), 'Escape did not close the menu');
    assert.ok(dialog(), 'Escape closed the popover under the menu as well');
    assertSameNode(document.activeElement, more, 'closing the menu did not return focus to its own trigger');
    press(more, 'Escape');
    fixture.detectChanges();
    assertNoNode(dialog(), 'the second Escape did not reach the popover');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('a shortcut hint is a kbd, so a reader meets keyboard input rather than loose text', () => {
  const { fixture, trigger } = render();
  try {
    press(trigger, 'Enter');
    fixture.detectChanges();
    const hint = panel()!.querySelector<HTMLElement>('[data-arena-part="menu.shortcut"]')!;
    assert.equal(hint.tagName, 'KBD', 'the hint is printed as a span, the same fact the palette and arena-kbd print as a kbd');
    assert.equal(hint.textContent, 'P', 'the string is printed as given, never split into keys');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('ArrowDown and ArrowUp move between enabled rows and wrap at the ends', () => {
  const { fixture, rows, finish } = opened(ROWS);
  try {
    const [rename, , remove] = rows as [HTMLElement, HTMLElement, HTMLElement];
    assertSameNode(document.activeElement, rename);
    assert.equal(press(rename, 'ArrowDown').defaultPrevented, true);
    assertSameNode(document.activeElement, remove, 'ArrowDown stopped on a disabled row');
    assert.equal(press(remove, 'ArrowDown').defaultPrevented, true);
    assertSameNode(document.activeElement, rename, 'ArrowDown did not wrap from the last row to the first');
    assert.equal(press(rename, 'ArrowUp').defaultPrevented, true);
    assertSameNode(document.activeElement, remove, 'ArrowUp did not wrap from the first row to the last');
    press(remove, 'ArrowUp');
    assertSameNode(document.activeElement, rename, 'ArrowUp stopped on a disabled row');
    fixture.detectChanges();
  } finally { finish(); }
});

test('Home and End move to the first and the last enabled row', () => {
  const { rows, finish } = opened([{ label: 'Archive', disabled: true }, ...ROWS, { label: 'Zip', disabled: true }]);
  try {
    const enabled = rows.filter((row) => !row.hasAttribute('disabled'));
    assertSameNode(document.activeElement, enabled[0]!);
    assert.equal(press(enabled[0]!, 'End').defaultPrevented, true);
    assertSameNode(document.activeElement, enabled[1]!, 'End did not reach the last enabled row');
    assert.equal(press(enabled[1]!, 'Home').defaultPrevented, true);
    assertSameNode(document.activeElement, enabled[0]!, 'Home did not reach the first enabled row');
  } finally { finish(); }
});

test('a typed character moves to the next row starting with it, and a run of characters matches the string', () => {
  const clock = captureClock();
  const { rows, finish } = opened([{ label: 'Rename' }, { label: 'Remove' }, { label: 'Archive' }]);
  try {
    const [rename, remove, archive] = rows as [HTMLElement, HTMLElement, HTMLElement];
    press(rename, 'r');
    assertSameNode(document.activeElement, remove, 'r did not move to the next row starting with r');
    clock.at(-1)?.();
    press(remove, 'a');
    assertSameNode(document.activeElement, archive);
    clock.at(-1)?.();
    press(archive, 'r');
    press(archive, 'e');
    press(archive, 'm');
    assertSameNode(document.activeElement, remove, 'a run of characters did not match on the accumulated string');
  } finally { finish(); }
});

test('a character no row starts with leaves focus where it is, and one character repeated cycles', () => {
  captureClock();
  const { rows, finish } = opened([{ label: 'Rename' }, { label: 'Remove' }, { label: 'Archive' }]);
  try {
    const [rename, remove] = rows as [HTMLElement, HTMLElement, HTMLElement];
    press(rename, 'r');
    assertSameNode(document.activeElement, remove);
    press(remove, 'r');
    assertSameNode(document.activeElement, rename, 'one character repeated did not cycle through the rows that start with it');
    press(rename, 'r');
    assertSameNode(document.activeElement, remove);
    const unknown = press(remove, 'q');
    assertSameNode(document.activeElement, remove, 'a character no row starts with moved focus');
    assert.equal(unknown.defaultPrevented, false);
  } finally { finish(); }
});

test('every row sits at tabindex -1', () => {
  const { rows, finish } = opened(ROWS);
  try {
    assert.equal(rows.length, 3);
    for (const row of rows) assert.equal(row.getAttribute('tabindex'), '-1');
  } finally { finish(); }
});

test('a header names the group of rows under it, and a divider is a separator', () => {
  const { menu, rows, finish } = opened([{ header: 'File' }, { label: 'Rename' }, { label: 'Delete' }, { divider: true }, { label: 'Archive' }]);
  try {
    const groups = menu.querySelectorAll<HTMLElement>('[role="group"]');
    assert.equal(groups.length, 1);
    const name = document.getElementById(groups[0]!.getAttribute('aria-labelledby')!);
    assert.equal(name?.textContent, 'File');
    assert.deepEqual(rows.map((row) => groups[0]!.contains(row)), [true, true, false]);
    assertNoNode(rows[2]!.closest('[role="group"]'), 'a row after the divider sits in the group');
    assert.equal(menu.querySelectorAll('[role="separator"]').length, 1);
  } finally { finish(); }
});

test('the first enabled row takes focus on open, and a menu of disabled rows answers keys without throwing', () => {
  const first = opened([{ label: 'Archive', disabled: true }, { label: 'Rename' }]);
  try {
    assertSameNode(document.activeElement, first.rows[1]!, 'opening did not skip the disabled first row');
  } finally { first.finish(); }
  const { menu, rows, finish } = opened([{ label: 'Archive', disabled: true }, { label: 'Zip', disabled: true }]);
  try {
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'a']) {
      assert.doesNotThrow(() => press(menu, key), key);
    }
    assert.equal(rows.length, 2);
  } finally { finish(); }
});
