/* What a server renders before any file is chosen: the label, the trigger named by the label and its
 * own text, the hidden input that carries the files, the zone only when it takes a drop, and the
 * announcement that nothing is held. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaFileInput } from './ArenaFileInput.tsx';

const render = (node: React.ReactElement) => renderToStaticMarkup(node);

test('the trigger is a real button named by the label and then its own text', () => {
  const html = render(<ArenaFileInput label="Passport scan" />);
  assert.match(html, /<label id="fi-passport-scan-label" for="fi-passport-scan"/);
  assert.match(html, /<button type="button" id="fi-passport-scan" aria-labelledby="fi-passport-scan-label fi-passport-scan-text"/);
  assert.match(html, /<span id="fi-passport-scan-text">Choose file<\/span>/);
});

test('an id the consumer gives replaces the derived one, and the label and text ids follow it', () => {
  const html = render(<ArenaFileInput label="Passport scan" id="upload" />);
  assert.match(html, /aria-labelledby="upload-label upload-text"/);
  assert.match(html, /for="upload"/);
});

test('multiple changes the trigger text, and the hidden input takes every native attribute', () => {
  const html = render(<ArenaFileInput label="Documents" name="docs" accept=".pdf,image/*" multiple required />);
  assert.match(html, /Choose files/);
  const input = /<input[^>]*>/.exec(html)?.[0] ?? '';
  for (const attribute of ['type="file"', 'tabindex="-1"', 'aria-hidden="true"', 'name="docs"', 'accept=".pdf,image/*"', 'multiple=""', 'required=""'])
    assert.ok(input.includes(attribute), `the hidden input carries no ${attribute}: ${input}`);
});

test('the zone draws its prompt only when it takes a drop, and is the same slot either way', () => {
  const plain = render(<ArenaFileInput label="Passport scan" />);
  const zone = render(<ArenaFileInput label="Passport scan" droppable />);
  assert.match(plain, /data-arena-part="file-input.zone"/);
  assert.doesNotMatch(plain, /or drop here/);
  assert.match(zone, /data-arena-droppable/);
  assert.match(zone, /<span[^>]*data-arena-part="file-input.prompt"[^>]*>or drop here<\/span>/);
});

test('nothing held is announced, and no list is drawn', () => {
  const html = render(<ArenaFileInput label="Passport scan" />);
  assert.match(html, /<span role="status"[^>]*>No file chosen<\/span>/);
  assert.doesNotMatch(html, /file-input.files|file-input.rejected/);
});

test('an error replaces the hint and marks the zone', () => {
  const html = render(<ArenaFileInput label="Passport scan" hint="PDF only." error="Attach one file." />);
  assert.match(html, /Attach one file\./);
  assert.doesNotMatch(html, /PDF only\./);
  assert.match(html, /data-arena-state="error"/);
});

test('required marks the label', () => {
  assert.match(render(<ArenaFileInput label="Passport scan" required />), /data-arena-part="file-input.required"[^>]*>\*<\/span>/);
});

test('disabled reaches the trigger and the hidden input natively', () => {
  const html = render(<ArenaFileInput label="Passport scan" disabled />);
  assert.match(/<button[^>]*>/.exec(html)?.[0] ?? '', /disabled=""/);
  assert.match(/<input[^>]*>/.exec(html)?.[0] ?? '', /disabled=""/);
});

test('a blank label throws, because nothing can say what a file is for', () => {
  // @ts-expect-error label is required
  assert.throws(() => render(<ArenaFileInput />), /`label` is required/);
  assert.throws(() => render(<ArenaFileInput label="   " />), /`label` is required/);
});
