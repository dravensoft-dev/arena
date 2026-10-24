/* The acceptance table for native events: each row dispatches one native event on the named inner
 * element and counts what the document hears against what the Arena member reports. A native
 * button that is disabled or loading is delivered no click, so its document count is 0. A text
 * control is edited with an input event first, as its own suite does, and the change follows. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from './Harness.tsx';
import { ArenaCard } from '../components/display/arena-card/ArenaCard.tsx';
import { ArenaButton } from '../components/forms/arena-button/ArenaButton.tsx';
import { ArenaIconButton } from '../components/forms/arena-icon-button/ArenaIconButton.tsx';
import { ArenaSplitButton } from '../components/forms/arena-split-button/ArenaSplitButton.tsx';
import { ArenaTable } from '../components/display/arena-table/ArenaTable.tsx';
import { ArenaTableRow } from '../components/display/arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../components/display/arena-table-cell/ArenaTableCell.tsx';
import { ArenaCalendar } from '../components/display/arena-calendar/ArenaCalendar.tsx';
import { ArenaCalendarEvent } from '../components/display/arena-calendar-event/ArenaCalendarEvent.tsx';
import { ArenaCheckbox } from '../components/forms/arena-checkbox/ArenaCheckbox.tsx';
import { ArenaCheckboxGroup } from '../components/forms/arena-checkbox-group/ArenaCheckboxGroup.tsx';
import { ArenaRadioGroup } from '../components/forms/arena-radio-group/ArenaRadioGroup.tsx';
import { ArenaRadio } from '../components/forms/arena-radio/ArenaRadio.tsx';
import { ArenaInput } from '../components/forms/arena-input/ArenaInput.tsx';
import { ArenaTextarea } from '../components/forms/arena-textarea/ArenaTextarea.tsx';
import { ArenaSelect } from '../components/forms/arena-select/ArenaSelect.tsx';
import { ArenaCombobox } from '../components/forms/arena-combobox/ArenaCombobox.tsx';
import { ArenaMultiSelect } from '../components/forms/arena-multi-select/ArenaMultiSelect.tsx';
import { ArenaNumberField } from '../components/forms/arena-number-field/ArenaNumberField.tsx';
import { ArenaFileInput } from '../components/forms/arena-file-input/ArenaFileInput.tsx';
import { ArenaPinInput } from '../components/forms/arena-pin-input/ArenaPinInput.tsx';
import { ArenaSegmentedControl } from '../components/navigation/arena-segmented-control/ArenaSegmentedControl.tsx';
import { ArenaPagination } from '../components/navigation/arena-pagination/ArenaPagination.tsx';
import { ArenaStepper } from '../components/navigation/arena-stepper/ArenaStepper.tsx';
import { ArenaSlider } from '../components/forms/arena-slider/ArenaSlider.tsx';

afterEach(cleanup);

const click = () => new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
const enter = () => new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });

function heardByDocument(el: Element, event: Event): number {
  let heard = 0;
  const count = () => { heard += 1; };
  document.addEventListener(event.type, count);
  try {
    act(() => { el.dispatchEvent(event); });
  } finally {
    document.removeEventListener(event.type, count);
  }
  return heard;
}

const part = (root: ParentNode, name: string) => root.querySelector<HTMLElement>(`[data-arena-part="${name}"]`)!;

test("ArenaCard: a click on a plain card's body reaches the document and activates nothing", () => {
  let n = 0;
  const root = mount(<ArenaCard title="Plain" onActivate={() => { n += 1; }}>Body</ArenaCard>);
  assert.equal(heardByDocument(part(root, 'card.body'), click()), 1);
  assert.equal(n, 0);
});

test('ArenaCard: a click on an interactive card reaches the document and activates once', () => {
  let n = 0;
  const root = mount(<ArenaCard title="Card" interactive onActivate={() => { n += 1; }}>Body</ArenaCard>);
  assert.equal(heardByDocument(part(root, 'card.body'), click()), 1);
  assert.equal(n, 1);
});

test('ArenaCard: a disabled interactive card hears the click and activates nothing', () => {
  let n = 0;
  const root = mount(<ArenaCard title="Card" interactive disabled onActivate={() => { n += 1; }}>Body</ArenaCard>);
  assert.equal(heardByDocument(root.firstElementChild!, click()), 1);
  assert.equal(n, 0);
});

test('ArenaCard: Enter on an interactive card reaches the document as a keydown (N3)', () => {
  let n = 0;
  const root = mount(<ArenaCard title="Card" interactive onActivate={() => { n += 1; }}>Body</ArenaCard>);
  assert.equal(heardByDocument(root.firstElementChild!, enter()), 1);
  assert.equal(n, 1);
});

test("ArenaCard: a click on the href card's anchor reaches the document and activates once", () => {
  let n = 0;
  const root = mount(<ArenaCard title="Card" href="/x" onActivate={() => { n += 1; }}>Body</ArenaCard>);
  assert.equal(heardByDocument(root.querySelector('a')!, click()), 1);
  assert.equal(n, 1);
});

test('ArenaButton: a click reaches the document and activates once', () => {
  const calls: unknown[][] = [];
  const root = mount(<ArenaButton onActivate={(...args: unknown[]) => { calls.push(args); }}>Go</ArenaButton>);
  assert.equal(heardByDocument(root.querySelector('button')!, click()), 1);
  assert.deepEqual(calls, [[]], 'activate carries no payload, and never the DOM event');
});

test('ArenaButton: a loading button hears the click and activates nothing', () => {
  let n = 0;
  const root = mount(<ArenaButton loading onActivate={() => { n += 1; }}>Go</ArenaButton>);
  assert.equal(heardByDocument(root.querySelector('button')!, click()), 0);
  assert.equal(n, 0);
});

test('ArenaIconButton: a click reaches the document and activates once', () => {
  const calls: unknown[][] = [];
  const root = mount(<ArenaIconButton icon="ph-bold ph-x" label="Close" onActivate={(...args: unknown[]) => { calls.push(args); }} />);
  assert.equal(heardByDocument(root.querySelector('button')!, click()), 1);
  assert.deepEqual(calls, [[]], 'activate carries no payload, and never the DOM event');
});

const split = (onActivate: () => void) => (
  <ArenaSplitButton label="Deploy" menuLabel="More deploy options" items={[{ label: 'Rollback' }]} onActivate={onActivate}>
    Deploy
  </ArenaSplitButton>
);

test('ArenaSplitButton: a click on the primary half reaches the document and activates once', () => {
  let n = 0;
  const root = mount(split(() => { n += 1; }));
  assert.equal(heardByDocument(part(root, 'split-button.primary'), click()), 1);
  assert.equal(n, 1);
});

test('ArenaSplitButton: a click on the caret reaches the document and activates nothing', () => {
  let n = 0;
  const root = mount(split(() => { n += 1; }));
  assert.equal(heardByDocument(part(root, 'split-button.caret'), click()), 1);
  assert.equal(n, 0);
});

test('ArenaTableRow: a click on a cell of an interactive row reaches the document and activates once', () => {
  let n = 0;
  const root = mount(
    <ArenaTable label="Services" responsive={false} columns={[{ header: 'Service' }, { header: 'Status' }]}>
      <ArenaTableRow interactive onActivate={() => { n += 1; }}>
        <ArenaTableCell>checkout</ArenaTableCell><ArenaTableCell>Healthy</ArenaTableCell>
      </ArenaTableRow>
    </ArenaTable>,
  );
  assert.equal(heardByDocument(root.querySelector('td')!, click()), 1);
  assert.equal(n, 1);
});

test('ArenaTableRow: Enter on an interactive card-layout row reaches the document as a keydown (N3)', () => {
  let n = 0;
  const root = mount(
    <table role="presentation"><tbody role="presentation">
      <ArenaTableRow layout="card" interactive columns={[{ header: 'Service' }]} onActivate={() => { n += 1; }}>
        <ArenaTableCell>checkout</ArenaTableCell>
      </ArenaTableRow>
    </tbody></table>,
  );
  assert.equal(heardByDocument(root.querySelector('tr')!, enter()), 1);
  assert.equal(n, 1);
});

const chip = (onActivate: () => void, extra: Record<string, unknown> = {}) => (
  <ArenaCalendar timeZone="UTC" anchorDate="2027-03-15" view="day" dayStart="09:00" dayEnd="11:00">
    <ArenaCalendarEvent id="a" title="Standup" start="2027-03-15T09:00:00Z" end="2027-03-15T10:00:00Z"
      colorId={1} interactive onActivate={onActivate} {...extra} />
  </ArenaCalendar>
);
const buttonNamed = (root: ParentNode, name: RegExp) =>
  [...root.querySelectorAll<HTMLElement>('button')].find((b) => name.test(b.getAttribute('aria-label') ?? ''))!;

test('ArenaCalendarEvent: a click on the chip stops at the chip, alike in both layers (D2)', () => {
  let n = 0;
  const root = mount(chip(() => { n += 1; }));
  assert.equal(heardByDocument(buttonNamed(root, /^Standup,/), click()), 0);
  assert.equal(n, 1);
});

test('ArenaCalendarEvent: a click on the body of a chip with a panel stops at the chip, alike in both layers (D2)', () => {
  let n = 0;
  const root = mount(chip(() => { n += 1; }, { actionsEnabled: true, actions: <button type="button">Delete</button> }));
  assert.equal(heardByDocument(buttonNamed(root, /^Standup,/), click()), 0);
  assert.equal(n, 1);
});

test('ArenaCalendarEvent: a press on the kebab opens the panel and does not activate the chip', () => {
  let n = 0;
  const root = mount(chip(() => { n += 1; }, { actionsEnabled: true, actions: <button type="button">Delete</button> }));
  assert.equal(root.textContent?.includes('Delete'), false);
  assert.equal(heardByDocument(buttonNamed(root, /^Actions$/), click()), 1);
  assert.equal(n, 0);
  assert.equal(root.textContent?.includes('Delete'), true, 'the kebab press did not open the panel');
});

function heardWhile(type: string, run: () => void): number {
  let heard = 0;
  const count = () => { heard += 1; };
  document.addEventListener(type, count);
  try { run(); } finally { document.removeEventListener(type, count); }
  return heard;
}

const nativeChange = () => new Event('change', { bubbles: true });
const REGIONS = [{ value: 'eu-west', label: 'Europe West' }, { value: 'us-east', label: 'US East' }];
const ENVS = [{ value: 'prod', label: 'Production' }, { value: 'stage', label: 'Staging' }];

function edit(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!;
  act(() => {
    setter.call(el, text);
    if (!(el instanceof HTMLSelectElement)) el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

test("ArenaCheckbox: a toggle's change reaches the document and valueChange carries the state", () => {
  const seen: unknown[] = [];
  const root = mount(<ArenaCheckbox label="Notify" checked={false} onValueChange={(v) => seen.push(v)} />);
  const box = root.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  assert.equal(heardWhile('change', () => act(() => { box.click(); })), 1);
  assert.deepEqual(seen, [true]);
  assert.equal(typeof seen[0], 'boolean');
});

test("ArenaCheckboxGroup: a box's change reaches the document and the group's valueChange runs once (N1)", () => {
  const sets: { values: readonly string[] }[] = [];
  const root = mount(
    <ArenaCheckboxGroup ariaLabel="Days" value={[]} onValueChange={(s) => sets.push(s)}>
      <ArenaCheckbox value="mon" label="Mon" /><ArenaCheckbox value="tue" label="Tue" />
    </ArenaCheckboxGroup>,
  );
  const box = root.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  assert.equal(heardWhile('change', () => act(() => { box.click(); })), 1);
  assert.deepEqual(sets.map((s) => s.values), [['mon']]);
  assert.ok(Array.isArray(sets[0]!.values));
});

test("ArenaRadioGroup: a radio's change reaches the document and the group's valueChange runs once (N1)", () => {
  const seen: unknown[] = [];
  const root = mount(
    <ArenaRadioGroup ariaLabel="Target" value="prod" name="env" onValueChange={(v) => seen.push(v)}>
      <ArenaRadio value="prod" label="Production" /><ArenaRadio value="stage" label="Staging" />
    </ArenaRadioGroup>,
  );
  const radio = root.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1]!;
  assert.equal(heardWhile('change', () => act(() => { radio.click(); })), 1);
  assert.deepEqual(seen, ['stage']);
  assert.equal(typeof seen[0], 'string');
});

test("ArenaInput: an edit's change reaches the document", () => {
  const seen: unknown[] = [];
  const root = mount(<ArenaInput label="Email" value="" onValueChange={(v) => seen.push(v)} />);
  const input = root.querySelector<HTMLInputElement>('input')!;
  edit(input, 'ana');
  assert.equal(heardByDocument(input, nativeChange()), 1);
  assert.deepEqual(seen, ['ana']);
  assert.equal(typeof seen[0], 'string');
});

test("ArenaTextarea: an edit's change reaches the document", () => {
  const seen: unknown[] = [];
  const root = mount(<ArenaTextarea label="Notes" value="" onValueChange={(v) => seen.push(v)} />);
  const area = root.querySelector<HTMLTextAreaElement>('textarea')!;
  edit(area, 'Shipped');
  assert.equal(heardByDocument(area, nativeChange()), 1);
  assert.deepEqual(seen, ['Shipped']);
  assert.equal(typeof seen[0], 'string');
});

test("ArenaSelect: a choice's change reaches the document", () => {
  const seen: unknown[] = [];
  const root = mount(<ArenaSelect label="Environment" value="prod" options={ENVS} onValueChange={(v) => seen.push(v)} />);
  const select = root.querySelector<HTMLSelectElement>('select')!;
  edit(select, 'stage');
  assert.equal(heardByDocument(select, nativeChange()), 1);
  assert.deepEqual(seen, ['stage']);
  assert.equal(typeof seen[0], 'string');
});

test('ArenaCombobox: the text field\'s change reaches the document and reports nothing by itself', () => {
  const seen: unknown[] = [];
  const root = mount(<ArenaCombobox label="Region" options={REGIONS} value="eu-west" onValueChange={(v) => seen.push(v)} />);
  assert.equal(heardByDocument(root.querySelector<HTMLInputElement>('[role="combobox"]')!, nativeChange()), 1);
  assert.equal(seen.length, 0);
});

test('ArenaMultiSelect: the text field\'s change reaches the document and reports nothing by itself', () => {
  const seen: unknown[] = [];
  const root = mount(<ArenaMultiSelect label="Regions" options={REGIONS} value={['eu-west']} onValueChange={(v) => seen.push(v)} />);
  assert.equal(heardByDocument(root.querySelector<HTMLInputElement>('[role="combobox"]')!, nativeChange()), 1);
  assert.equal(seen.length, 0);
});

test("ArenaNumberField: a commit's change reaches the document", () => {
  const seen: unknown[] = [];
  const root = mount(<ArenaNumberField label="Replicas" value={3} onValueChange={(v) => seen.push(v)} />);
  const input = root.querySelector<HTMLInputElement>('input[role="spinbutton"]')!;
  act(() => { input.focus(); });
  edit(input, '7');
  assert.equal(heardByDocument(input, nativeChange()), 1);
  assert.equal(seen.length, 0, 'a draft commits on Enter or blur, never on the native change');
  act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); });
  assert.deepEqual(seen, [7]);
  assert.equal(typeof seen[0], 'number');
});

test("ArenaFileInput: a pick's change reaches the document", () => {
  const seen: { names: readonly string[] }[] = [];
  const root = mount(<ArenaFileInput label="Attach" name="docs" onValueChange={(s) => seen.push(s)} />);
  const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
  const transfer = new DataTransfer();
  transfer.items.add(new File(['xyz'], 'passport.pdf', { type: 'application/pdf', lastModified: 1 }));
  input.files = transfer.files;
  assert.equal(heardByDocument(input, nativeChange()), 1);
  assert.deepEqual(seen.map((s) => s.names), [['passport.pdf']]);
});

test("ArenaPinInput: a cell's change reaches the document", () => {
  const seen: unknown[] = [];
  const root = mount(<ArenaPinInput label="Code" value="" onValueChange={(v) => seen.push(v)} />);
  const cell = root.querySelector<HTMLInputElement>('[data-arena-part="pin-input.cell"]')!;
  act(() => { cell.focus(); });
  edit(cell, '4');
  assert.equal(heardByDocument(cell, nativeChange()), 1);
  assert.deepEqual(seen, ['4']);
  assert.equal(typeof seen[0], 'string');
});

test("ArenaSegmentedControl: an option's change reaches the document", () => {
  const seen: unknown[] = [];
  const root = mount(
    <ArenaSegmentedControl ariaLabel="Range" name="range" value="24h" onValueChange={(v) => seen.push(v)}
      options={[{ value: '24h', label: '24 hours' }, { value: '7d', label: '7 days' }]} />,
  );
  const radio = root.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1]!;
  assert.equal(heardWhile('change', () => act(() => { radio.click(); })), 1);
  assert.deepEqual(seen, ['7d']);
  assert.equal(typeof seen[0], 'string');
});

test('ArenaPagination: valueChange reports a move and no native change exists to stop (N2)', () => {
  const seen: unknown[] = [];
  const root = mount(<ArenaPagination page={3} pageCount={12} ariaLabel="Deployments" onValueChange={(p) => seen.push(p)} />);
  const next = [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === '4')!;
  assert.equal(heardWhile('change', () => act(() => { next.click(); })), 0);
  assert.deepEqual(seen, [4]);
  assert.equal(typeof seen[0], 'number');
});

test('ArenaStepper: valueChange reports a move and no native change exists to stop (N2)', () => {
  const seen: unknown[] = [];
  const steps = [{ label: 'Account' }, { label: 'Shipping' }, { label: 'Payment' }, { label: 'Review' }];
  const root = mount(<ArenaStepper ariaLabel="Checkout" steps={steps} index={2} interactive onValueChange={(i) => seen.push(i)} />);
  const earlier = root.querySelectorAll<HTMLButtonElement>('button')[1]!;
  assert.equal(heardWhile('change', () => act(() => { earlier.click(); })), 0);
  assert.deepEqual(seen, [1]);
  assert.equal(typeof seen[0], 'number');
});

test('ArenaSlider: valueChange reports a move and no native change exists to stop (N2)', () => {
  const seen: unknown[] = [];
  const root = mount(<ArenaSlider label="Volume" value={40} onValueChange={(v) => seen.push(v)} />);
  const thumb = root.querySelector<HTMLElement>('[role="slider"]')!;
  const arrow = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
  assert.equal(heardWhile('change', () => act(() => { thumb.dispatchEvent(arrow); })), 0);
  assert.equal(seen.length, 1);
  assert.equal(typeof seen[0], 'number');
});

test('ArenaCheckboxGroup: a box keeps its own onValueChange and the group reports the set (N1)', () => {
  const own: boolean[] = []; const sets: string[][] = [];
  const host = mount(<ArenaCheckboxGroup ariaLabel="Days" value={[]} onValueChange={(s) => sets.push([...s.values])}>
    <ArenaCheckbox value="mon" label="Mon" onValueChange={(c) => own.push(c)} /></ArenaCheckboxGroup>);
  const box = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  assert.equal(heardWhile('change', () => act(() => { box.click(); })), 1);
  assert.deepEqual(own, [true]); assert.deepEqual(sets, [['mon']]);
});
