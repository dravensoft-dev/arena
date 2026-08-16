import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaTable } from './ArenaTable.tsx';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell.tsx';
import { ArenaBadge } from '../arena-badge/ArenaBadge.tsx';

const COLUMNS = [
  { header: 'Build', mono: true },
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

test('an ArenaTable renders exactly one tab stop', () => {
  assert.equal(tabStops(render()), 1, 'an ArenaTable is not one tab stop');
});

test('the wide layout is a role="grid" carrying a non-empty name', () => {
  const html = render();
  assert.match(html, /role="grid"/, 'no role="grid" on the wide layout');
  const name = html.match(/aria-label="([^"]*)"/);
  assert.ok(name, 'the grid has no aria-label');
  assert.ok(name[1]!.length > 0, 'the grid aria-label is empty');
  assert.equal(name[1], LABEL, 'the grid name is not the `label` member');
});

test('every row, header cell and data cell takes its grid role from the element it is', () => {
  const html = render();
  const count = (re: RegExp) => (html.match(re) || []).length;

  assert.equal(count(/<tr\b/g), 3, 'the fixture no longer renders three rows');
  assert.equal(count(/<th\b/g), 2, 'the fixture no longer renders two header cells');
  assert.equal(count(/<td\b/g), 4, 'the fixture no longer renders four data cells');

  assert.equal(count(/<tr[^>]*role="row"/g), 0,
    'a <tr> already maps to a row, so writing the role back onto it is the hand-rebuild the contract refuses');
  assert.equal(count(/<th[^>]*role="columnheader"/g), 0, 'and a <th scope="col"> already maps to a columnheader');
  assert.equal(count(/<td[^>]*role="gridcell"/g), 0, 'and a <td> inside a role="grid" already maps to a gridcell');
  assert.equal(count(/<th[^>]*scope="col"/g), 2, 'a header cell says which way it heads, which is what carries the mapping');
});

test('ArenaTable throws when `label` is absent', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaTable columns={COLUMNS} responsive={false}>{body()}</ArenaTable>),
    /ArenaTable: `label` is required/,
  );
});

test('ArenaTable throws when `columns` is absent', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaTable label="Recent builds" responsive={false}>{body()}</ArenaTable>),
    /ArenaTable: `columns` is required/,
  );
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

test('ArenaTable drops a consumer style object -- the ...style escape is gone', () => {
  const html = render({ style: { color: '#ff00ff' } });
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaTable drops a consumer attribute -- the {...rest} escape is gone', () => {
  const html = render({ 'data-stray': 'x' });
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- the {...rest} escape is back');
});

test('ArenaTableRow drops a consumer style object -- the ...style escape is gone', () => {
  const html = render({}, [
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaTableRow key="a" style={{ color: '#ff00ff' }}><ArenaTableCell>x</ArenaTableCell></ArenaTableRow>,
  ]);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered <tr> -- the R4 escape is back');
});

test('ArenaTableRow drops a consumer attribute -- the {...rest} escape is gone', () => {
  const html = render({}, [
    <ArenaTableRow key="a" data-stray="x"><ArenaTableCell>x</ArenaTableCell></ArenaTableRow>,
  ]);
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered <tr> -- the {...rest} escape is back');
});

test('ArenaTableCell drops a consumer style object -- the ...style escape is gone', () => {
  const html = render({}, [
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaTableRow key="a"><ArenaTableCell style={{ color: '#ff00ff' }}>x</ArenaTableCell></ArenaTableRow>,
  ]);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered <td> -- the R4 escape is back');
});

test('ArenaTableCell drops a consumer attribute -- the {...rest} escape is gone', () => {
  const html = render({}, [
    <ArenaTableRow key="a"><ArenaTableCell data-stray="x">x</ArenaTableCell></ArenaTableRow>,
  ]);
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered <td> -- the {...rest} escape is back');
});
