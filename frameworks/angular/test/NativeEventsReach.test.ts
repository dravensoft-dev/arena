/* One row per scene: a native event dispatched on an inner element reaches the document, and the
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

test('ArenaCard: a click on a plain card\'s body reaches the document and activates nothing', async () => {
  const r = await dispatchOn(CardHost, {}, 'click', (el) => part(el, 'card.body'));
  assert.deepEqual([r.heard, r.ran], [1, 0]);
  assert.equal(r.fixture.componentInstance.c, r.heard);
});

test('ArenaCard: a click on an interactive card reaches the document and activates once', async () => {
  const r = await dispatchOn(CardHost, { interactive: true }, 'click', (el) => part(el, 'card.body'));
  assert.deepEqual([r.heard, r.ran], [1, 1]);
  assert.equal(r.fixture.componentInstance.c, r.heard);
});

test('ArenaCard: a disabled interactive card hears the click and activates nothing', async () => {
  const r = await dispatchOn(CardHost, { interactive: true, disabled: true }, 'click', cardRoot);
  assert.deepEqual([r.heard, r.ran], [1, 0]);
  assert.equal(r.fixture.componentInstance.c, r.heard);
});

test('ArenaCard: Enter on an interactive card reaches the document as a keydown (N3)', async () => {
  const r = await dispatchOn(CardHost, { interactive: true }, 'keydown', cardRoot);
  assert.deepEqual([r.heard, r.ran], [1, 1]);
});

test('ArenaCard: a click on the href card\'s anchor reaches the document and activates once', async () => {
  const r = await dispatchOn(CardHost, { href: '/x' }, 'click', (el) => el.querySelector('a') as HTMLElement);
  assert.deepEqual([r.heard, r.ran], [1, 1]);
  assert.equal(r.fixture.componentInstance.c, r.heard);
});

@Component({
  selector: 'nr-buttonhost',
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
  selector: 'nr-iconbuttonhost',
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

test('ArenaSplitButton: a click on the primary half reaches the document and activates once', async () => {
  const r = await dispatchOn(SplitHost, {}, 'click', (el) => part(el, 'split-button.primary'));
  assert.deepEqual([r.heard, r.ran], [1, 1]);
});

test('ArenaSplitButton: a click on the caret reaches the document and activates nothing', async () => {
  const r = await dispatchOn(SplitHost, {}, 'click', (el) => part(el, 'split-button.caret'));
  assert.deepEqual([r.heard, r.ran], [1, 0]);
});

@Component({
  selector: 'nr-rowhost',
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
  selector: 'nr-chiphost',
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

test('ArenaCheckbox: a toggle\'s change reaches the document and valueChange carries the state', async () => {
  const r = await changeScene(CheckboxHost, (el) => query<HTMLInputElement>(el, 'input[type=checkbox]').click());
  assert.equal(r.heard, 1);
  assert.deepEqual(r.vals, [true]);
  assert.equal(typeof r.vals[0], 'boolean');
});

@Component({
  selector: 'nr-checkboxgrouphost',
  standalone: true,
  imports: [ArenaCheckboxGroup, ArenaCheckbox],
  template: `<arena-checkbox-group ariaLabel="Alerts" (valueChange)="vals.push($event)">
    <arena-checkbox value="a" label="A" /><arena-checkbox value="b" label="B" />
  </arena-checkbox-group>`,
})
class CheckboxGroupHost { vals: unknown[] = []; }

test('ArenaCheckboxGroup: a box\'s change reaches the document and the group\'s valueChange runs once (N1)', async () => {
  const r = await changeScene(CheckboxGroupHost, (el) => query<HTMLInputElement>(el, 'input[type=checkbox]').click());
  assert.equal(r.heard, 1);
  assert.deepEqual(r.vals, [{ values: ['a'] }]);
  assert.ok(Array.isArray((r.vals[0] as { values: unknown }).values));
});

@Component({
  selector: 'nr-radiogrouphost',
  standalone: true,
  imports: [ArenaRadioGroup, ArenaRadio],
  template: `<arena-radio-group ariaLabel="Plan" (valueChange)="vals.push($event)">
    <arena-radio value="a" label="A" /><arena-radio value="b" label="B" />
  </arena-radio-group>`,
})
class RadioGroupHost { vals: unknown[] = []; }

test('ArenaRadioGroup: a radio\'s change reaches the document and the group\'s valueChange runs once (N1)', async () => {
  const r = await changeScene(RadioGroupHost, (el) => query<HTMLInputElement>(el, 'input[type=radio]').click());
  assert.equal(r.heard, 1);
  assert.deepEqual(r.vals, ['a']);
  assert.equal(typeof r.vals[0], 'string');
});

@Component({ selector: 'nr-inputhost', standalone: true, imports: [ArenaInput], template: `<arena-input label="Name" (valueChange)="vals.push($event)" />` })
class InputHost { vals: unknown[] = []; }

test('ArenaInput: an edit\'s change reaches the document', async () => {
  const r = await changeScene(InputHost, (el) => {
    const input = query<HTMLInputElement>(el, 'input');
    typeInto(input, 'ada');
    input.dispatchEvent(CHANGE());
  });
  assert.equal(r.heard, 1);
  assert.deepEqual(r.vals, ['ada']);
  assert.equal(typeof r.vals[0], 'string');
});

@Component({ selector: 'nr-textareahost', standalone: true, imports: [ArenaTextarea], template: `<arena-textarea label="Notes" (valueChange)="vals.push($event)" />` })
class TextareaHost { vals: unknown[] = []; }

test('ArenaTextarea: an edit\'s change reaches the document', async () => {
  const r = await changeScene(TextareaHost, (el) => {
    const area = query<HTMLTextAreaElement>(el, 'textarea');
    typeInto(area, 'ship it');
    area.dispatchEvent(CHANGE());
  });
  assert.equal(r.heard, 1);
  assert.deepEqual(r.vals, ['ship it']);
  assert.equal(typeof r.vals[0], 'string');
});

@Component({ selector: 'nr-selecthost', standalone: true, imports: [ArenaSelect], template: `<arena-select label="Region" [options]="options" (valueChange)="vals.push($event)" />` })
class SelectHost { readonly options = OPTIONS; vals: unknown[] = []; }

test('ArenaSelect: a choice\'s change reaches the document', async () => {
  const r = await changeScene(SelectHost, (el) => {
    const select = query<HTMLSelectElement>(el, 'select');
    select.value = 'eu-north';
    select.dispatchEvent(CHANGE());
  });
  assert.equal(r.heard, 1);
  assert.deepEqual(r.vals, ['eu-north']);
  assert.equal(typeof r.vals[0], 'string');
});

@Component({ selector: 'nr-comboboxhost', standalone: true, imports: [ArenaCombobox], template: `<arena-combobox label="Region" [options]="options" (valueChange)="vals.push($event)" />` })
class ComboboxHost { readonly options = OPTIONS; vals: unknown[] = []; }

test('ArenaCombobox: the text field\'s change reaches the document and reports nothing by itself', async () => {
  const r = await changeScene(ComboboxHost, (el) => {
    const input = query<HTMLInputElement>(el, 'input[role=combobox]');
    typeInto(input, 'eu');
    input.dispatchEvent(CHANGE());
  });
  assert.equal(r.heard, 1);
  assert.deepEqual(r.vals, []);
});

@Component({ selector: 'nr-multiselecthost', standalone: true, imports: [ArenaMultiSelect], template: `<arena-multi-select label="Regions" [options]="options" (valueChange)="vals.push($event)" />` })
class MultiSelectHost { readonly options = OPTIONS; vals: unknown[] = []; }

test('ArenaMultiSelect: the text field\'s change reaches the document and reports nothing by itself', async () => {
  const r = await changeScene(MultiSelectHost, (el) => {
    const input = query<HTMLInputElement>(el, 'input[role=combobox]');
    typeInto(input, 'eu');
    input.dispatchEvent(CHANGE());
  });
  assert.equal(r.heard, 1);
  assert.deepEqual(r.vals, []);
});

@Component({ selector: 'nr-numberhost', standalone: true, imports: [ArenaNumberField], template: `<arena-number-field label="Replicas" (valueChange)="vals.push($event)" />` })
class NumberHost { vals: unknown[] = []; }

test('ArenaNumberField: a commit\'s change reaches the document', async () => {
  const r = await changeScene(NumberHost, (el, fixture) => {
    const input = query<HTMLInputElement>(el, 'input[role=spinbutton]');
    input.dispatchEvent(new FocusEvent('focus'));
    typeInto(input, '5');
    input.dispatchEvent(CHANGE());
    assert.deepEqual(fixture.componentInstance.vals, [], 'a native change committed');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
  assert.equal(r.heard, 1);
  assert.deepEqual(r.vals, [5]);
  assert.equal(typeof r.vals[0], 'number');
});

@Component({ selector: 'nr-filehost', standalone: true, imports: [ArenaFileInput], template: `<form><arena-file-input label="Attach" name="docs" (valueChange)="vals.push($event)" /></form>` })
class FileHost { vals: unknown[] = []; }

test('ArenaFileInput: a pick\'s change reaches the document', async () => {
  const r = await changeScene(FileHost, (el) => {
    const input = query<HTMLInputElement>(el, 'input[type=file]');
    const transfer = new DataTransfer();
    transfer.items.add(new File(['xyz'], 'plan.pdf', { type: 'application/pdf', lastModified: 1 }));
    input.files = transfer.files;
    input.dispatchEvent(CHANGE());
  });
  assert.equal(r.heard, 1);
  assert.equal(r.vals.length, 1);
  assert.deepEqual((r.vals[0] as { names: unknown }).names, ['plan.pdf']);
});

@Component({ selector: 'nr-pinhost', standalone: true, imports: [ArenaPinInput], template: `<arena-pin-input label="Code" [length]="4" (valueChange)="vals.push($event)" />` })
class PinHost { vals: unknown[] = []; }

test('ArenaPinInput: a cell\'s change reaches the document', async () => {
  const r = await changeScene(PinHost, (el) => {
    const cell = query<HTMLInputElement>(el, 'input');
    typeInto(cell, '4');
    cell.dispatchEvent(CHANGE());
  });
  assert.equal(r.heard, 1);
  assert.deepEqual(r.vals, ['4']);
  assert.equal(typeof r.vals[0], 'string');
});

@Component({
  selector: 'nr-segmentedhost',
  standalone: true,
  imports: [ArenaSegmentedControl],
  template: `<arena-segmented-control ariaLabel="View" [options]="options" (valueChange)="vals.push($event)" />`,
})
class SegmentedHost { readonly options = [{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }]; vals: unknown[] = []; }

test('ArenaSegmentedControl: an option\'s change reaches the document', async () => {
  const r = await changeScene(SegmentedHost, (el) => {
    const radios = el.querySelectorAll<HTMLInputElement>('input[type=radio]');
    assert.ok(radios[1], 'the option did not render');
    radios[1].dispatchEvent(CHANGE());
  });
  assert.equal(r.heard, 1);
  assert.deepEqual(r.vals, ['grid']);
  assert.equal(typeof r.vals[0], 'string');
});

@Component({ selector: 'nr-paginationhost', standalone: true, imports: [ArenaPagination], template: `<arena-pagination ariaLabel="Pages" [page]="1" [pageCount]="5" (valueChange)="vals.push($event)" />` })
class PaginationHost { vals: unknown[] = []; }

test('ArenaPagination: valueChange reports a move and no native change exists to stop (N2)', async () => {
  const r = await changeScene(PaginationHost, (el) => {
    const buttons = [...el.querySelectorAll<HTMLButtonElement>('nav button')].filter((b) => b.textContent?.trim() === '2');
    assert.ok(buttons[0], 'page 2 did not render');
    buttons[0].click();
  });
  assert.equal(r.heard, 0);
  assert.deepEqual(r.vals, [2]);
  assert.equal(typeof r.vals[0], 'number');
});

@Component({
  selector: 'nr-stepperhost',
  standalone: true,
  imports: [ArenaStepper],
  template: `<arena-stepper ariaLabel="Checkout" [steps]="steps" [index]="2" [interactive]="true" (valueChange)="vals.push($event)" />`,
})
class StepperHost { readonly steps = [{ label: 'Account' }, { label: 'Shipping' }, { label: 'Payment' }]; vals: unknown[] = []; }

test('ArenaStepper: valueChange reports a move and no native change exists to stop (N2)', async () => {
  const r = await changeScene(StepperHost, (el) => {
    const buttons = el.querySelectorAll<HTMLButtonElement>('button');
    assert.ok(buttons[0], 'the earlier step did not render');
    buttons[0].click();
  });
  assert.equal(r.heard, 0);
  assert.deepEqual(r.vals, [0]);
  assert.equal(typeof r.vals[0], 'number');
});

@Component({ selector: 'nr-sliderhost', standalone: true, imports: [ArenaSlider], template: `<arena-slider label="Volume" [min]="0" [max]="100" [step]="1" [value]="20" (valueChange)="vals.push($event)" />` })
class SliderHost { vals: unknown[] = []; }

test('ArenaSlider: valueChange reports a move and no native change exists to stop (N2)', async () => {
  const r = await changeScene(SliderHost, (el) => {
    query(el, '[role="slider"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  });
  assert.equal(r.heard, 0);
  assert.deepEqual(r.vals, [21]);
  assert.equal(typeof r.vals[0], 'number');
});

@Component({
  selector: 'nr-ownboxhost',
  standalone: true,
  imports: [ArenaCheckboxGroup, ArenaCheckbox],
  template: `<arena-checkbox-group ariaLabel="Alerts" (valueChange)="vals.push($event)">
    <arena-checkbox value="a" label="A" (valueChange)="own.push($event)" />
  </arena-checkbox-group>`,
})
class OwnBoxHost { vals: unknown[] = []; own: boolean[] = []; }

test('ArenaCheckboxGroup: a box keeps its own onValueChange and the group reports the set (N1)', async () => {
  let own: boolean[] = [];
  const r = await changeScene(OwnBoxHost, (el, fixture) => {
    query<HTMLInputElement>(el, 'input[type=checkbox]').click();
    own = fixture.componentInstance.own;
  });
  assert.equal(r.heard, 1);
  assert.deepEqual(own, [true]);
  assert.deepEqual(r.vals, [{ values: ['a'] }]);
});
