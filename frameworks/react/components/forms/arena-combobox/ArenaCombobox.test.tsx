/* The closed control as a server renders it: a named text field with the combobox roles and no list,
 * the chosen label in the field and its value in the hidden input, and a label that names nothing
 * refused. The list itself mounts after hydration, so no server render ever draws a row. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaCombobox, arenaFilterOptions } from './ArenaCombobox.tsx';

const REGIONS = [
  { value: 'eu-west', label: 'Europe West' },
  { value: 'us-east', label: 'US East' },
];

test('the closed field is a combobox that says it is collapsed and names no list', () => {
  const html = renderIcons(<ArenaCombobox label="Region" options={REGIONS} />);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-autocomplete="list"/);
  assert.match(html, /aria-haspopup="listbox"/);
  assert.doesNotMatch(html, /aria-controls/, 'a closed field named a list that is not there');
  assert.doesNotMatch(html, /role="listbox"|role="option"/, 'a server render drew the list');
});

test('the field shows the chosen label, and the hidden input submits its value', () => {
  const html = renderIcons(<ArenaCombobox label="Region" name="region" value="us-east" options={REGIONS} />);
  assert.match(html, /value="US East"/);
  assert.match(html, /<input type="hidden" name="region" value="us-east"\/>/);
});

test('without a name there is no hidden input, and a value no option holds draws an empty field', () => {
  const html = renderIcons(<ArenaCombobox label="Region" value="mars" placeholder="Search" options={REGIONS} />);
  assert.doesNotMatch(html, /type="hidden"/);
  assert.match(html, /value=""/);
  assert.match(html, /placeholder="Search"/);
});

test('the label names the field through for, or through aria-label when it is not drawn', () => {
  const drawn = renderIcons(<ArenaCombobox label="Region" options={REGIONS} />);
  const id = /<input[^>]* id="([^"]+)"/.exec(drawn)?.[1];
  assert.ok(id);
  assert.match(drawn, new RegExp(`<label for="${id}"[^>]*>Region</label>`));
  const hidden = renderIcons(<ArenaCombobox label="Region" showLabel={false} options={REGIONS} />);
  assert.doesNotMatch(hidden, /<label/);
  assert.match(hidden, /aria-label="Region"/);
});

test('error marks the field invalid, describes it and draws the warning glyph; valid draws the check', () => {
  const failed = renderIcons(<ArenaCombobox label="Region" error="Pick a region" options={REGIONS} />);
  assert.match(failed, /aria-invalid="true"/);
  assert.match(failed, /aria-describedby="([^"]+)"[\s\S]*id="\1"[^>]*>Pick a region</);
  assert.deepEqual(symbols(failed).filter((id) => id.endsWith('-warning-circle')), ['fill-warning-circle']);
  const valid = renderIcons(<ArenaCombobox label="Region" valid options={REGIONS} />);
  assert.deepEqual(symbols(valid).filter((id) => id.endsWith('-check-circle')), ['fill-check-circle']);
});

test('the caret is decoration and the count is a polite status, both drawn closed', () => {
  const html = renderIcons(<ArenaCombobox label="Region" options={REGIONS} />);
  assert.match(html, /data-arena-part="combobox.caret"[^>]*aria-hidden="true"[^>]*><svg/);
  assert.deepEqual(symbols(html), ['bold-caret-down']);
  assert.match(html, /<span role="status"[^>]*data-arena-part="combobox.announcement"[^>]*><\/span>/);
});

test('a label of nothing but spaces is refused', () => {
  assert.throws(() => renderIcons(<ArenaCombobox label="   " options={REGIONS} />), /label/);
});

test('the filter the component exports is the one it draws with', () => {
  assert.deepEqual(arenaFilterOptions(REGIONS, 'east').map((row) => row.value), ['us-east']);
});

test('a disabled combobox submits nothing: its hidden input is disabled', () => {
  const html = renderIcons(<ArenaCombobox label="Region" name="region" value="us-east" options={REGIONS} disabled />);
  assert.match(html, /<input type="hidden" name="region" disabled="" value="us-east"\/>/);
});
