/* What the selection does once files arrive: a pick or a drop runs through the paired rules, the
 * hidden input is rewritten to hold exactly the chips, change and reject fire, a chip's remove and
 * the class methods act on the same list, and a form reset or a native refusal reaches it. happy-dom
 * opens no picker, so a pick is the files assigned to the input and a change dispatched. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaFileRejection, ArenaFileSelection } from '../../../Api.generated';
import { ArenaFileInput } from './ArenaFileInput';

@Component({
  standalone: true,
  imports: [ArenaFileInput],
  template: `<form><arena-file-input label="Attach a document" name="docs" [multiple]="multiple" [droppable]="droppable"
                     [disabled]="disabled" [required]="required" [accept]="accept" [maxSize]="maxSize"
                     (change)="changes.push($event)" (reject)="rejections.push($event)" /></form>`,
})
class Host {
  readonly field = viewChild.required(ArenaFileInput);
  multiple = false;
  droppable = false;
  disabled = false;
  required = false;
  accept: string | undefined = undefined;
  maxSize: number | undefined = undefined;
  changes: ArenaFileSelection[] = [];
  rejections: ArenaFileRejection[] = [];
}

const pdf = (name: string, bytes = 3, lastModified = 1) => new File(['x'.repeat(bytes)], name, { type: 'application/pdf', lastModified });
const png = (name: string, bytes = 3) => new File(['x'.repeat(bytes)], name, { type: 'image/png', lastModified: 1 });

function render(patch: Partial<Host> = {}) {
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector('input[type="file"]') as HTMLInputElement;
  const trigger = root.querySelector('[data-arena-part="file-input.trigger"]') as HTMLButtonElement;
  const zone = root.querySelector('[data-arena-part="file-input.zone"]') as HTMLElement;
  const chips = () => [...root.querySelectorAll('[data-arena-part="file-input.file"] arena-tag > span[id]')].map((text) => text.textContent?.trim());
  const held = () => [...(input.files ?? [])].map((file) => file.name);
  const pick = (...files: File[]) => {
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  };
  const drag = (type: string, files: File[], kinds = ['Files']) => {
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(event, 'dataTransfer', { value: { files: transfer.files, types: kinds, dropEffect: 'copy' } });
    zone.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };
  return { fixture, root, input, trigger, zone, chips, held, pick, drag, host: fixture.componentInstance };
}

test('a pick is held, shown as a chip with its size, written back to the input and reported', () => {
  const view = render();
  try {
    view.pick(pdf('passport.pdf', 1500));
    assert.deepEqual(view.chips(), ['passport.pdf']);
    assert.deepEqual(view.held(), ['passport.pdf']);
    assert.deepEqual(view.host.changes, [{ names: ['passport.pdf'], sizes: [1500], types: ['application/pdf'] }]);
    assert.equal(view.root.querySelector('[data-arena-part="file-input.size"]')?.textContent?.trim(), '1.5 kB');
    assert.equal(view.root.querySelector('[role="status"]')?.textContent?.trim(), '1 selected');
  } finally { view.fixture.destroy(); }
});

test('the held files sit in a list that keeps its role where the list style is none', () => {
  const view = render();
  try {
    view.pick(pdf('passport.pdf'));
    const list = view.root.querySelector('[data-arena-part="file-input.files"]');
    assert.equal(list?.tagName, 'UL');
    assert.equal(list?.getAttribute('role'), 'list');
  } finally { view.fixture.destroy(); }
});

test('the rejected files sit in a list that keeps its role where the list style is none', () => {
  const view = render({ accept: '.pdf' });
  try {
    view.pick(png('photo.png'));
    const list = view.root.querySelector('[data-arena-part="file-input.rejected"]');
    assert.equal(list?.tagName, 'UL');
    assert.equal(list?.getAttribute('role'), 'list');
  } finally { view.fixture.destroy(); }
});

test('with multiple a second pick appends, and a file already held is held once', () => {
  const view = render({ multiple: true });
  try {
    view.pick(pdf('a.pdf'));
    view.pick(pdf('a.pdf'), pdf('b.pdf'));
    assert.deepEqual(view.chips(), ['a.pdf', 'b.pdf']);
    assert.deepEqual(view.held(), ['a.pdf', 'b.pdf']);
    assert.equal(view.host.changes.length, 2);
  } finally { view.fixture.destroy(); }
});

test('without multiple a second pick replaces the first', () => {
  const view = render();
  try {
    view.pick(pdf('a.pdf'));
    view.pick(pdf('b.pdf'));
    assert.deepEqual(view.chips(), ['b.pdf']);
    assert.deepEqual(view.held(), ['b.pdf']);
  } finally { view.fixture.destroy(); }
});

test('a refused file is never held, is said in its own line, and reject carries it by reason', () => {
  const view = render({ accept: '.pdf', maxSize: 10, multiple: true });
  try {
    view.pick(png('photo.png'), pdf('big.pdf', 11), pdf('ok.pdf', 10));
    assert.deepEqual(view.held(), ['ok.pdf']);
    assert.deepEqual(view.host.rejections, [{ tooLarge: ['big.pdf'], wrongType: ['photo.png'], surplus: [] }]);
    const lines = [...view.root.querySelectorAll('[data-arena-part="file-input.rejection"]')].map((li) => li.textContent?.trim());
    assert.deepEqual(lines, ['big.pdf is larger than 10 B', 'photo.png is not an accepted type']);
  } finally { view.fixture.destroy(); }
});

test('a pick that holds nothing fires reject and no change, and reject never fires empty', () => {
  const view = render({ accept: '.pdf' });
  try {
    view.pick(png('photo.png'));
    assert.equal(view.host.changes.length, 0);
    assert.equal(view.host.rejections.length, 1);
    view.pick(pdf('a.pdf'));
    assert.equal(view.host.rejections.length, 1);
  } finally { view.fixture.destroy(); }
});

test('a droppable zone takes a drop of files, and marks itself while one is over it', () => {
  const view = render({ droppable: true, multiple: true });
  try {
    assert.equal(view.drag('dragenter', []).defaultPrevented, true);
    assert.ok(view.zone.hasAttribute('data-arena-dragging'));
    assert.equal(view.drag('drop', [pdf('a.pdf'), pdf('b.pdf')]).defaultPrevented, true);
    assert.equal(view.zone.hasAttribute('data-arena-dragging'), false);
    assert.deepEqual(view.held(), ['a.pdf', 'b.pdf']);
  } finally { view.fixture.destroy(); }
});

test('a single-file zone holds the first file of a drop and refuses the rest as surplus', () => {
  const view = render({ droppable: true });
  try {
    view.drag('drop', [pdf('a.pdf'), pdf('b.pdf')]);
    assert.deepEqual(view.held(), ['a.pdf']);
    assert.deepEqual(view.host.rejections, [{ tooLarge: [], wrongType: [], surplus: ['b.pdf'] }]);
  } finally { view.fixture.destroy(); }
});

test('without droppable the field cancels no drag, so a drop is the browser\'s', () => {
  const view = render();
  try {
    assert.equal(view.drag('dragover', []).defaultPrevented, false);
    assert.equal(view.drag('drop', [pdf('a.pdf')]).defaultPrevented, false);
    assert.deepEqual(view.held(), []);
  } finally { view.fixture.destroy(); }
});

test('a drag carrying no file is left alone', () => {
  const view = render({ droppable: true });
  try {
    assert.equal(view.drag('dragover', [], ['text/plain']).defaultPrevented, false);
  } finally { view.fixture.destroy(); }
});

test('a disabled zone still cancels a drop, so the page does not navigate, and holds nothing', () => {
  const view = render({ droppable: true, disabled: true });
  try {
    assert.equal(view.drag('drop', [pdf('a.pdf')]).defaultPrevented, true);
    assert.deepEqual(view.held(), []);
  } finally { view.fixture.destroy(); }
});

test('a chip\'s remove drops that file from the chips and the input, reports, and returns focus to the trigger', () => {
  const view = render({ multiple: true });
  try {
    view.pick(pdf('a.pdf'), pdf('b.pdf'));
    (view.root.querySelectorAll('[data-arena-part="tag.close"]')[0] as HTMLButtonElement).click();
    view.fixture.detectChanges();
    assert.deepEqual(view.chips(), ['b.pdf']);
    assert.deepEqual(view.held(), ['b.pdf']);
    assert.deepEqual(view.host.changes.at(-1), { names: ['b.pdf'], sizes: [3], types: ['application/pdf'] });
    assert.equal(view.root.ownerDocument.activeElement, view.trigger);
  } finally { view.fixture.destroy(); }
});

test('a chip\'s remove is named by the remove word and the file it removes', () => {
  const view = render();
  try {
    view.pick(pdf('passport.pdf'));
    const remove = view.root.querySelector('[data-arena-part="tag.close"]') as HTMLButtonElement;
    const name = (remove.getAttribute('aria-labelledby') ?? '').split(' ')
      .map((id) => view.root.ownerDocument.getElementById(id)?.textContent?.trim()).join(' ');
    assert.equal(name, 'Remove passport.pdf');
  } finally { view.fixture.destroy(); }
});

test('files() hands back the File objects held, and clear() empties everything and fires nothing', () => {
  const view = render({ multiple: true });
  try {
    const a = pdf('a.pdf');
    view.pick(a);
    assert.equal(view.host.field().files()[0], a);
    const fired = view.host.changes.length;
    view.host.field().clear();
    view.fixture.detectChanges();
    assert.deepEqual(view.chips(), []);
    assert.deepEqual(view.held(), []);
    assert.equal(view.host.changes.length, fired);
  } finally { view.fixture.destroy(); }
});

test('a native submission carries exactly the chips', () => {
  const view = render({ multiple: true });
  try {
    view.pick(pdf('a.pdf'), pdf('b.pdf'));
    const form = view.root.querySelector('form') as HTMLFormElement;
    assert.deepEqual(new FormData(form).getAll('docs').map((one) => (one as File).name), ['a.pdf', 'b.pdf']);
  } finally { view.fixture.destroy(); }
});

test('the containing form\'s reset empties the selection and fires nothing', () => {
  const view = render({ multiple: true });
  try {
    view.pick(pdf('a.pdf'));
    const fired = view.host.changes.length;
    (view.root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('reset', { bubbles: true, cancelable: true }));
    view.fixture.detectChanges();
    assert.deepEqual(view.chips(), []);
    assert.deepEqual(view.held(), []);
    assert.deepEqual(view.host.field().files(), []);
    assert.equal(view.host.changes.length, fired);
  } finally { view.fixture.destroy(); }
});

test('a form reset a script asks for empties the input too, and fires nothing', () => {
  const view = render({ multiple: true });
  try {
    view.pick(pdf('a.pdf'));
    const fired = view.host.changes.length;
    (view.root.querySelector('form') as HTMLFormElement).reset();
    view.fixture.detectChanges();
    assert.deepEqual(view.chips(), []);
    assert.deepEqual(view.held(), []);
    assert.equal(view.host.changes.length, fired);
  } finally { view.fixture.destroy(); }
});

test('a reset a listener cancels still leaves the chips and the input empty', () => {
  const view = render({ multiple: true });
  try {
    view.pick(pdf('a.pdf'));
    const form = view.root.querySelector('form') as HTMLFormElement;
    form.addEventListener('reset', (event) => event.preventDefault());
    form.dispatchEvent(new Event('reset', { bubbles: true, cancelable: true }));
    view.fixture.detectChanges();
    assert.deepEqual(view.chips(), []);
    assert.deepEqual(view.held(), []);
  } finally { view.fixture.destroy(); }
});

test('the same file picked again without multiple reports no change', () => {
  const view = render();
  try {
    view.pick(pdf('a.pdf'));
    view.pick(pdf('a.pdf'));
    assert.equal(view.host.changes.length, 1);
    assert.deepEqual(view.chips(), ['a.pdf']);
    assert.deepEqual(view.held(), ['a.pdf']);
  } finally { view.fixture.destroy(); }
});

test('a pick of no file leaves the input holding exactly the chips and fires nothing', () => {
  const view = render({ multiple: true });
  try {
    view.pick(pdf('a.pdf'));
    view.pick();
    assert.deepEqual(view.chips(), ['a.pdf']);
    assert.deepEqual(view.held(), ['a.pdf']);
    assert.equal(view.host.changes.length, 1);
    assert.equal(view.host.rejections.length, 0);
  } finally { view.fixture.destroy(); }
});

test('two refused files with the same name and reason are two lines and warn of no duplicate track key', () => {
  const warned: string[] = [];
  const originals = { warn: console.warn, error: console.error };
  const spy = (...args: unknown[]) => { warned.push(args.map(String).join(' ')); };
  console.warn = spy;
  console.error = spy;
  const view = render({ accept: '.pdf', multiple: true });
  try {
    view.pick(png('first.png'));
    view.pick(png('scan.png'), png('scan.png'));
    const lines = [...view.root.querySelectorAll('[data-arena-part="file-input.rejection"]')].map((li) => li.textContent?.trim());
    assert.deepEqual(lines, ['scan.png is not an accepted type', 'scan.png is not an accepted type']);
  } finally {
    console.warn = originals.warn;
    console.error = originals.error;
    view.fixture.destroy();
  }
  assert.deepEqual(warned.filter((text) => /NG0955/.test(text)), []);
});

test('a native refusal of an empty required field hands focus to the trigger', () => {
  const view = render({ required: true });
  try {
    view.input.dispatchEvent(new Event('invalid', { cancelable: true }));
    assert.equal(view.root.ownerDocument.activeElement, view.trigger);
    (view.root.ownerDocument.body as HTMLElement).focus();
    view.input.focus();
    assert.equal(view.root.ownerDocument.activeElement, view.trigger);
  } finally { view.fixture.destroy(); }
});
