import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaTable } from './ArenaTable.tsx';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell.tsx';
import { ArenaBadge } from '../arena-badge/ArenaBadge.tsx';

const COLUMNS = [
  { header: 'Build', numeric: true },
  { header: 'Project' },
];
const ROWS = [
  { build: '#4821', project: 'Client Portal' },
  { build: '#4820', project: 'Payment Gateway' },
];
const LABEL = 'Recent deployments';

const body = (rows = ROWS) => rows.map((r) => (
  <ArenaTableRow key={r.build}>
    <ArenaTableCell>{r.build}</ArenaTableCell>
    <ArenaTableCell>{r.project}</ArenaTableCell>
  </ArenaTableRow>
));

const render = (extra: Record<string, unknown> = {}, children = body()) => renderToStaticMarkup(
  <ArenaTable columns={COLUMNS} label={LABEL} responsive={false} {...extra}>{children}</ArenaTable>,
);

const NATIVE = /<(button|a|input|select|textarea)\b[^>]*>/g;
function tabStops(html: string) {
  const explicit = (html.match(/tabindex="0"/g) || []).length;
  let native = 0;
  for (const m of html.matchAll(NATIVE)) {
    const tag = m[0];
    if (/tabindex="/.test(tag)) continue;
    if (tag.startsWith('<a') && !/\shref=/.test(tag)) continue;
    native += 1;
  }
  return explicit + native;
}

test('every row, header cell and data cell takes its grid role from the element it is', () => {
  const html = render();
  const count = (re: RegExp) => (html.match(re) || []).length;

  assert.equal(count(/<tr\b/g), 3, 'the fixture did not render three rows');
  assert.equal(count(/<th\b/g), 2, 'the fixture did not render two header cells');
  assert.equal(count(/<td\b/g), 4, 'the fixture did not render four data cells');

  assert.equal(count(/<tr[^>]*role="row"/g), 0,
    'a <tr> already maps to a row, so writing the role back onto it is the hand-rebuild the contract refuses');
  assert.equal(count(/<th[^>]*role="columnheader"/g), 0, 'and a <th scope="col"> already maps to a columnheader');
  assert.equal(count(/<td[^>]*role="gridcell"/g), 0, 'and a <td> inside a role="grid" already maps to a gridcell');
  assert.equal(count(/<th[^>]*scope="col"/g), 2, 'a header cell says which way it heads, which is what carries the mapping');
});

test('an empty columns array renders rather than throwing', () => {
  assert.doesNotThrow(
    () => renderToStaticMarkup(<ArenaTable columns={[]} label="Recent builds" responsive={false}>{body()}</ArenaTable>),
  );
});

test('a consumer-drawn control in a cell IS a second tab stop', () => {
  const html = render({ columns: [...COLUMNS, { header: 'Actions' }] }, ROWS.map((r) => (
    <ArenaTableRow key={r.build}>
      <ArenaTableCell>{r.build}</ArenaTableCell>
      <ArenaTableCell>{r.project}</ArenaTableCell>
      <ArenaTableCell><button type="button">Open</button></ArenaTableCell>
    </ArenaTableRow>
  )));
  assert.ok(tabStops(html) > 1, 'a consumer button in a cell did not add a tab stop');

  const btn = html.match(/<button[^>]*>Open<\/button>/);
  assert.ok(btn, 'the consumer control did not render');
  assert.doesNotMatch(btn[0], /tabindex=/, 'Arena silenced a control it does not own');
});

test('an Arena component inside an ArenaTableCell renders', () => {
  const html = render({ columns: [...COLUMNS, { header: 'Status' }] }, ROWS.map((r) => (
    <ArenaTableRow key={r.build}>
      <ArenaTableCell>{r.build}</ArenaTableCell>
      <ArenaTableCell>{r.project}</ArenaTableCell>
      <ArenaTableCell><ArenaBadge tone="success" dot>Deployed</ArenaBadge></ArenaTableCell>
    </ArenaTableRow>
  )));
  assert.match(html, /Deployed/, 'an ArenaBadge inside an ArenaTableCell did not render');

  assert.match(html, /<td[^>]*>(?:(?!<\/td>).)*Deployed/s,
    'the ArenaBadge rendered outside the cell it was written in');
});

test('a column carrying a `render` function reaches nothing', () => {
  const baseline = render();
  const withRender = render({
    columns: COLUMNS.map((c) => ({ ...c, render: () => <b>NOPE</b> })),
  });
  assert.doesNotMatch(withRender, /NOPE/, 'ArenaTableColumn.render is being called again');
  assert.equal(withRender, baseline, 'a column-level render function changed the output');
});

test('`rows` and `getRowKey` passed as props change nothing', () => {
  const baseline = render();
  const withDead = render({ rows: ROWS, getRowKey: (r: { build: string }) => r.build });
  assert.equal(withDead, baseline, 'a removed member is still being honoured');
});

test('the first row, a sortable head and a numeric cell are groups on the base slots', () => {
  const html = render({ sort: { column: 0, direction: 'asc' }, columns: [{ header: 'Build', numeric: true, sortable: true }, { header: 'Project' }] });
  assert.match(html, /data-arena-part="table.th"[^>]*\bdata-arena-sortable=""/);
  assert.equal((html.match(/data-arena-part="table.row"[^>]*\bdata-arena-first=""/g) || []).length, 1, 'only the first body row');
  assert.match(html, /data-arena-part="table.td"[^>]*\bdata-arena-numeric=""/);
  const plain = render({ columns: [{ header: 'Project' }, { header: 'Owner' }] });
  assert.match(plain, /<td\b/, 'sanity: a data cell was drawn');
  assert.doesNotMatch(plain, /data-arena-numeric/,
    'a plain column drew the numeric group');
});

test('an interactive row selects the interactive group', () => {
  const html = renderToStaticMarkup(
    <ArenaTable columns={COLUMNS} label={LABEL} responsive={false}>
      <ArenaTableRow interactive onActivate={() => {}}><ArenaTableCell>a</ArenaTableCell><ArenaTableCell>b</ArenaTableCell></ArenaTableRow>
    </ArenaTable>,
  );
  assert.match(html, /data-arena-part="table.row"[^>]*\bdata-arena-interactive=""/);
});
