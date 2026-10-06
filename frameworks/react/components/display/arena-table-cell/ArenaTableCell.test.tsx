import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaTableCell } from './ArenaTableCell.tsx';

test('the roving ring is a focus modifier on the cell, not a flag pushed down the family', () => {
  const html = renderToStaticMarkup(
    <ArenaTableCell column={{ header: 'Service' }} tabIndex={0}>api</ArenaTableCell>,
  );
  assert.match(html, /(?:arena-table__th|arena-table__td|arena-table__td-mono)/);
  assert.match(html, /\b(?:arena-table__th|arena-table__td|arena-table__td-mono)\b/, 'the ring replaces an outline rather than adding to one');
  assert.doesNotMatch(html, /style="/, 'nothing is recomputed to draw it');
});

test('a numeric column takes its own branch of the recipe', () => {
  const plain = renderToStaticMarkup(<ArenaTableCell column={{ header: 'Service' }}>api</ArenaTableCell>);
  assert.match(plain, /\b(?:arena-table__root|arena-table__table|arena-table__td|arena-table__card-value)\b/);

  const mono = renderToStaticMarkup(<ArenaTableCell column={{ header: 'Build', numeric: true }}>4821</ArenaTableCell>);
  assert.match(mono, /\b(?:arena-table__th|arena-table__td-mono|arena-table__card-label|arena-table__card-value-mono)\b/);
  assert.match(mono, /\b(?:arena-table__td-mono|arena-table__card-value-mono)\b/);
});
