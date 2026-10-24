/* menu-button binds flat on the caret, the subject passed because the host is display: contents.
 * The group's role and name are Arena's own design, asserted here directly. click is an output
 * named after a DOM event, so a consumer's (click) hears the output and the native event alike:
 * `clicks` counts what the consumer hears and `emitted` the output, and a caret press reaching the
 * consumer as a primary activation is the defect the caret's own stopped click prevents. */

import { useTestEnvironment, glyphIds, symbol } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { ArenaButtonType, ArenaMenuItem } from '../../../Api.generated';
import { ArenaSplitButton } from './ArenaSplitButton';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { disposeOverlays } from '../../../test/Overlays';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-split-button/ArenaSplitButton.behaviour.json');
const ITEMS: ArenaMenuItem[] = [{ label: 'Deploy to staging' }, { divider: true }, { label: 'Roll back', destructive: true }];

@Component({
  selector: 'split-button-compliance-host',
  standalone: true,
  imports: [ArenaSplitButton],
  template: `
    <arena-split-button label="Deployment" menuLabel="More deploy options" [items]="items" [icon]="icon()" [type]="type()"
                        [loading]="loading()" [disabled]="disabled()" [destructive]="destructive()" (click)="clicks = clicks + 1">Deploy</arena-split-button>
  `,
})
class Host {
  readonly items = ITEMS;
  readonly icon = signal<string | undefined>(undefined);
  readonly type = signal<ArenaButtonType | undefined>(undefined);
  readonly loading = signal(false);
  readonly disabled = signal(false);
  readonly destructive = signal(false);
  clicks = 0;
}

type Patch = { icon?: string; type?: ArenaButtonType; loading?: boolean; disabled?: boolean; destructive?: boolean };

function render(patch: Patch = {}) {
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  if (patch.icon !== undefined) host.icon.set(patch.icon);
  if (patch.type !== undefined) host.type.set(patch.type);
  if (patch.loading !== undefined) host.loading.set(patch.loading);
  if (patch.disabled !== undefined) host.disabled.set(patch.disabled);
  if (patch.destructive !== undefined) host.destructive.set(patch.destructive);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const primary = root.querySelector<HTMLButtonElement>('[data-arena-part="split-button.primary"]')!;
  const caret = root.querySelector<HTMLButtonElement>('[data-arena-part="split-button.caret"]')!;
  const emitted = { count: 0 };
  const instance = fixture.debugElement.query(By.directive(ArenaSplitButton)).componentInstance as ArenaSplitButton;
  instance.click.subscribe(() => { emitted.count += 1; });
  return { fixture, root, primary, caret, emitted, host };
}

function panel(): HTMLElement | null {
  return document.body.querySelector('.cdk-overlay-container [role="menu"]');
}

function press(el: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

test('the root is a group the label names, holding both halves, and the host stays bare', () => {
  const { fixture, root, primary, caret } = render();
  try {
    const element = root.querySelector('arena-split-button') as HTMLElement;
    assert.equal(element.getAttribute('class'), null);
    const group = root.querySelector<HTMLElement>('[role="group"]')!;
    assert.equal(group.getAttribute('aria-label'), 'Deployment');
    assert.equal(group.getAttribute('data-arena-part'), 'split-button');
    assert.ok(group.contains(primary) && group.contains(caret), 'a half sits outside the named group');
  } finally { fixture.destroy(); }
});

test('two buttons, the primary half and then the caret half, which the menu label names', () => {
  const { fixture, root, primary, caret } = render();
  try {
    const parts = [...root.querySelectorAll('button')].map((one) => one.getAttribute('data-arena-part'));
    assert.deepEqual(parts, ['split-button.primary', 'split-button.caret']);
    assert.equal(primary.textContent?.trim(), 'Deploy');
    assert.equal(primary.getAttribute('type'), 'button');
    assert.equal(caret.getAttribute('type'), 'button');
    assert.equal(caret.getAttribute('aria-label'), 'More deploy options');
  } finally { fixture.destroy(); }
});

test('the primary half honours a native type override', () => {
  const { fixture, primary } = render({ type: 'submit' });
  try {
    assert.equal(primary.getAttribute('type'), 'submit');
  } finally { fixture.destroy(); }
});

test('the caret glyph is the only trailing glyph, hidden from assistive technology', () => {
  const { fixture, root } = render({ icon: 'ph-bold ph-rocket-launch' });
  try {
    const drawn = [...root.querySelectorAll('svg')];
    assert.deepEqual(drawn.map((one) => one.getAttribute('aria-hidden')), ['true', 'true']);
    assert.deepEqual(glyphIds(root), [symbol('bold', 'rocket-launch'), symbol('bold', 'caret-down')]);
  } finally { fixture.destroy(); }
});

test('the popup state sits on the caret and on nothing else', () => {
  const { fixture, root, caret } = render();
  try {
    assert.equal(caret.getAttribute('aria-haspopup'), 'menu');
    assert.equal(caret.getAttribute('aria-expanded'), 'false');
    assert.deepEqual([...root.querySelectorAll('[aria-haspopup]')], [caret], 'the primary half claimed the popup too');
  } finally { fixture.destroy(); }
});

test('a click on the primary half reaches the consumer exactly once', () => {
  const { fixture, primary, emitted, host } = render();
  try {
    primary.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    assert.equal(emitted.count, 1, 'the click output did not emit');
    assert.equal(host.clicks, 1, 'a consumer binding (click) heard the emit and the native event both, or neither');
    assertNoNode(panel(), 'the primary half opened the menu');
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('a consumer\'s (click) hears the primary half only, never the caret', () => {
  const { fixture, caret, emitted, host } = render();
  try {
    caret.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    assert.ok(panel(), 'the caret did not open the menu, so stopping its bubble stopped the menu too');
    assert.equal(emitted.count, 0, 'the caret emitted click');
    assert.equal(host.clicks, 0, 'a caret press reached the consumer as a primary activation');
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('with the menu open, a press on the primary half closes the menu and reaches the consumer once', () => {
  const { fixture, primary, caret, emitted, host } = render();
  try {
    caret.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    assert.ok(panel(), 'the caret did not open the menu');
    primary.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    primary.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    assertNoNode(panel(), 'a press on the primary half left the menu open');
    assert.equal(caret.getAttribute('aria-expanded'), 'false');
    assert.deepEqual([emitted.count, host.clicks], [1, 1], 'the primary half did not report its activation exactly once');
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('loading draws the spinner on the primary half and blocks it alone', () => {
  const { fixture, primary, caret, emitted, host } = render({ icon: 'ph-bold ph-rocket-launch', loading: true });
  try {
    assert.equal(primary.disabled, true);
    assert.equal(caret.disabled, false, 'loading blocked the caret as well');
    assert.ok(primary.querySelector('[data-arena-part="split-button.spinner"]'), 'loading drew no spinner');
    assert.deepEqual(glyphIds(primary).filter((id) => id.endsWith('rocket-launch')), [], 'the leading icon stayed beside the spinner');
    primary.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual([emitted.count, host.clicks], [0, 0], 'a loading primary half reported a click');
  } finally { fixture.destroy(); }
});

test('disabled blocks both halves, and nothing reaches the consumer', () => {
  const { fixture, primary, caret, emitted, host } = render({ disabled: true });
  try {
    assert.deepEqual([primary.disabled, caret.disabled], [true, true]);
    primary.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual([emitted.count, host.clicks], [0, 0], 'a disabled primary half reported a click');
  } finally { fixture.destroy(); }
});

test('destructive marks both halves', () => {
  const { fixture, primary, caret } = render({ destructive: true });
  try {
    assert.ok(primary.hasAttribute('data-arena-destructive'));
    assert.ok(caret.hasAttribute('data-arena-destructive'));
  } finally { fixture.destroy(); }
});

test('the inner menu takes arena-fit beside its own classes, so a fill on the split stops at its halves', () => {
  const { fixture, root } = render();
  try {
    const menu = root.querySelector('arena-menu') as HTMLElement;
    assert.ok(menu.classList.contains('arena-fit'), 'the static arena-fit class was dropped by the menu\'s own class binding');
    assert.ok(menu.classList.contains('arena-menu__root'), 'the menu lost its own root class');
  } finally { fixture.destroy(); }
});

test('ArenaSplitButton meets the menu-button pattern it binds, on the caret', () => {
  const { fixture, caret } = render();
  try {
    const enter = press(caret, 'Enter');
    fixture.detectChanges();
    assert.equal(enter.defaultPrevented, true, 'keyboard.Enter: the caret left Enter to a synthesized click');
    assert.ok(panel(), 'keyboard.Enter: Enter did not open the menu');
    assert.equal(caret.getAttribute('aria-expanded'), 'true');
    const first = panel()!.querySelector<HTMLElement>('[role="menuitem"]');
    assertSameNode(document.activeElement, first, 'focus.onOpen: opening left focus on the caret');

    const rows = [...panel()!.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    assertPattern({
      root: document.body,
      bindingPath: BINDING,
      subjects: {
        default: caret,
        'roles.item': rows,
        'roles.separator': [...panel()!.querySelectorAll<HTMLElement>('[data-arena-part="menu.divider"]')],
      },
      behavioural: {
        'focus.onOpen': true, 'keyboard.Enter': true, 'keyboard.Space': true, 'keyboard.Escape': true,
        'focus.roving': true, 'keyboard.ArrowDown': true, 'keyboard.ArrowUp': true,
        'keyboard.Home': true, 'keyboard.End': true, 'keyboard.TypeAhead': true,
      },
    });

    assert.equal(press(first!, 'ArrowDown').defaultPrevented, true);
    assertSameNode(document.activeElement, rows[1]!, 'ArrowDown did not reach the second row');
    press(rows[1]!, 'ArrowDown');
    assertSameNode(document.activeElement, rows[0]!, 'ArrowDown did not wrap from the last row to the first');

    press(first!, 'Escape');
    fixture.detectChanges();
    assertNoNode(panel(), 'keyboard.Escape: Escape did not close the menu');
    assertSameNode(document.activeElement, caret, 'keyboard.Escape: closing did not return focus to the caret');

    const space = press(caret, ' ');
    fixture.detectChanges();
    assert.equal(space.defaultPrevented, true, 'keyboard.Space: Space must be intercepted');
    assert.ok(panel(), 'keyboard.Space: Space did not open the menu');
  } finally { fixture.destroy(); disposeOverlays(); }
});

@Component({
  selector: 'split-button-blank-host',
  standalone: true,
  imports: [ArenaSplitButton],
  template: `<arena-split-button [label]="label" [menuLabel]="menuLabel" [items]="items">Deploy</arena-split-button>`,
})
class BlankHost {
  label = 'Deployment';
  menuLabel = 'More deploy options';
  readonly items = ITEMS;
}

@Component({
  selector: 'split-button-empty-host',
  standalone: true,
  imports: [ArenaSplitButton],
  template: `<arena-split-button label="Deployment" menuLabel="More deploy options" [items]="items"> </arena-split-button>`,
})
class EmptyHost {
  readonly items = ITEMS;
}

test('a blank label throws', () => {
  const fixture = TestBed.createComponent(BlankHost);
  fixture.componentInstance.label = '  ';
  try {
    assert.throws(() => fixture.detectChanges(), /ArenaSplitButton: `label` is required/);
  } finally { fixture.destroy(); }
});

test('a blank menu label throws', () => {
  const fixture = TestBed.createComponent(BlankHost);
  fixture.componentInstance.menuLabel = '  ';
  try {
    assert.throws(() => fixture.detectChanges(), /ArenaSplitButton: `menuLabel` is required/);
  } finally { fixture.destroy(); }
});

test('missing content throws', () => {
  const fixture = TestBed.createComponent(EmptyHost);
  try {
    assert.throws(() => fixture.detectChanges(), /ArenaSplitButton: content is required/);
  } finally { fixture.destroy(); }
});
