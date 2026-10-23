/* The one platform call the selection rests on: a list built through a DataTransfer and assigned to
 * a file input's files, so native submission carries exactly the files shown. happy-dom stores what
 * is assigned without checking it and hands back a plain array from DataTransfer.files, so this
 * holds what the component relies on (the length, each name, FormData, no event fired) and never
 * the list's class. A real browser is the by-hand list's. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { arenaWriteInputFiles } from './FileRules.ts';

afterEach(() => { document.body.innerHTML = ''; });

function field() {
  const form = document.createElement('form');
  const input = document.createElement('input');
  input.type = 'file';
  input.name = 'documents';
  input.multiple = true;
  form.appendChild(input);
  document.body.appendChild(form);
  return { form, input };
}

test('a DataTransfer can be built here, and refuses anything that is not a File', () => {
  const transfer = new DataTransfer();
  transfer.items.add(new File(['a'], 'a.pdf', { type: 'application/pdf' }));
  assert.equal(transfer.files.length, 1);
  assert.throws(() => transfer.items.add('a string' as unknown as File));
});

test('the files written are the files the input holds, in order', () => {
  const { input } = field();
  const a = new File(['a'], 'a.pdf', { type: 'application/pdf' });
  const b = new File(['bb'], 'b.png', { type: 'image/png' });
  arenaWriteInputFiles(input, [a, b]);
  assert.equal(input.files?.length, 2);
  assert.deepEqual([...(input.files ?? [])].map((one) => one.name), ['a.pdf', 'b.png']);
});

test('a form submitted from here carries exactly the files written, under the input name', () => {
  const { form, input } = field();
  arenaWriteInputFiles(input, [new File(['a'], 'a.pdf'), new File(['b'], 'b.pdf')]);
  const sent = new FormData(form).getAll('documents').map((one) => (one as File).name);
  assert.deepEqual(sent, ['a.pdf', 'b.pdf']);
  arenaWriteInputFiles(input, [new File(['b'], 'b.pdf')]);
  assert.deepEqual(new FormData(form).getAll('documents').map((one) => (one as File).name), ['b.pdf']);
});

test('writing an empty list empties the input', () => {
  const { input } = field();
  arenaWriteInputFiles(input, [new File(['a'], 'a.pdf')]);
  arenaWriteInputFiles(input, []);
  assert.equal(input.files?.length, 0);
});

test('writing the files fires no change and no input event, so a write never reads as a pick', () => {
  const { input } = field();
  const fired: string[] = [];
  input.addEventListener('change', () => fired.push('change'));
  input.addEventListener('input', () => fired.push('input'));
  arenaWriteInputFiles(input, [new File(['a'], 'a.pdf')]);
  assert.deepEqual(fired, []);
});
