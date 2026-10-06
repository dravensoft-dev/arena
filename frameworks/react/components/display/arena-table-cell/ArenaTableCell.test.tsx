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
  assert.doesNotMatch(html, /style="/, 'nothing is recomputed to draw it');
});

test('a numeric column takes its own branch of the recipe', () => {
  const plain = renderToStaticMarkup(<ArenaTableCell column={{ header: 'Service' }}>api</ArenaTableCell>);
  assert.match(plain, /\b(?:arena-table__root|arena-table__table|arena-table__td|arena-table__card-value)\b/);

  const mono = renderToStaticMarkup(<ArenaTableCell column={{ header: 'Build', numeric: true }}>4821</ArenaTableCell>);
  assert.match(mono, /\barena-table__td\b/);
  assert.match(mono, /\barena-table__td--numeric-true\b/);
  assert.doesNotMatch(plain, /numeric-true/);
});
