import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaTableCell } from './ArenaTableCell.tsx';

test('the roving ring is a focus modifier on the cell, not a flag pushed down the family', () => {
  const html = renderToStaticMarkup(
    <ArenaTableCell column={{ header: 'Service' }} tabIndex={0}>api</ArenaTableCell>,
  );
  assert.match(html, /\barena-table__(?:th|td)\b/);
  assert.match(html, /\barena-table__(?:th|td)\b/, 'the ring replaces an outline rather than adding to one');
  const declared = (html.match(/style="([^"]*)"/)?.[1] ?? '').split(';').filter(Boolean);
  assert.equal(declared.length, 2, 'the cell writes its two channels and nothing else');
  assert.ok(declared.includes('--arena-column-width:initial'), 'width channel is not initial');
  assert.ok(declared.includes('--arena-column-align:initial'), 'align channel is not initial');
});

test('a keyed column binds both channels under its key, and an invalid key writes initial', () => {
  const keyed = renderToStaticMarkup(<ArenaTableCell label="T" column={{ header: 'Status', key: 'status' }}>ok</ArenaTableCell>);
  const keyedStyle = keyed.match(/style="([^"]*)"/)?.[1];
  assert.ok(keyedStyle !== undefined, 'a keyed cell carries no style');
  const keyedDecls = keyedStyle.split(';');
  assert.ok(keyedDecls.includes('--arena-column-width:var(--arena-column-status-width)'), 'width is not bound under the key');
  assert.ok(keyedDecls.includes('--arena-column-align:var(--arena-column-status-align)'), 'align is not bound under the key');
  const invalid = renderToStaticMarkup(<ArenaTableCell label="T" column={{ header: 'Status', key: 'order.id' }}>ok</ArenaTableCell>);
  assert.doesNotMatch(invalid, /var\(--arena-column-/);
});

test('a numeric column takes its own branch of the recipe', () => {
  const plain = renderToStaticMarkup(<ArenaTableCell column={{ header: 'Service' }}>api</ArenaTableCell>);
  assert.match(plain, /\b(?:arena-table__root|arena-table__table|arena-table__td|arena-table__card-value)\b/);

  const mono = renderToStaticMarkup(<ArenaTableCell column={{ header: 'Build', numeric: true }}>4821</ArenaTableCell>);
  assert.match(mono, /\barena-table__td\b/);
  assert.match(mono, /data-arena-part="table.td"[^>]*\bdata-arena-numeric=""/);
  assert.doesNotMatch(plain, /numeric-true/);
});
