/* What the selection does once files arrive: a pick or a drop runs through the paired rules,
 * the hidden input is rewritten to hold exactly the chips, change and reject fire, a chip's remove
 * and the handle act on the same list, and a form reset or a native refusal reaches it. happy-dom
 * opens no picker, so a pick is the files assigned to the input and a change dispatched, which is
 * what the browser does once the picker closes. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import type { ArenaFileRejection, ArenaFileSelection } from '../../../Api.generated';
import { ArenaFileInput, type ArenaFileInputHandle, type ArenaFileInputProps } from './ArenaFileInput.tsx';

afterEach(cleanup);

const pdf = (name: string, bytes = 3, lastModified = 1) => new File(['x'.repeat(bytes)], name, { type: 'application/pdf', lastModified });
const png = (name: string, bytes = 3) => new File(['x'.repeat(bytes)], name, { type: 'image/png', lastModified: 1 });

function render(props: Partial<ArenaFileInputProps> = {}, inForm = false) {
  const changes: ArenaFileSelection[] = [];
  const rejections: ArenaFileRejection[] = [];
  const handle = React.createRef<ArenaFileInputHandle>();
  const field = (
    <ArenaFileInput ref={handle} label="Attach a document" name="docs"
      onChange={(selection) => changes.push(selection)} onReject={(rejection) => rejections.push(rejection)} {...props} />
  );
  const root = mount(inForm ? <form>{field}</form> : field);
  const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
  const trigger = root.querySelector<HTMLButtonElement>('[data-arena-part="file-input.trigger"]')!;
  const zone = root.querySelector<HTMLElement>('[data-arena-part="file-input.zone"]')!;
  const chips = () => [...root.querySelectorAll('[data-arena-part="file-input.file"]')].map((li) => li.querySelector('[data-arena-part="tag"] > span[id]')?.textContent?.trim());
  const held = () => [...(input.files ?? [])].map((file) => file.name);
  const pick = (...files: File[]) => {
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    act(() => {
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };
  const drag = (type: string, files: File[], kinds = ['Files']) => {
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(event, 'dataTransfer', { value: { files: transfer.files, types: kinds, dropEffect: 'copy' } });
    act(() => { zone.dispatchEvent(event); });
    return event;
  };
  return { root, input, trigger, zone, chips, held, pick, drag, changes, rejections, handle };
}

test('a pick is held, shown as a chip with its size, written back to the input and reported', () => {
  const view = render();
  view.pick(pdf('passport.pdf', 1500));
  assert.deepEqual(view.chips(), ['passport.pdf']);
  assert.deepEqual(view.held(), ['passport.pdf']);
  assert.deepEqual(view.changes, [{ names: ['passport.pdf'], sizes: [1500], types: ['application/pdf'] }]);
  assert.match(view.root.querySelector('[data-arena-part="file-input.size"]')?.textContent ?? '', /^1\.5 kB$/);
  assert.equal(view.root.querySelector('[role="status"]')?.textContent, '1 selected');
});

test('the held files sit in a list that keeps its role where the list style is none', () => {
  const view = render();
  view.pick(pdf('passport.pdf'));
  const list = view.root.querySelector('[data-arena-part="file-input.files"]');
  assert.equal(list?.tagName, 'UL');
  assert.equal(list?.getAttribute('role'), 'list');
});

test('the rejected files sit in a list that keeps its role where the list style is none', () => {
  const view = render({ accept: '.pdf' });
  view.pick(png('photo.png'));
  const list = view.root.querySelector('[data-arena-part="file-input.rejected"]');
  assert.equal(list?.tagName, 'UL');
  assert.equal(list?.getAttribute('role'), 'list');
});

test('with multiple a second pick appends, and a file already held is held once', () => {
  const view = render({ multiple: true });
  view.pick(pdf('a.pdf'));
  view.pick(pdf('a.pdf'), pdf('b.pdf'));
  assert.deepEqual(view.chips(), ['a.pdf', 'b.pdf']);
  assert.deepEqual(view.held(), ['a.pdf', 'b.pdf']);
  assert.equal(view.changes.length, 2);
});

test('without multiple a second pick replaces the first', () => {
  const view = render();
  view.pick(pdf('a.pdf'));
  view.pick(pdf('b.pdf'));
  assert.deepEqual(view.chips(), ['b.pdf']);
  assert.deepEqual(view.held(), ['b.pdf']);
});

test('a refused file is never held, is said in its own line, and reject carries it by reason', () => {
  const view = render({ accept: '.pdf', maxSize: 10, multiple: true });
  view.pick(png('photo.png'), pdf('big.pdf', 11), pdf('ok.pdf', 10));
  assert.deepEqual(view.held(), ['ok.pdf']);
  assert.deepEqual(view.rejections, [{ tooLarge: ['big.pdf'], wrongType: ['photo.png'], surplus: [] }]);
  const lines = [...view.root.querySelectorAll('[data-arena-part="file-input.rejection"]')].map((li) => li.textContent);
  assert.deepEqual(lines, ['big.pdf is larger than 10 B', 'photo.png is not an accepted type']);
  assert.match(view.root.querySelector('[role="status"]')?.textContent ?? '', /^1 selected big\.pdf is larger/);
});

test('a pick that holds nothing fires reject and no change, and reject never fires empty', () => {
  const view = render({ accept: '.pdf' });
  view.pick(png('photo.png'));
  assert.equal(view.changes.length, 0);
  assert.equal(view.rejections.length, 1);
  view.pick(pdf('a.pdf'));
  assert.equal(view.rejections.length, 1, 'a pick that refused nothing fired reject');
});

test('a droppable zone takes a drop of files, and marks itself while one is over it', () => {
  const view = render({ droppable: true, multiple: true });
  const over = view.drag('dragenter', []);
  assert.equal(over.defaultPrevented, true);
  assert.ok(view.zone.hasAttribute('data-arena-dragging'));
  const dropped = view.drag('drop', [pdf('a.pdf'), pdf('b.pdf')]);
  assert.equal(dropped.defaultPrevented, true, 'an uncancelled drop opens the file in the browser');
  assert.equal(view.zone.hasAttribute('data-arena-dragging'), false);
  assert.deepEqual(view.held(), ['a.pdf', 'b.pdf']);
});

test('a single-file zone holds the first file of a drop and refuses the rest as surplus', () => {
  const view = render({ droppable: true });
  view.drag('drop', [pdf('a.pdf'), pdf('b.pdf')]);
  assert.deepEqual(view.held(), ['a.pdf']);
  assert.deepEqual(view.rejections, [{ tooLarge: [], wrongType: [], surplus: ['b.pdf'] }]);
});

test('without droppable the field cancels no drag, so a drop is the browser\'s', () => {
  const view = render();
  assert.equal(view.drag('dragover', []).defaultPrevented, false);
  assert.equal(view.drag('drop', [pdf('a.pdf')]).defaultPrevented, false);
  assert.deepEqual(view.held(), []);
});

test('a drag carrying no file is left alone', () => {
  const view = render({ droppable: true });
  assert.equal(view.drag('dragover', [], ['text/plain']).defaultPrevented, false);
});

test('a disabled zone still cancels a drop, so the page does not navigate, and holds nothing', () => {
  const view = render({ droppable: true, disabled: true });
  assert.equal(view.drag('drop', [pdf('a.pdf')]).defaultPrevented, true);
  assert.deepEqual(view.held(), []);
});

test('a chip\'s remove drops that file from the chips and the input, reports, and returns focus to the trigger', () => {
  const view = render({ multiple: true });
  view.pick(pdf('a.pdf'), pdf('b.pdf'));
  const remove = view.root.querySelectorAll<HTMLButtonElement>('[data-arena-part="tag.close"]')[0]!;
  act(() => { remove.click(); });
  assert.deepEqual(view.chips(), ['b.pdf']);
  assert.deepEqual(view.held(), ['b.pdf']);
  assert.deepEqual(view.changes.at(-1), { names: ['b.pdf'], sizes: [3], types: ['application/pdf'] });
  assert.equal(view.root.ownerDocument.activeElement, view.trigger);
});

test('a chip\'s remove is named by the remove word and the file it removes', () => {
  const view = render();
  view.pick(pdf('passport.pdf'));
  const remove = view.root.querySelector<HTMLButtonElement>('[data-arena-part="tag.close"]')!;
  const name = (remove.getAttribute('aria-labelledby') ?? '').split(' ')
    .map((id) => view.root.ownerDocument.getElementById(id)?.textContent?.trim()).join(' ');
  assert.equal(name, 'Remove passport.pdf');
});

test('the handle hands back the File objects held, and clear empties everything and fires nothing', () => {
  const view = render({ multiple: true });
  const a = pdf('a.pdf');
  view.pick(a);
  assert.equal(view.handle.current!.files()[0], a);
  const fired = view.changes.length;
  act(() => { view.handle.current!.clear(); });
  assert.deepEqual(view.chips(), []);
  assert.deepEqual(view.held(), []);
  assert.equal(view.changes.length, fired);
  assert.deepEqual(view.handle.current!.files(), []);
});

test('a native submission carries exactly the chips', () => {
  const view = render({ multiple: true }, true);
  view.pick(pdf('a.pdf'), pdf('b.pdf'));
  const form = view.root.querySelector('form')!;
  assert.deepEqual(new FormData(form).getAll('docs').map((one) => (one as File).name), ['a.pdf', 'b.pdf']);
});

test('the containing form\'s reset empties the selection and fires nothing', () => {
  const view = render({ multiple: true }, true);
  view.pick(pdf('a.pdf'));
  const fired = view.changes.length;
  act(() => { view.root.querySelector('form')!.dispatchEvent(new Event('reset', { bubbles: true, cancelable: true })); });
  assert.deepEqual(view.chips(), []);
  assert.deepEqual(view.held(), []);
  assert.deepEqual(view.handle.current!.files(), []);
  assert.equal(view.changes.length, fired);
});

test('a form reset a script asks for empties the input too, and fires nothing', () => {
  const view = render({ multiple: true }, true);
  view.pick(pdf('a.pdf'));
  const fired = view.changes.length;
  act(() => { view.root.querySelector('form')!.reset(); });
  assert.deepEqual(view.chips(), []);
  assert.deepEqual(view.held(), []);
  assert.equal(view.changes.length, fired);
});

test('a reset a listener cancels still leaves the chips and the input empty', () => {
  const view = render({ multiple: true }, true);
  view.pick(pdf('a.pdf'));
  const form = view.root.querySelector('form')!;
  form.addEventListener('reset', (event) => event.preventDefault());
  act(() => { form.dispatchEvent(new Event('reset', { bubbles: true, cancelable: true })); });
  assert.deepEqual(view.chips(), []);
  assert.deepEqual(view.held(), []);
});

test('the same file picked again without multiple reports no change', () => {
  const view = render();
  view.pick(pdf('a.pdf'));
  view.pick(pdf('a.pdf'));
  assert.equal(view.changes.length, 1);
  assert.deepEqual(view.chips(), ['a.pdf']);
  assert.deepEqual(view.held(), ['a.pdf']);
});

test('a pick of no file leaves the input holding exactly the chips and fires nothing', () => {
  const view = render({ multiple: true });
  view.pick(pdf('a.pdf'));
  view.pick();
  assert.deepEqual(view.chips(), ['a.pdf']);
  assert.deepEqual(view.held(), ['a.pdf']);
  assert.equal(view.changes.length, 1);
  assert.equal(view.rejections.length, 0);
});

test('two refused files with the same name and reason are two lines and warn of no duplicate key', () => {
  const warned: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { warned.push(args.map(String).join(' ')); };
  try {
    const view = render({ accept: '.pdf', multiple: true });
    view.pick(png('scan.png'), png('scan.png'));
    const lines = [...view.root.querySelectorAll('[data-arena-part="file-input.rejection"]')].map((li) => li.textContent);
    assert.deepEqual(lines, ['scan.png is not an accepted type', 'scan.png is not an accepted type']);
  } finally { console.error = original; }
  assert.deepEqual(warned.filter((text) => /same key|unique "key"/.test(text)), []);
});

test('a native refusal of an empty required field hands focus to the trigger', () => {
  const view = render({ required: true });
  act(() => { view.input.dispatchEvent(new Event('invalid', { cancelable: true })); });
  assert.equal(view.root.ownerDocument.activeElement, view.trigger);
  act(() => { view.root.ownerDocument.body.focus(); });
  act(() => { view.input.focus(); });
  assert.equal(view.root.ownerDocument.activeElement, view.trigger, 'the hidden input passed focus on to nobody');
});
