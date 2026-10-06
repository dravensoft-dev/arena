import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaTableStyles } from './ArenaTable.variants';
import { arenaTableRowStyles } from '../arena-table-row/ArenaTableRow.variants';
import { arenaTableCellStyles } from '../arena-table-cell/ArenaTableCell.variants';


test('sortable, first, interactive and numeric are groups on th, row, td and cardValue', () => {
  const on = arenaTableStyles({ narrow: false, sortable: true, first: true, interactive: true, numeric: true });
  const off = arenaTableStyles({ narrow: false });
  assert.notEqual(on.th(), off.th());
  assert.notEqual(on.row(), off.row());
  assert.notEqual(on.td(), off.td());
  assert.notEqual(arenaTableStyles({ narrow: true, numeric: true }).cardValue(), arenaTableStyles({ narrow: true }).cardValue());
});
