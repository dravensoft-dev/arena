/* `DropsProps` below is the load-bearing fixture: it stands for a consumer's own component
 * that drops the props, so `onClick` arrives and aria-haspopup does not.
 * Every other assertion here uses a raw <button> -- the one shape a
 * cloneElement injection reaches. It fails without the DOM guarantee. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { withIcons, domSymbols } from '../../../test/IconsHarness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { isFocusable } from '../../../../../scripts/lib/core/behaviour-compliance.ts';
import { ArenaMenu } from './ArenaMenu.tsx';
import type { ArenaMenuItem } from '../../../Api.generated';
import { ArenaPopover } from '../../feedback/arena-popover/ArenaPopover.tsx';

let restoreClock: (() => void) | null = null;
afterEach(() => { cleanup(); restoreClock?.(); restoreClock = null; });

function captureClock(): Array<() => void> {
  const fires: Array<() => void> = [];
  const savedSet = globalThis.setTimeout;
  const savedClear = globalThis.clearTimeout;
  (globalThis as { setTimeout: unknown }).setTimeout = ((fn: () => void) => fires.push(fn) as unknown as ReturnType<typeof setTimeout>);
  (globalThis as { clearTimeout: unknown }).clearTimeout = (() => {});
  restoreClock = () => { globalThis.setTimeout = savedSet; globalThis.clearTimeout = savedClear; };
  return fires;
}

function open(root: ParentNode): HTMLElement {
  act(() => { root.querySelector<HTMLElement>('button')!.click(); });
  return root.querySelector<HTMLElement>('[role="menu"]')!;
}

test('activating an entry reports the whole item, not a key and not a DOM event', () => {
  const items = [{ label: 'Rename' }, { label: 'Archive' }];
  const seen: unknown[] = [];
  const root = mount(<ArenaMenu trigger={<button type="button">Open</button>} items={items} onSelect={(i) => seen.push(i)} />);
  const panel = open(root);
  const rows = panel.querySelectorAll('[role="menuitem"]');
  assert.equal(rows.length, 2);
  act(() => { (rows[1] as HTMLElement).click(); });
  assert.equal(seen.length, 1, 'select did not fire');
  assert.equal(seen[0], items[1], 'select did not carry the item the caller passed in');
  assert.equal((seen[0] as { preventDefault?: unknown }).preventDefault, undefined, 'a DOM event is travelling in the payload');
});

test('activating an entry closes the menu', () => {
  const root = mount(<ArenaMenu trigger={<button type="button">Open</button>} items={[{ label: 'Rename' }]} />);
  const panel = open(root);
  act(() => { panel.querySelector<HTMLElement>('[role="menuitem"]')!.click(); });
  assert.equal(root.querySelector<HTMLElement>('[role="menu"]')!, null, 'the menu stayed open after an entry was activated');
});

test('a disabled entry reports nothing', () => {
  const seen: unknown[] = [];
  const root = mount(
    <ArenaMenu trigger={<button type="button">Open</button>}
      items={[{ label: 'Delete', disabled: true }]} onSelect={(i) => seen.push(i)} />,
  );
  const row = open(root).querySelector('[role="menuitem"]');
  act(() => { (row as HTMLElement).click(); });
  assert.equal(seen.length, 0, 'a disabled entry reported select');
});

test('icon is a class name Arena draws, and never reaches the page as text', () => {
  const root = mount(withIcons(
    <ArenaMenu trigger={<button type="button">Open</button>} items={[{ label: 'View logs', icon: 'ph-bold ph-scroll' }]} />,
  ));
  const panel = open(root);
  const glyph = panel.querySelector('svg');
  assert.notEqual(glyph, null, 'no svg was drawn for the entry icon');
  assert.deepEqual(domSymbols(panel), ['bold-scroll'],
    'the Phosphor class the consumer named is drawn as its sprite symbol rather than re-derived');
  assert.ok(glyph!.parentElement!.getAttribute('class')!.split(/\s+/).includes('arena-menu__icon'), 'inside the manifest\'s icon slot, which sizes it');
  assert.equal(glyph!.getAttribute('aria-hidden'), 'true');
  assert.equal(panel.textContent, 'View logs', 'the icon class name was drawn as text');
});

test('a consumer style object reaches no part of the opened panel', () => {
  const root = mount(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaMenu trigger={<button type="button">Open</button>} items={[{ label: 'Rename' }]} style={{ color: '#ff00ff' }} />,
  );
  assert.doesNotMatch(open(root).outerHTML, /#ff00ff/,
    'a consumer style reached the panel -- the R4 escape is back');
});

test('a consumer attribute reaches no part of the opened panel', () => {
  const root = mount(
    <ArenaMenu trigger={<button type="button">Open</button>} items={[{ label: 'Rename' }]} data-stray="x" />,
  );
  assert.doesNotMatch(open(root).outerHTML, /data-stray/,
    'a consumer attribute reached the panel -- a {...rest} escape is back');
});

test('a divider and a header draw no activatable row', () => {
  const root = mount(
    <ArenaMenu trigger={<button type="button">Open</button>}
      items={[{ header: 'Deployment' }, { label: 'View logs' }, { divider: true }]} />,
  );
  const panel = open(root);
  assert.equal(panel.querySelectorAll('[role="menuitem"]').length, 1,
    'a divider or a header rendered as an activatable entry');
  assert.match(panel.textContent, /Deployment/, 'the header did not render');
});

const BINDING = join(REACT_COMPONENTS, 'navigation/arena-menu/ArenaMenu.behaviour.json');

function press(el: Element, key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(event); });
  return event;
}

test('the popup state sits on the focusable trigger, not on a wrapper around it', () => {
  const root = mount(<ArenaMenu trigger={<button type="button">Open</button>} items={[{ label: 'Rename' }]} />);
  const trigger = root.querySelector<HTMLElement>('button');

  assert.equal(trigger!.getAttribute('aria-haspopup'), 'menu',
    'ARIA is not inherited from an ancestor, so a wrapper carrying this names nothing');
  assert.equal(trigger!.getAttribute('aria-expanded'), 'false');
  assert.equal(isFocusable(trigger!), true, 'the carrier must be the element that takes focus');
  assert.equal(root.querySelectorAll<HTMLElement>('[aria-haspopup]').length, 1,
    'exactly one element may claim the popup');
});

test('ArenaMenu meets the menu-button pattern it binds', () => {
  const root = mount(<ArenaMenu trigger={<button type="button">Open</button>}
    items={[{ header: 'File' }, { label: 'Rename' }, { label: 'Delete', destructive: true }, { divider: true }, { label: 'Archive' }]} />);
  const trigger = root.querySelector<HTMLElement>('button');

  for (const key of ['Enter', ' ']) {
    const event = press(trigger!, key);
    assert.equal(event.defaultPrevented, false,
      `a handler of ours cancelled ${key === ' ' ? 'Space' : key}, suppressing the button's own activation`);
  }
  assert.equal(trigger!.tagName, 'BUTTON',
    'Enter and Space reach onClick through the platform, which needs a real button to do it');

  act(() => { trigger!.click(); });
  const panel = root.querySelector<HTMLElement>('[role="menu"]');
  assert.ok(panel, 'activating the trigger did not open the menu');
  assert.equal(trigger!.getAttribute('aria-expanded'), 'true', 'the open state did not reach the trigger');
  const first = panel.querySelector<HTMLElement>('[role="menuitem"]');
  assert.equal(document.activeElement, first,
    'opening left focus on the trigger, so a keyboard user reaches the panel only by Tab');

  assertPattern({
    root,
    bindingPath: BINDING,
    subjects: {
      default: trigger,
      'roles.item': [...panel.querySelectorAll<HTMLElement>('[role="menuitem"]')],
      'roles.separator': [...panel.querySelectorAll<HTMLElement>('[data-arena-part="menu.divider"]')],
    },
    behavioural: {
      'focus.onOpen': true, 'keyboard.Enter': true, 'keyboard.Space': true, 'keyboard.Escape': true,
      'focus.roving': true, 'keyboard.ArrowDown': true, 'keyboard.ArrowUp': true,
      'keyboard.Home': true, 'keyboard.End': true, 'keyboard.TypeAhead': true,
    },
  });

  press(first!, 'Escape');
  assert.equal(root.querySelector<HTMLElement>('[role="menu"]')!, null, 'Escape did not close the menu');
  assert.equal(document.activeElement, trigger,
    'Escape closed the menu and dropped focus, which strands a keyboard user at the top of the page');
});

const ROWS = [{ label: 'Rename' }, { label: 'Duplicate', disabled: true }, { label: 'Delete' }];

function opened(items: readonly ArenaMenuItem[]) {
  const root = mount(<ArenaMenu trigger={<button type="button">Open</button>} items={items} />);
  const panel = open(root);
  const rows = [...panel.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  return { root, panel, rows };
}

test('ArrowDown and ArrowUp move between enabled rows and wrap at the ends', () => {
  const { rows } = opened(ROWS);
  const [rename, , remove] = rows as [HTMLElement, HTMLElement, HTMLElement];
  assert.equal(document.activeElement, rename);
  assert.equal(press(rename, 'ArrowDown').defaultPrevented, true);
  assert.equal(document.activeElement, remove, 'ArrowDown stopped on a disabled row');
  assert.equal(press(remove, 'ArrowDown').defaultPrevented, true);
  assert.equal(document.activeElement, rename, 'ArrowDown did not wrap from the last row to the first');
  assert.equal(press(rename, 'ArrowUp').defaultPrevented, true);
  assert.equal(document.activeElement, remove, 'ArrowUp did not wrap from the first row to the last');
  press(remove, 'ArrowUp');
  assert.equal(document.activeElement, rename, 'ArrowUp stopped on a disabled row');
});

test('Home and End move to the first and the last enabled row', () => {
  const { rows } = opened([{ label: 'Archive', disabled: true }, ...ROWS, { label: 'Zip', disabled: true }]);
  const enabled = rows.filter((row) => !row.hasAttribute('disabled'));
  assert.equal(document.activeElement, enabled[0]);
  assert.equal(press(enabled[0]!, 'End').defaultPrevented, true);
  assert.equal(document.activeElement, enabled[1], 'End did not reach the last enabled row');
  assert.equal(press(enabled[1]!, 'Home').defaultPrevented, true);
  assert.equal(document.activeElement, enabled[0], 'Home did not reach the first enabled row');
});

test('a typed character moves to the next row starting with it, and a run of characters matches the string', () => {
  const clock = captureClock();
  const { rows } = opened([{ label: 'Rename' }, { label: 'Remove' }, { label: 'Archive' }]);
  const [rename, remove, archive] = rows as [HTMLElement, HTMLElement, HTMLElement];
  press(rename, 'r');
  assert.equal(document.activeElement, remove, 'r did not move to the next row starting with r');
  clock.at(-1)?.();
  press(remove, 'a');
  assert.equal(document.activeElement, archive);
  clock.at(-1)?.();
  press(archive, 'r');
  press(archive, 'e');
  press(archive, 'm');
  assert.equal(document.activeElement, remove, 'a run of characters did not match on the accumulated string');
});

test('a character no row starts with leaves focus where it is, and one character repeated cycles', () => {
  const { rows } = opened([{ label: 'Rename' }, { label: 'Remove' }, { label: 'Archive' }]);
  const [rename, remove, archive] = rows as [HTMLElement, HTMLElement, HTMLElement];
  press(rename, 'r');
  assert.equal(document.activeElement, remove);
  press(remove, 'r');
  assert.equal(document.activeElement, rename, 'one character repeated did not cycle through the rows that start with it');
  press(rename, 'r');
  assert.equal(document.activeElement, remove);
  const unknown = press(remove, 'q');
  assert.equal(document.activeElement, remove, 'a character no row starts with moved focus');
  assert.equal(unknown.defaultPrevented, false);
  assert.notEqual(document.activeElement, archive);
});

test('every row sits at tabindex -1', () => {
  const { rows } = opened(ROWS);
  assert.equal(rows.length, 3);
  for (const row of rows) assert.equal(row.getAttribute('tabindex'), '-1');
});

test('a header names the group of rows under it, and a divider is a separator', () => {
  const { panel, rows } = opened([{ header: 'File' }, { label: 'Rename' }, { label: 'Delete' }, { divider: true }, { label: 'Archive' }]);
  const groups = panel.querySelectorAll<HTMLElement>('[role="group"]');
  assert.equal(groups.length, 1);
  const name = document.getElementById(groups[0]!.getAttribute('aria-labelledby')!);
  assert.equal(name?.textContent, 'File');
  assert.deepEqual(rows.map((row) => groups[0]!.contains(row)), [true, true, false]);
  assert.equal(rows[2]!.closest('[role="group"]'), null);
  assert.equal(panel.querySelectorAll('[role="separator"]').length, 1);
});

test('the first enabled row takes focus on open, and a menu of disabled rows answers keys without throwing', () => {
  const first = opened([{ label: 'Archive', disabled: true }, { label: 'Rename' }]);
  assert.equal(document.activeElement, first.rows[1], 'opening did not skip the disabled first row');
  cleanup();
  const { root, panel, rows } = opened([{ label: 'Archive', disabled: true }, { label: 'Zip', disabled: true }]);
  const trigger = root.querySelector<HTMLElement>('button')!;
  for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'a']) {
    assert.doesNotThrow(() => press(panel, key), key);
  }
  assert.equal(rows.length, 2);
  assert.notEqual(document.activeElement, rows[0]);
  assert.ok(trigger);
});

function DropsProps({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) {
  return <button type="button" onClick={onClick}>{children}</button>;
}

test('the popup state reaches a trigger that drops every prop it is handed', () => {
  const root = mount(<ArenaMenu trigger={<DropsProps>Open</DropsProps>} items={[{ label: 'Rename' }]} />);
  const trigger = root.querySelector<HTMLElement>('button');

  assert.equal(trigger!.getAttribute('aria-haspopup'), 'menu',
    'a prop-dropping trigger left the popup state nowhere, which is what the demo page does');
  assert.equal(trigger!.getAttribute('aria-expanded'), 'false');

  act(() => { trigger!.click(); });
  assert.equal(trigger!.getAttribute('aria-expanded'), 'true', 'the open state did not follow');
  press(root!.querySelector<HTMLElement>('[role="menuitem"]')!, 'Escape');
  assert.equal(trigger!.getAttribute('aria-expanded'), 'false', 'the closed state did not follow');
});

test('a row takes one of three branches of the item recipe, and hover is a modifier on two of them', () => {
  const root = mount(
    <ArenaMenu trigger={<button type="button">Open</button>}
      items={[{ label: 'Rename' }, { label: 'Delete', destructive: true }, { label: 'Archive', disabled: true }]} />,
  );
  const rows = [...open(root).querySelectorAll('[role="menuitem"]')];
  assert.equal(rows.length, 3);
  const [ordinary, destructive, inert] = rows as [Element, Element, Element];

  assert.equal(ordinary.hasAttribute('data-arena-disabled') || ordinary.hasAttribute('data-arena-destructive'), false, 'an ordinary row lifts to the accent tint');
  assert.equal(destructive.hasAttribute('data-arena-destructive'), true);
  assert.equal(destructive.hasAttribute('data-arena-disabled'), false, 'a destructive row lifts to its own tint, never the accent');
  assert.equal(inert.hasAttribute('data-arena-disabled'), true);
  assert.equal(inert.hasAttribute('data-arena-destructive'), false, 'disabled wins over the other two');
});

const SHEET = new URL('../../../../tailwind/consume/components/navigation/arena-menu/ArenaMenu.styles.generated.css', import.meta.url);

test('the sheet positions the panel at neither edge, because the layer places it', () => {
  const css = readFileSync(SHEET, 'utf8');
  assert.doesNotMatch(css, /data-arena-anchored|data-arena-align/, 'the sheet still carries a rule that positions the panel in flow');
  assert.doesNotMatch(css, /\.arena-menu__panel[^{]*\{[^}]*(?:^|[\s;])(?:position|left|right|top|bottom|inset|margin-top|transform|translate):/m,
    'a panel rule positions the panel, which the layer does by script');
});

test('the open panel is a manual popover, shown and placed by script', () => {
  const root = mount(<ArenaMenu trigger={<button type="button">Open</button>} items={[{ label: 'Rename' }]} />);
  const panel = open(root);
  assert.equal(panel.getAttribute('popover'), 'manual');
  assert.equal(panel.style.position, 'fixed', 'the panel was left in flow, where an overflow: hidden ancestor clips it');
});

test('Tab from the last row closes the menu and returns focus to the trigger', () => {
  const root = mount(<ArenaMenu trigger={<button type="button">Open</button>} items={[{ label: 'Rename' }, { label: 'Archive' }]} />);
  const rows = [...open(root).querySelectorAll<HTMLElement>('[role="menuitem"]')];
  rows[1]!.focus();
  assert.equal(press(rows[1]!, 'Tab').defaultPrevented, true);
  assert.equal(root.querySelector('[role="menu"]'), null);
  assert.equal(document.activeElement, root.querySelector('button'));
});

test('a menu inside a popover closes alone on Escape, and the popover stays', () => {
  function Host() {
    const [shown, setShown] = useState(false);
    return (
      <ArenaPopover label="Filters" open={shown} onOpenChange={setShown} trigger={<button type="button">Filters</button>}>
        <ArenaMenu trigger={<button type="button">More</button>} items={[{ label: 'Reset' }]} />
      </ArenaPopover>
    );
  }
  const root = mount(<Host />);
  act(() => { root.querySelector<HTMLElement>('button')!.click(); });
  const dialog = () => document.querySelector('[role="dialog"]');
  const more = dialog()!.querySelector<HTMLElement>('button')!;
  act(() => { more.click(); });
  press(document.querySelector<HTMLElement>('[role="menuitem"]')!, 'Escape');
  assert.equal(document.querySelector('[role="menu"]'), null, 'Escape did not close the menu');
  assert.ok(dialog(), 'Escape closed the popover under the menu as well');
  assert.equal(document.activeElement, more, 'closing the menu did not return focus to its own trigger');
  press(more, 'Escape');
  assert.equal(dialog(), null, 'the second Escape did not reach the popover');
});

test('a press inside a menu opened from a popover is inside the popover too', () => {
  function Host() {
    const [shown, setShown] = useState(false);
    return (
      <ArenaPopover label="Filters" open={shown} onOpenChange={setShown} trigger={<button type="button">Filters</button>}>
        <ArenaMenu trigger={<button type="button">More</button>} items={[{ label: 'Reset' }]} />
      </ArenaPopover>
    );
  }
  const root = mount(<Host />);
  act(() => { root.querySelector<HTMLElement>('button')!.click(); });
  act(() => { document.querySelector('[role="dialog"]')!.querySelector<HTMLElement>('button')!.click(); });
  act(() => { document.querySelector('[role="menuitem"]')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  assert.ok(document.querySelector('[role="dialog"]'), 'a press on a row of the nested menu closed the popover');
  assert.ok(document.querySelector('[role="menu"]'), 'a press on a row of the nested menu closed the menu');
});

test('a shortcut hint is a kbd, so a reader meets keyboard input rather than loose text', () => {
  const root = mount(<ArenaMenu trigger={<button type="button">Open</button>} items={[{ label: 'Duplicate', shortcut: '⌘D' }]} />);
  const panel = open(root);
  const hint = panel.querySelector<HTMLElement>('[data-arena-part="menu.shortcut"]')!;
  assert.equal(hint.tagName, 'KBD', 'the hint is printed as a span, the same fact the palette and ArenaKbd print as a kbd');
  assert.equal(hint.textContent, '⌘D', 'the string is printed as given, never split into keys');
});
