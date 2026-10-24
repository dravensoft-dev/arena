/* One row per scene: a native event dispatched on an inner element reaches the document, and the
 * Arena event reports only what the component owns. `heard` is the document's count, `ran` the
 * host's (activate) binding. A disabled native button fires no click, so a loading button is
 * heard by no one (0). The kebab press bubbles and the chip holds no click listener around it (1). */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ArenaMenuItem } from '../Api.generated';
import { ArenaButton } from '../components/forms/arena-button/ArenaButton';
import { ArenaIconButton } from '../components/forms/arena-icon-button/ArenaIconButton';
import { ArenaSplitButton } from '../components/forms/arena-split-button/ArenaSplitButton';
import { ArenaCard } from '../components/display/arena-card/ArenaCard';
import { ArenaTable } from '../components/display/arena-table/ArenaTable';
import { ArenaTableRow } from '../components/display/arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../components/display/arena-table-cell/ArenaTableCell';
import { ArenaCalendar } from '../components/display/arena-calendar/ArenaCalendar';
import { ArenaCalendarEvent } from '../components/display/arena-calendar-event/ArenaCalendarEvent';

const root = document.documentElement;
before(() => { root.style.setProperty('--bp-md', '768px'); });
after(() => { root.style.removeProperty('--bp-md'); });

const ITEMS: readonly ArenaMenuItem[] = [{ id: 'a', label: 'Deploy to staging' }];

const MOUSE = (): MouseEvent => new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
const ENTER = (): KeyboardEvent => new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });

async function dispatchOn<T extends { ran: number }>(
  host: new () => T,
  patch: Partial<T>,
  type: 'click' | 'keydown',
  pick: (el: HTMLElement) => HTMLElement,
  configure?: (fixture: ComponentFixture<T>) => Promise<void> | void,
  inspect?: (el: HTMLElement) => void,
): Promise<{ heard: number; ran: number; fixture: ComponentFixture<T> }> {
  const fixture = TestBed.createComponent(host);
  Object.assign(fixture.componentInstance as object, patch);
  fixture.detectChanges();
  await fixture.whenStable();
  await configure?.(fixture);
  let heard = 0;
  const count = (): void => { heard += 1; };
  document.addEventListener(type, count);
  try {
    pick(fixture.nativeElement as HTMLElement).dispatchEvent(type === 'click' ? MOUSE() : ENTER());
    fixture.detectChanges();
    await fixture.whenStable();
    inspect?.(fixture.nativeElement as HTMLElement);
    return { heard, ran: fixture.componentInstance.ran, fixture };
  } finally {
    document.removeEventListener(type, count);
    fixture.destroy();
  }
}

const part = (el: HTMLElement, name: string): HTMLElement => {
  const found = el.querySelector<HTMLElement>(`[data-arena-part="${name}"]`);
  assert.ok(found, `${name} did not render`);
  return found;
};

@Component({
  standalone: true,
  imports: [ArenaCard],
  template: `<arena-card title="Plain" [interactive]="interactive" [disabled]="disabled" [href]="href"
                         (activate)="ran = ran + 1" (click)="c = c + 1">Body</arena-card>`,
})
class CardHost {
  interactive = false;
  disabled = false;
  href: string | undefined = undefined;
  ran = 0;
  c = 0;
}

const cardRoot = (el: HTMLElement): HTMLElement => part(el, 'card');

test('ArenaCard: a click on a plain card\'s body reaches the document and activates nothing', async () => {
  const r = await dispatchOn(CardHost, {}, 'click', (el) => part(el, 'card.body'));
  assert.deepEqual([r.heard, r.ran], [1, 0]);
});

test('ArenaCard: a click on an interactive card reaches the document and activates once', async () => {
  const r = await dispatchOn(CardHost, { interactive: true }, 'click', (el) => part(el, 'card.body'));
  assert.deepEqual([r.heard, r.ran], [1, 1]);
});

test('ArenaCard: a disabled interactive card hears the click and activates nothing', async () => {
  const r = await dispatchOn(CardHost, { interactive: true, disabled: true }, 'click', cardRoot);
  assert.deepEqual([r.heard, r.ran], [1, 0]);
});

test('ArenaCard: Enter on an interactive card reaches the document as a keydown (N3)', async () => {
  const r = await dispatchOn(CardHost, { interactive: true }, 'keydown', cardRoot);
  assert.deepEqual([r.heard, r.ran], [1, 1]);
});

test('ArenaCard: a click on the href card\'s anchor reaches the document and activates once', async () => {
  const r = await dispatchOn(CardHost, { href: '/x' }, 'click', (el) => el.querySelector('a') as HTMLElement);
  assert.deepEqual([r.heard, r.ran], [1, 1]);
});

@Component({
  standalone: true,
  imports: [ArenaButton],
  template: `<arena-button [loading]="loading" (activate)="ran = ran + 1">Go</arena-button>`,
})
class ButtonHost {
  loading = false;
  ran = 0;
}

test('ArenaButton: a click reaches the document and activates once', async () => {
  const r = await dispatchOn(ButtonHost, {}, 'click', (el) => el.querySelector('button') as HTMLElement);
  assert.deepEqual([r.heard, r.ran], [1, 1]);
});

test('ArenaButton: a loading button hears the click and activates nothing', async () => {
  const r = await dispatchOn(ButtonHost, { loading: true }, 'click', (el) => el.querySelector('button') as HTMLElement);
  assert.deepEqual([r.heard, r.ran], [0, 0]);
});

@Component({
  standalone: true,
  imports: [ArenaIconButton],
  template: `<arena-icon-button icon="ph-bold ph-x" label="Close" (activate)="ran = ran + 1" />`,
})
class IconButtonHost { ran = 0; }

test('ArenaIconButton: a click reaches the document and activates once', async () => {
  const r = await dispatchOn(IconButtonHost, {}, 'click', (el) => el.querySelector('button') as HTMLElement);
  assert.deepEqual([r.heard, r.ran], [1, 1]);
});

@Component({
  standalone: true,
  imports: [ArenaSplitButton],
  template: `<arena-split-button label="Deployment" menuLabel="More deploy options" [items]="items"
                                 (activate)="ran = ran + 1">Deploy</arena-split-button>`,
})
class SplitHost {
  readonly items = ITEMS;
  ran = 0;
}

test('ArenaSplitButton: a click on the primary half reaches the document and activates once', async () => {
  const r = await dispatchOn(SplitHost, {}, 'click', (el) => part(el, 'split-button.primary'));
  assert.deepEqual([r.heard, r.ran], [1, 1]);
});

test('ArenaSplitButton: a click on the caret reaches the document and activates nothing', async () => {
  const r = await dispatchOn(SplitHost, {}, 'click', (el) => part(el, 'split-button.caret'));
  assert.deepEqual([r.heard, r.ran], [1, 0]);
});

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Deployments" [columns]="columns" [responsive]="responsive">
      <tr arena-table-row [interactive]="true" (activate)="ran = ran + 1">
        <td arena-table-cell>checkout-api</td>
        <td arena-table-cell>Healthy</td>
      </tr>
    </arena-table>
  `,
})
class RowHost {
  readonly columns = [{ header: 'Service' }, { header: 'Status' }];
  responsive = false;
  ran = 0;
}

test('ArenaTableRow: a click on a cell of an interactive row reaches the document and activates once', async () => {
  const r = await dispatchOn(RowHost, {}, 'click', (el) => el.querySelector('tr[arena-table-row] td') as HTMLElement);
  assert.deepEqual([r.heard, r.ran], [1, 1]);
});

function stubResize(width: number): () => void {
  const globals = globalThis as { ResizeObserver?: unknown };
  const saved = globals.ResizeObserver;
  globals.ResizeObserver = class {
    constructor(private readonly callback: (entries: unknown[]) => void) {}
    observe(target: Element): void {
      this.callback([{ target, borderBoxSize: [{ inlineSize: width, blockSize: 0 }], contentRect: { width } }]);
    }
    disconnect(): void {}
  };
  return () => { globals.ResizeObserver = saved; };
}

test('ArenaTableRow: Enter on an interactive card-layout row reaches the document as a keydown (N3)', async () => {
  const restore = stubResize(400);
  try {
    const r = await dispatchOn(RowHost, { responsive: true }, 'keydown', (el) => {
      const row = el.querySelector<HTMLElement>('tr[arena-table-row]');
      assert.ok(row, 'the row did not render');
      assert.equal(row.getAttribute('role'), 'button', 'the narrow table did not draw the card shape');
      return row;
    });
    assert.deepEqual([r.heard, r.ran], [1, 1]);
  } finally {
    restore();
  }
});

@Component({
  standalone: true,
  imports: [ArenaCalendar, ArenaCalendarEvent],
  template: `
    <arena-calendar timeZone="UTC" anchorDate="2027-03-15" view="day" dayStart="09:00" dayEnd="11:00">
      <arena-calendar-event id="a" title="Standup" start="2027-03-15T09:00:00Z" end="2027-03-15T10:00:00Z"
                            [colorId]="1" [interactive]="true" [actionsEnabled]="actions()" (activate)="ran = ran + 1">
        <button actions type="button">Delete</button>
      </arena-calendar-event>
    </arena-calendar>
  `,
})
class ChipHost {
  readonly actions = signal(false);
  ran = 0;
}

test('ArenaCalendarEvent: a click on the chip stops at the chip, alike in both layers (D2)', async () => {
  const r = await dispatchOn(ChipHost, {}, 'click', (el) => el.querySelector('[id^="arena-calendar-event-"]') as HTMLElement);
  assert.deepEqual([r.heard, r.ran], [0, 1]);
});

test('ArenaCalendarEvent: a click on the body of a chip with a panel stops at the chip, alike in both layers (D2)', async () => {
  const r = await dispatchOn(ChipHost, {}, 'click', (el) => {
    const body = el.querySelector<HTMLElement>('[id^="arena-calendar-event-"] button[aria-label^="Standup"]');
    assert.ok(body, 'the chip body did not render');
    return body;
  }, (fixture) => { fixture.componentInstance.actions.set(true); fixture.detectChanges(); });
  assert.deepEqual([r.heard, r.ran], [0, 1]);
});

test('ArenaCalendarEvent: a press on the kebab opens the panel and does not activate the chip', async () => {
  const r = await dispatchOn(ChipHost, {}, 'click', (el) => {
    const kebab = el.querySelector<HTMLElement>('arena-icon-button button');
    assert.ok(kebab, 'the kebab did not render');
    return kebab;
  }, (fixture) => { fixture.componentInstance.actions.set(true); fixture.detectChanges(); },
  (el) => assert.ok(el.querySelector('button[actions]'), 'the panel did not open'));
  assert.deepEqual([r.heard, r.ran], [1, 0]);
});
