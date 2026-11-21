/* A field's note, the hint or the error under it, is named by the field and carries the field's
 * id followed by -note. One table per behaviour, one row for the input and one for the textarea. */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderIcons } from '../../test/IconsHarness.tsx';
import { ArenaInput } from './arena-input/ArenaInput.tsx';
import { ArenaTextarea } from './arena-textarea/ArenaTextarea.tsx';

type Field = React.ComponentType<Record<string, unknown>>;

const ROWS = [
  { name: 'ArenaInput', Field: ArenaInput as unknown as Field, tag: 'input', prefix: 'in', label: 'Slug', slug: 'slug', hint: 'Lowercase only.', error: 'Taken.', idHint: 'Help.' },
  { name: 'ArenaTextarea', Field: ArenaTextarea as unknown as Field, tag: 'textarea', prefix: 'ta', label: 'Notes', slug: 'notes', hint: 'Markdown works.', error: 'Required.', idHint: 'Markdown works.' },
];

const escape = (text: string) => text.replace(/[.]/g, '\\.');

test('a hint is named by the field and carries the id followed by -note', () => {
  assert.ok(ROWS.length > 0, 'no row');
  for (const row of ROWS) {
    const html = renderIcons(<row.Field label={row.label} hint={row.hint} />);
    assert.match(html, new RegExp(`<${row.tag}[^>]*aria-describedby="${row.prefix}-${row.slug}-note"`), `${row.name}: the field names its note`);
    assert.match(html, new RegExp(`<span id="${row.prefix}-${row.slug}-note"[^>]*>${escape(row.hint)}</span>`), `${row.name}: the note carries the hint`);
  }
});

test('an error replaces the hint under the same note id', () => {
  assert.ok(ROWS.length > 0, 'no row');
  for (const row of ROWS) {
    const html = renderIcons(<row.Field label={row.label} hint={row.hint} error={row.error} />);
    assert.match(html, new RegExp(`<${row.tag}[^>]*aria-describedby="${row.prefix}-${row.slug}-note"`), `${row.name}: the field names its note`);
    assert.match(html, new RegExp(`<span id="${row.prefix}-${row.slug}-note"[^>]*>${escape(row.error)}</span>`), `${row.name}: the note carries the error`);
    assert.doesNotMatch(html, new RegExp(row.hint.replace(/\.$/, '')), `${row.name}: the hint is gone while an error shows`);
  }
});

test('a note takes the id the consumer gives, and a field with neither carries no aria-describedby', () => {
  assert.ok(ROWS.length > 0, 'no row');
  for (const row of ROWS) {
    const html = renderIcons(<row.Field id={row.slug} hint={row.idHint} />);
    assert.match(html, new RegExp(`<${row.tag}[^>]*aria-describedby="${row.slug}-note"`), `${row.name}: the note takes the consumer id`);
    assert.match(html, new RegExp(`<span id="${row.slug}-note"[^>]*>${escape(row.idHint)}</span>`), `${row.name}: the note carries the hint`);
    assert.doesNotMatch(renderIcons(<row.Field label={row.label} />), /aria-describedby/, `${row.name}: a field with neither names no note`);
  }
});
