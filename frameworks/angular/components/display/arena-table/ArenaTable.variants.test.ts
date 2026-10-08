import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaTableStyles } from './ArenaTable.variants';
import { arenaTableRowStyles } from '../arena-table-row/ArenaTableRow.variants';
import { arenaTableCellStyles } from '../arena-table-cell/ArenaTableCell.variants';


test('sortable, first, interactive and numeric are groups on th, row, td and cardValue', () => {
  const on = arenaTableStyles({ narrow: false, sortable: true, first: true, interactive: true, numeric: true });
  const off = arenaTableStyles({ narrow: false });
  assert.notEqual(JSON.stringify(on.$data.th()), JSON.stringify(off.$data.th()));
  assert.notEqual(JSON.stringify(on.$data.row()), JSON.stringify(off.$data.row()));
  assert.notEqual(JSON.stringify(on.$data.td()), JSON.stringify(off.$data.td()));
  assert.notEqual(JSON.stringify(arenaTableStyles({ narrow: true, numeric: true }).$data.cardValue()), JSON.stringify(arenaTableStyles({ narrow: true }).$data.cardValue()));
});
