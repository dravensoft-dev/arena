/* One row per scene, in four tables (click, key, change, valueChange): a native event dispatched on an inner element reaches the document, and the
 * Arena event reports only what the component owns. `heard` is the document's count, `ran` the
 * host's (activate) binding. A disabled native button fires no click, so a loading button is
 * heard by no one (0). The kebab press bubbles and the chip holds no click listener around it (1).
 * A change row dispatches one native `change`: `heard` counts the document, `vals` the (valueChange)
 * payloads, each the contract's value and never a DOM event. */

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
import { ArenaCheckbox } from '../components/forms/arena-checkbox/ArenaCheckbox';
import { ArenaCheckboxGroup } from '../components/forms/arena-checkbox-group/ArenaCheckboxGroup';
import { ArenaRadio } from '../components/forms/arena-radio/ArenaRadio';
import { ArenaRadioGroup } from '../components/forms/arena-radio-group/ArenaRadioGroup';
import { ArenaInput } from '../components/forms/arena-input/ArenaInput';
import { ArenaTextarea } from '../components/forms/arena-textarea/ArenaTextarea';
import { ArenaSelect } from '../components/forms/arena-select/ArenaSelect';
import { ArenaCombobox } from '../components/forms/arena-combobox/ArenaCombobox';
import { ArenaMultiSelect } from '../components/forms/arena-multi-select/ArenaMultiSelect';
import { ArenaNumberField } from '../components/forms/arena-number-field/ArenaNumberField';
import { ArenaFileInput } from '../components/forms/arena-file-input/ArenaFileInput';
import { ArenaPinInput } from '../components/forms/arena-pin-input/ArenaPinInput';
import { ArenaSegmentedControl } from '../components/navigation/arena-segmented-control/ArenaSegmentedControl';
import { ArenaPagination } from '../components/navigation/arena-pagination/ArenaPagination';
import { ArenaStepper } from '../components/navigation/arena-stepper/ArenaStepper';
import { ArenaSlider } from '../components/forms/arena-slider/ArenaSlider';

const root = document.documentElement;
before(() => { root.style.setProperty('--bp-md', '768px'); });
after(() => { root.style.removeProperty('--bp-md'); });

const ITEMS: readonly ArenaMenuItem[] = [{ label: 'Deploy to staging' }];

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

async function spaceIn<T extends { ran: number }>(
  host: new () => T,
  pick: (el: HTMLElement) => HTMLElement,
): Promise<{ heard: number; ran: number; prevented: boolean }> {
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  await fixture.whenStable();
  const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  let heard = 0;
  const count = (): void => { heard += 1; };
  document.addEventListener('keydown', count);
  try {
    pick(fixture.nativeElement as HTMLElement).dispatchEvent(space);
    fixture.detectChanges();
    await fixture.whenStable();
    return { heard, ran: fixture.componentInstance.ran, prevented: space.defaultPrevented };
  } finally {
    document.removeEventListener('keydown', count);
    fixture.destroy();
  }
}

const part = (el: HTMLElement, name: string): HTMLElement => {
  const found = el.querySelector<HTMLElement>(`[data-arena-part="${name}"]`);
  assert.ok(found, `${name} did not render`);
  return found;
};

@Component({
  selector: 'nr-cardhost',
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

@Component({
  selector: 'nr-cardfieldhost',
  standalone: true,
  imports: [ArenaCard],
  template: `<arena-card title="Form" [interactive]="true" (activate)="ran = ran + 1"><input aria-label="Note" /></arena-card>`,
})
class CardFieldHost { ran = 0; }

@Component({
  selector: 'nr-buttonhost',
  standalone: true,
  imports: [ArenaButton],
  template: `<arena-button [loading]="loading" (activate)="ran = ran + 1; payload = $event">Go</arena-button>`,
})
class ButtonHost {
  loading = false;
  ran = 0;
  payload: unknown = 'none';
}

@Component({
  selector: 'nr-iconbuttonhost',
  standalone: true,
  imports: [ArenaIconButton],
  template: `<arena-icon-button icon="ph-bold ph-x" label="Close" (activate)="ran = ran + 1; payload = $event" />`,
})
class IconButtonHost { ran = 0; payload: unknown = 'none'; }

@Component({
  selector: 'nr-splithost',
  standalone: true,
  imports: [ArenaSplitButton],
  template: `<arena-split-button label="Deployment" menuLabel="More deploy options" [items]="items"
                                 (activate)="ran = ran + 1">Deploy</arena-split-button>`,
})
class SplitHost {
  readonly items = ITEMS;
  ran = 0;
}

@Component({
  selector: 'nr-rowhost',
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Deployments" [columns]="columns" [responsive]="responsive">
      <tr arena-table-row [interactive]="true" [disabled]="disabled" (activate)="ran = ran + 1">
        <td arena-table-cell>checkout-api</td>
        <td arena-table-cell>Healthy</td>
      </tr>
    </arena-table>
  `,
})
class RowHost {
  readonly columns = [{ header: 'Service' }, { header: 'Status' }];
  responsive = false;
  disabled = false;
  ran = 0;
}

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

@Component({
  selector: 'nr-rowfieldhost',
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Deployments" [columns]="columns">
      <tr arena-table-row [interactive]="true" (activate)="ran = ran + 1">
        <td arena-table-cell><input aria-label="Note" /></td>
      </tr>
    </arena-table>
  `,
})
class RowFieldHost {
  readonly columns = [{ header: 'Note' }];
  ran = 0;
}

@Component({
  selector: 'nr-chiphost',
  standalone: true,
  imports: [ArenaCalendar, ArenaCalendarEvent],
  template: `
    <arena-calendar timeZone="UTC" anchorDate="2027-03-15" view="day" dayStart="09:00" dayEnd="11:00">
      <arena-calendar-event id="a" title="Standup" start="2027-03-15T09:00:00Z" end="2027-03-15T10:00:00Z"
                            [colorId]="1" [interactive]="interactive" [actionsEnabled]="actions()" (activate)="ran = ran + 1">
        <button actions type="button">Delete</button>
      </arena-calendar-event>
    </arena-calendar>
  `,
})
class ChipHost {
  readonly actions = signal(false);
  interactive = true;
  ran = 0;
}

type ValueHost = { vals: unknown[] };

async function changeScene<T extends ValueHost>(
  host: new () => T,
  act: (el: HTMLElement, fixture: ComponentFixture<T>) => void | Promise<void>,
): Promise<{ heard: number; vals: unknown[] }> {
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  await fixture.whenStable();
  let heard = 0;
  const count = (): void => { heard += 1; };
  document.addEventListener('change', count);
  try {
    await act(fixture.nativeElement as HTMLElement, fixture);
    fixture.detectChanges();
    await fixture.whenStable();
    return { heard, vals: [...fixture.componentInstance.vals] };
  } finally {
    document.removeEventListener('change', count);
    fixture.destroy();
  }
}

const CHANGE = (): Event => new Event('change', { bubbles: true });
const query = <E extends HTMLElement>(el: HTMLElement, selector: string): E => {
  const found = el.querySelector<E>(selector);
  assert.ok(found, `${selector} did not render`);
  return found;
};
const typeInto = (control: HTMLInputElement | HTMLTextAreaElement, text: string): void => {
  control.value = text;
  control.dispatchEvent(new Event('input', { bubbles: true }));
};
const OPTIONS = [{ value: 'eu-west', label: 'Europe West' }, { value: 'eu-north', label: 'Europe North' }];

@Component({ selector: 'nr-checkboxhost', standalone: true, imports: [ArenaCheckbox], template: `<arena-checkbox label="Notify" (valueChange)="vals.push($event)" />` })
class CheckboxHost { vals: unknown[] = []; }

@Component({
  selector: 'nr-checkboxgrouphost',
  standalone: true,
  imports: [ArenaCheckboxGroup, ArenaCheckbox],
  template: `<arena-checkbox-group ariaLabel="Alerts" (valueChange)="vals.push($event)">
    <arena-checkbox value="a" label="A" /><arena-checkbox value="b" label="B" />
  </arena-checkbox-group>`,
})
class CheckboxGroupHost { vals: unknown[] = []; }

@Component({
  selector: 'nr-radiogrouphost',
  standalone: true,
  imports: [ArenaRadioGroup, ArenaRadio],
  template: `<arena-radio-group ariaLabel="Plan" (valueChange)="vals.push($event)">
    <arena-radio value="a" label="A" /><arena-radio value="b" label="B" />
  </arena-radio-group>`,
})
class RadioGroupHost { vals: unknown[] = []; }

@Component({ selector: 'nr-inputhost', standalone: true, imports: [ArenaInput], template: `<arena-input label="Name" (valueChange)="vals.push($event)" />` })
class InputHost { vals: unknown[] = []; }

@Component({ selector: 'nr-textareahost', standalone: true, imports: [ArenaTextarea], template: `<arena-textarea label="Notes" (valueChange)="vals.push($event)" />` })
class TextareaHost { vals: unknown[] = []; }

@Component({ selector: 'nr-selecthost', standalone: true, imports: [ArenaSelect], template: `<arena-select label="Region" [options]="options" (valueChange)="vals.push($event)" />` })
class SelectHost { readonly options = OPTIONS; vals: unknown[] = []; }

@Component({ selector: 'nr-comboboxhost', standalone: true, imports: [ArenaCombobox], template: `<arena-combobox label="Region" [options]="options" (valueChange)="vals.push($event)" />` })
class ComboboxHost { readonly options = OPTIONS; vals: unknown[] = []; }

@Component({ selector: 'nr-multiselecthost', standalone: true, imports: [ArenaMultiSelect], template: `<arena-multi-select label="Regions" [options]="options" (valueChange)="vals.push($event)" />` })
class MultiSelectHost { readonly options = OPTIONS; vals: unknown[] = []; }

@Component({ selector: 'nr-numberhost', standalone: true, imports: [ArenaNumberField], template: `<arena-number-field label="Replicas" (valueChange)="vals.push($event)" />` })
class NumberHost { vals: unknown[] = []; }

@Component({ selector: 'nr-filehost', standalone: true, imports: [ArenaFileInput], template: `<form><arena-file-input label="Attach" name="docs" (valueChange)="vals.push($event)" /></form>` })
class FileHost { vals: unknown[] = []; }

@Component({ selector: 'nr-pinhost', standalone: true, imports: [ArenaPinInput], template: `<arena-pin-input label="Code" [length]="4" (valueChange)="vals.push($event)" />` })
class PinHost { vals: unknown[] = []; }

@Component({
  selector: 'nr-segmentedhost',
  standalone: true,
  imports: [ArenaSegmentedControl],
  template: `<arena-segmented-control ariaLabel="View" [options]="options" (valueChange)="vals.push($event)" />`,
})
class SegmentedHost { readonly options = [{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }]; vals: unknown[] = []; }

@Component({ selector: 'nr-paginationhost', standalone: true, imports: [ArenaPagination], template: `<arena-pagination ariaLabel="Pages" [page]="1" [pageCount]="5" (valueChange)="vals.push($event)" />` })
class PaginationHost { vals: unknown[] = []; }

@Component({
  selector: 'nr-stepperhost',
  standalone: true,
  imports: [ArenaStepper],
  template: `<arena-stepper ariaLabel="Checkout" [steps]="steps" [index]="2" [interactive]="true" (valueChange)="vals.push($event)" />`,
})
class StepperHost { readonly steps = [{ label: 'Account' }, { label: 'Shipping' }, { label: 'Payment' }]; vals: unknown[] = []; }

@Component({ selector: 'nr-sliderhost', standalone: true, imports: [ArenaSlider], template: `<arena-slider label="Volume" [min]="0" [max]="100" [step]="1" [value]="20" (valueChange)="vals.push($event)" />` })
class SliderHost { vals: unknown[] = []; }

@Component({
  selector: 'nr-ownboxhost',
  standalone: true,
  imports: [ArenaCheckboxGroup, ArenaCheckbox],
  template: `<arena-checkbox-group ariaLabel="Alerts" (valueChange)="vals.push($event)">
    <arena-checkbox value="a" label="A" (valueChange)="own.push($event)" />
  </arena-checkbox-group>`,
})
class OwnBoxHost { vals: unknown[] = []; own: boolean[] = []; }

type Heard = { ran: number };

interface ClickRow {
  name: string;
  host: new () => Heard;
  patch?: object;
  pick: (el: HTMLElement) => HTMLElement;
  expect: [heard: number, ran: number];
  configure?: (fixture: ComponentFixture<Heard>) => Promise<void> | void;
  inspect?: (el: HTMLElement) => void;
  check?: (fixture: ComponentFixture<Heard>, heard: number, name: string) => void;
}

const PAYLOAD_FREE = (fixture: ComponentFixture<Heard>, _heard: number, name: string): void =>
  assert.equal((fixture.componentInstance as unknown as { payload: unknown }).payload, undefined,
    `${name}: activate carries no payload, and never the DOM event`);
const COUNTS_THE_CLICK = (fixture: ComponentFixture<Heard>, heard: number, name: string): void =>
  assert.equal((fixture.componentInstance as unknown as { c: number }).c, heard, `${name}: the host's own click listener hears what the document hears`);
const OPEN_ACTIONS = (fixture: ComponentFixture<Heard>): void => {
  const chip = fixture.componentInstance as unknown as ChipHost;
  chip.actions.set(true);
  fixture.detectChanges();
};
const CHIP = (el: HTMLElement): HTMLElement => el.querySelector('[id^="arena-calendar-event-"]') as HTMLElement;
const BUTTON = (el: HTMLElement): HTMLElement => el.querySelector('button') as HTMLElement;
const FIRST_CELL = (el: HTMLElement): HTMLElement => el.querySelector('tr[arena-table-row] td') as HTMLElement;

const CLICK_ROWS: ClickRow[] = [
  { name: 'ArenaCard: a click on a plain card\'s body reaches the document and activates nothing', host: CardHost, pick: (el) => part(el, 'card.body'), expect: [1, 0], check: COUNTS_THE_CLICK },
  { name: 'ArenaCard: a click on an interactive card reaches the document and activates once', host: CardHost, patch: { interactive: true }, pick: (el) => part(el, 'card.body'), expect: [1, 1], check: COUNTS_THE_CLICK },
  { name: 'ArenaCard: a disabled interactive card hears the click and activates nothing', host: CardHost, patch: { interactive: true, disabled: true }, pick: cardRoot, expect: [1, 0], check: COUNTS_THE_CLICK },
  { name: 'ArenaCard: a click on the href card\'s anchor reaches the document and activates once', host: CardHost, patch: { href: '/x' }, pick: (el) => el.querySelector('a') as HTMLElement, expect: [1, 1], check: COUNTS_THE_CLICK },
  { name: 'ArenaButton: a click reaches the document and activates once', host: ButtonHost, pick: BUTTON, expect: [1, 1], check: PAYLOAD_FREE },
  { name: 'ArenaButton: a loading button hears the click and activates nothing', host: ButtonHost, patch: { loading: true }, pick: BUTTON, expect: [0, 0] },
  { name: 'ArenaIconButton: a click reaches the document and activates once', host: IconButtonHost, pick: BUTTON, expect: [1, 1], check: PAYLOAD_FREE },
  { name: 'ArenaSplitButton: a click on the primary half reaches the document and activates once', host: SplitHost, pick: (el) => part(el, 'split-button.primary'), expect: [1, 1] },
  { name: 'ArenaSplitButton: a click on the caret reaches the document and activates nothing', host: SplitHost, pick: (el) => part(el, 'split-button.caret'), expect: [1, 0] },
  { name: 'ArenaTableRow: a click on a cell of an interactive row reaches the document and activates once', host: RowHost, pick: FIRST_CELL, expect: [1, 1] },
  { name: 'ArenaTableRow: a click on a disabled interactive row reaches the document and activates nothing', host: RowHost, patch: { disabled: true }, pick: FIRST_CELL, expect: [1, 0] },
  { name: 'ArenaCalendarEvent: a click on the chip stops at the chip, alike in both layers', host: ChipHost, pick: CHIP, expect: [0, 1] },
  {
    name: 'ArenaCalendarEvent: a click on the body of a chip with a panel stops at the chip, alike in both layers', host: ChipHost, expect: [0, 1],
    pick: (el) => {
      const body = el.querySelector<HTMLElement>('[id^="arena-calendar-event-"] button[aria-label^="Standup"]');
      assert.ok(body, 'the chip body did not render');
      return body;
    },
    configure: OPEN_ACTIONS,
  },
  { name: 'ArenaCalendarEvent: a click on a non-interactive chip stops at the chip and activates nothing', host: ChipHost, patch: { interactive: false }, pick: CHIP, expect: [0, 0] },
  {
    name: 'ArenaCalendarEvent: a press on the kebab opens the panel and does not activate the chip', host: ChipHost, expect: [1, 0],
    pick: (el) => {
      const kebab = el.querySelector<HTMLElement>('arena-icon-button button');
      assert.ok(kebab, 'the kebab did not render');
      return kebab;
    },
    configure: OPEN_ACTIONS,
    inspect: (el) => assert.ok(el.querySelector('button[actions]'), 'the panel did not open'),
  },
];

test('a click on an inner element reaches the document and the Arena event reports only what the component owns', async () => {
  assert.ok(CLICK_ROWS.length > 0, 'no rows -- the table would check nothing');
  for (const row of CLICK_ROWS) {
    const r = await named(row.name, () => dispatchOn(row.host, (row.patch ?? {}) as Partial<Heard>, 'click', row.pick, row.configure, row.inspect));
    assert.deepEqual([r.heard, r.ran], row.expect, `${row.name}: [heard, ran]`);
    row.check?.(r.fixture, r.heard, row.name);
  }
});

const NARROW_ROW = (el: HTMLElement): HTMLElement => {
  const row = el.querySelector<HTMLElement>('tr[arena-table-row]');
  assert.ok(row, 'the row did not render');
  assert.equal(row.getAttribute('role'), 'button', 'the narrow table did not draw the card shape');
  return row;
};

async function underNarrowTable<R>(run: () => Promise<R>): Promise<R> {
  const restore = stubResize(400);
  try {
    return await run();
  } finally {
    restore();
  }
}

interface KeyRow {
  name: string;
  expect: unknown[];
  run: () => Promise<unknown[]>;
}

const KEY_ROWS: KeyRow[] = [
  {
    name: 'ArenaCard: Enter on an interactive card reaches the document as a keydown',
    expect: [1, 1],
    run: async () => { const r = await dispatchOn(CardHost, { interactive: true }, 'keydown', cardRoot); return [r.heard, r.ran]; },
  },
  {
    name: 'ArenaCard: Space in a field inside an interactive card types into the field and activates nothing',
    expect: [1, 0, false],
    run: async () => { const r = await spaceIn(CardFieldHost, (el) => el.querySelector('input') as HTMLElement); return [r.heard, r.ran, r.prevented]; },
  },
  {
    name: 'ArenaTableRow: Enter on an interactive card-layout row reaches the document as a keydown',
    expect: [1, 1],
    run: () => underNarrowTable(async () => {
      const r = await dispatchOn(RowHost, { responsive: true }, 'keydown', NARROW_ROW);
      return [r.heard, r.ran];
    }),
  },
  {
    name: 'ArenaTableRow: Space in a field inside an interactive card-layout row types into the field and activates nothing',
    expect: [1, 0, false],
    run: () => underNarrowTable(async () => {
      const r = await spaceIn(RowFieldHost, (el) => {
        assert.equal(el.querySelector('tr[arena-table-row]')?.getAttribute('role'), 'button', 'the narrow table did not draw the card shape');
        return el.querySelector('input') as HTMLElement;
      });
      return [r.heard, r.ran, r.prevented];
    }),
  },
];

test('a key on an inner element reaches the document as a keydown and activates only what the component owns', async () => {
  assert.ok(KEY_ROWS.length > 0, 'no rows -- the table would check nothing');
  for (const row of KEY_ROWS) assert.deepEqual(await named(row.name, row.run), row.expect, `${row.name}: [heard, ran${row.expect.length === 3 ? ', prevented' : ''}]`);
});

async function named<R>(name: string, run: () => Promise<R>): Promise<R> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof assert.AssertionError) {
      const renamed = new assert.AssertionError({
        message: `${name}: ${error.message}`, actual: error.actual, expected: error.expected, operator: error.operator,
      });
      Object.defineProperty(renamed, 'cause', { value: error });
      throw renamed;
    }
    if (error instanceof Error) throw new (error.constructor as ErrorConstructor)(`${name}: ${error.message}`, { cause: error });
    throw new Error(`${name}: ${String(error)}`, { cause: error });
  }
}

const ownBox: { own: boolean[] } = { own: [] };

interface ChangeRow {
  name: string;
  host: new () => ValueHost;
  act: (el: HTMLElement, fixture: ComponentFixture<ValueHost>) => void | Promise<void>;
  heard: number;
  vals?: unknown[];
  kind?: 'boolean' | 'string' | 'number';
  check?: (vals: unknown[], name: string) => void;
}

const CLICK_FIRST = (selector: string) => (el: HTMLElement): void => query<HTMLInputElement>(el, selector).click();
const EDIT = (selector: string, text: string) => (el: HTMLElement): void => {
  const control = query<HTMLInputElement | HTMLTextAreaElement>(el, selector);
  typeInto(control, text);
  control.dispatchEvent(CHANGE());
};

const CHANGE_ROWS: ChangeRow[] = [
  { name: 'ArenaCheckbox: a toggle\'s change reaches the document and valueChange carries the state', host: CheckboxHost, act: CLICK_FIRST('input[type=checkbox]'), heard: 1, vals: [true], kind: 'boolean' },
  {
    name: 'ArenaCheckboxGroup: a box\'s change reaches the document and the group\'s valueChange runs once', host: CheckboxGroupHost, act: CLICK_FIRST('input[type=checkbox]'), heard: 1,
    vals: [{ values: ['a'] }],
    check: (vals, name) => assert.ok(Array.isArray((vals[0] as { values: unknown }).values), `${name}: the group reports an array`),
  },
  { name: 'ArenaRadioGroup: a radio\'s change reaches the document and the group\'s valueChange runs once', host: RadioGroupHost, act: CLICK_FIRST('input[type=radio]'), heard: 1, vals: ['a'], kind: 'string' },
  { name: 'ArenaInput: an edit\'s change reaches the document', host: InputHost, act: EDIT('input', 'ada'), heard: 1, vals: ['ada'], kind: 'string' },
  { name: 'ArenaTextarea: an edit\'s change reaches the document', host: TextareaHost, act: EDIT('textarea', 'ship it'), heard: 1, vals: ['ship it'], kind: 'string' },
  {
    name: 'ArenaSelect: a choice\'s change reaches the document', host: SelectHost, heard: 1, vals: ['eu-north'], kind: 'string',
    act: (el) => {
      const select = query<HTMLSelectElement>(el, 'select');
      select.value = 'eu-north';
      select.dispatchEvent(CHANGE());
    },
  },
  { name: 'ArenaCombobox: the text field\'s change reaches the document and reports nothing by itself', host: ComboboxHost, act: EDIT('input[role=combobox]', 'eu'), heard: 1, vals: [] },
  { name: 'ArenaMultiSelect: the text field\'s change reaches the document and reports nothing by itself', host: MultiSelectHost, act: EDIT('input[role=combobox]', 'eu'), heard: 1, vals: [] },
  {
    name: 'ArenaNumberField: a commit\'s change reaches the document', host: NumberHost, heard: 1, vals: [5], kind: 'number',
    act: (el, fixture) => {
      const input = query<HTMLInputElement>(el, 'input[role=spinbutton]');
      input.dispatchEvent(new FocusEvent('focus'));
      typeInto(input, '5');
      input.dispatchEvent(CHANGE());
      assert.deepEqual(fixture.componentInstance.vals, [], 'a native change committed');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    },
  },
  {
    name: 'ArenaFileInput: a pick\'s change reaches the document', host: FileHost, heard: 1,
    act: (el) => {
      const input = query<HTMLInputElement>(el, 'input[type=file]');
      const transfer = new DataTransfer();
      transfer.items.add(new File(['xyz'], 'plan.pdf', { type: 'application/pdf', lastModified: 1 }));
      input.files = transfer.files;
      input.dispatchEvent(CHANGE());
    },
    check: (vals, name) => {
      assert.equal(vals.length, 1, `${name}: one valueChange`);
      assert.deepEqual((vals[0] as { names: unknown }).names, ['plan.pdf'], `${name}: the picked names`);
    },
  },
  { name: 'ArenaPinInput: a cell\'s change reaches the document', host: PinHost, act: EDIT('input', '4'), heard: 1, vals: ['4'], kind: 'string' },
  {
    name: 'ArenaSegmentedControl: an option\'s change reaches the document', host: SegmentedHost, heard: 1, vals: ['grid'], kind: 'string',
    act: (el) => {
      const radios = el.querySelectorAll<HTMLInputElement>('input[type=radio]');
      assert.ok(radios[1], 'the option did not render');
      radios[1].dispatchEvent(CHANGE());
    },
  },
  {
    name: 'ArenaCheckboxGroup: a box keeps its own onValueChange and the group reports the set', host: OwnBoxHost, heard: 1, vals: [{ values: ['a'] }],
    act: (el, fixture) => {
      ownBox.own = [];
      query<HTMLInputElement>(el, 'input[type=checkbox]').click();
      ownBox.own = (fixture.componentInstance as OwnBoxHost).own;
    },
    check: (_vals, name) => assert.deepEqual(ownBox.own, [true], `${name}: the box's own valueChange`),
  },
];

test('a native change on an inner control reaches the document, and valueChange carries the contract\'s value, never a DOM event', async () => {
  assert.ok(CHANGE_ROWS.length > 0, 'no rows -- the table would check nothing');
  for (const row of CHANGE_ROWS) {
    const r = await named(row.name, () => changeScene(row.host, row.act));
    assert.equal(r.heard, row.heard, `${row.name}: the document's change count`);
    if (row.vals !== undefined) assert.deepEqual(r.vals, row.vals, `${row.name}: valueChange payloads`);
    if (row.kind !== undefined) assert.equal(typeof r.vals[0], row.kind, `${row.name}: the payload's type`);
    row.check?.(r.vals, row.name);
  }
});

const VALUE_ROWS: ChangeRow[] = [
  {
    name: 'ArenaPagination: valueChange reports a move and no native change exists to stop', host: PaginationHost, heard: 0, vals: [2], kind: 'number',
    act: (el) => {
      const buttons = [...el.querySelectorAll<HTMLButtonElement>('nav button')].filter((b) => b.textContent?.trim() === '2');
      assert.ok(buttons[0], 'page 2 did not render');
      buttons[0].click();
    },
  },
  {
    name: 'ArenaStepper: valueChange reports a move and no native change exists to stop', host: StepperHost, heard: 0, vals: [0], kind: 'number',
    act: (el) => {
      const buttons = el.querySelectorAll<HTMLButtonElement>('button');
      assert.ok(buttons[0], 'the earlier step did not render');
      buttons[0].click();
    },
  },
  {
    name: 'ArenaSlider: valueChange reports a move and no native change exists to stop', host: SliderHost, heard: 0, vals: [21], kind: 'number',
    act: (el) => { query(el, '[role="slider"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); },
  },
];

test('a component with no native change reports a move through valueChange alone', async () => {
  assert.ok(VALUE_ROWS.length > 0, 'no rows -- the table would check nothing');
  for (const row of VALUE_ROWS) {
    const r = await named(row.name, () => changeScene(row.host, row.act));
    assert.equal(r.heard, row.heard, `${row.name}: the document hears no change`);
    assert.deepEqual(r.vals, row.vals, `${row.name}: valueChange payloads`);
    assert.equal(typeof r.vals[0], row.kind, `${row.name}: the payload's type`);
  }
});
