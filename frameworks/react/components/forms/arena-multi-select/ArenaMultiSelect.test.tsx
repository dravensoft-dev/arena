/* The closed control as a server renders it: chips for the chosen values in the order chosen, a count
 * past maxVisible, the clear control only when declared and something is chosen, one hidden input per
 * value, the combobox roles on the one field, and no list. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaMultiSelect } from './ArenaMultiSelect.tsx';

const REGIONS = [
  { value: 'eu-west', label: 'Europe West' },
  { value: 'us-east', label: 'US East' },
  { value: 'asia-south', label: 'Asia South' },
];

const chips = (html: string) => [...html.matchAll(/data-arena-boundary="">([^<]+)<\/span>/g)].map((match) => match[1]);

test('the chosen values are chips in the order chosen, and a value no option holds is drawn as its own text', () => {
  const html = renderToStaticMarkup(<ArenaMultiSelect label="Regions" options={REGIONS} value={['us-east', 'mars', 'eu-west']} />);
  assert.deepEqual(chips(html), ['US East', 'mars', 'Europe West']);
});

test('chips past maxVisible collapse into a count named for assistive technology', () => {
  const html = renderToStaticMarkup(<ArenaMultiSelect label="Regions" options={REGIONS} value={['eu-west', 'us-east', 'asia-south']} maxVisible={2} />);
  assert.deepEqual(chips(html), ['Europe West', 'US East']);
  assert.match(html, /<span role="img" aria-label="1 more selected"[^>]*data-arena-part="combobox.more"[^>]*>\+1<\/span>/);
});

test('every chip\'s remove button is held out of the Tab sequence, so the field is one tab stop', () => {
  const html = renderToStaticMarkup(<ArenaMultiSelect label="Regions" options={REGIONS} value={['eu-west', 'us-east']} />);
  const buttons = [...html.matchAll(/<button[^>]*>/g)].map((match) => match[0]);
  assert.equal(buttons.length, 2);
  for (const button of buttons) assert.match(button, /tabindex="-1"/);
});

test('the clear control is drawn only when declared and a value is chosen, and it is no tab stop', () => {
  assert.doesNotMatch(renderToStaticMarkup(<ArenaMultiSelect label="Regions" options={REGIONS} value={['eu-west']} />), /combobox.clear/);
  assert.doesNotMatch(renderToStaticMarkup(<ArenaMultiSelect label="Regions" options={REGIONS} clearable />), /combobox.clear/);
  assert.match(renderToStaticMarkup(<ArenaMultiSelect label="Regions" options={REGIONS} value={['eu-west']} clearable />),
    /<button type="button" tabindex="-1" aria-label="Clear selection"[^>]*data-arena-part="combobox.clear"/);
});

test('each chosen value is submitted as its own hidden input under the name, and none without one', () => {
  const html = renderToStaticMarkup(<ArenaMultiSelect label="Regions" name="regions" options={REGIONS} value={['eu-west', 'us-east']} />);
  assert.deepEqual([...html.matchAll(/<input type="hidden" name="regions" value="([^"]+)"\/>/g)].map((match) => match[1]), ['eu-west', 'us-east']);
  assert.doesNotMatch(renderToStaticMarkup(<ArenaMultiSelect label="Regions" options={REGIONS} value={['eu-west']} />), /type="hidden"/);
});

test('the field is a collapsed combobox naming no list, and the placeholder shows only while nothing is chosen', () => {
  const empty = renderToStaticMarkup(<ArenaMultiSelect label="Regions" placeholder="Search" options={REGIONS} />);
  assert.match(empty, /role="combobox"[^>]*aria-expanded="false"/);
  assert.doesNotMatch(empty, /aria-controls|role="listbox"/);
  assert.match(empty, /placeholder="Search"/);
  assert.doesNotMatch(renderToStaticMarkup(<ArenaMultiSelect label="Regions" placeholder="Search" options={REGIONS} value={['eu-west']} />), /placeholder=/);
});

test('a label of nothing but spaces is refused', () => {
  assert.throws(() => renderToStaticMarkup(<ArenaMultiSelect label=" " options={REGIONS} />), /label/);
});

test('a disabled multi-select submits nothing: every hidden input is disabled', () => {
  const html = renderToStaticMarkup(<ArenaMultiSelect label="Regions" name="regions" options={REGIONS} value={['eu-west', 'us-east']} disabled />);
  assert.deepEqual([...html.matchAll(/<input type="hidden" name="regions" disabled="" value="([^"]+)"\/>/g)].map((match) => match[1]), ['eu-west', 'us-east']);
});
