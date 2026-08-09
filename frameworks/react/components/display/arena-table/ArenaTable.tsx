import React, { useEffect, useRef, useState } from 'react';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import { useArenaContainerWidth, arenaReadBreakpoint } from '../../../UseArenaContainerWidth.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaTable.classes.generated.ts';

import { ArenaPagination } from '../../navigation/arena-pagination/ArenaPagination.tsx';
import { ArenaSelect } from '../../forms/arena-select/ArenaSelect.tsx';
import type { ArenaTableRowProps } from '../arena-table-row/ArenaTableRow.tsx';

import type {
  ArenaSelectOption, ArenaTableColumn, ArenaTablePage, ArenaTableSort, ArenaTableSortControl,
} from '../../../Api.generated';

export type { ArenaTableColumn };

export interface ArenaTableProps {

  /** Names the grid for assistive technology. Required, and guarded at runtime: nothing can derive it; ArenaCalendar names its grid from the range it is showing, and a data table's subject is editorial. Say what the rows are, never "ArenaTable". */
  label: string;

  /** The columns, in order. A column heads and sets its cells; it never says what goes in them. */
  columns: readonly ArenaTableColumn[];

  /** The rows. One ArenaTableRow per row. Where a row sits, the columns its cells are set against and how the keyboard reaches them are ArenaTable's to decide and no row's to declare; how that reaches a row is each layer's own idiom. */
  children?: React.ReactNode;

  /** What shows when no row is written. In that state NO grid is drawn at all, header row included: a column head over a "no results" sentence describes a table that is not there, and a role="grid" holding neither a header nor a row is a degenerate render, the same judgement ArenaTabs makes when it draws no panel for a tab that does not exist. Every layer falls back to the string 'No data.' when nothing is given, each in its own idiom for a default. Unlike ArenaTable.label this one IS derivable: 'No data.' states what happened rather than what the component is, which is the distinction that makes a fallback useful here and useless there. A consumer with a better sentence, what to do next or why the list is empty, projects it. */
  empty?: React.ReactNode;

  /** ArenaCard mode below --bp-md. Set false only when the columns are meaningless apart. */
  responsive?: boolean;

  /** Which column the rows are ordered by and which way. Controlled: ArenaTable draws the caret and the aria-sort, and the consumer does the ordering, because ArenaTable does not hold the rows. Absent, no header is a sort target. */
  sort?: ArenaTableSort;

  /** How the sort affordance is reached in CARD MODE, where there is no header row to activate and a `sortable` column therefore has no control under it at all. 'auto' draws one compact select above the cards, listing every sortable column in each direction, which is the shape a phone has room for; 'none' leaves card mode unsorted by hand, for a table whose order is the document's rather than the reader's. Above --bp-md the header row is the control and this member draws nothing. The header row does NOT come back below the breakpoint, because card mode exists for the one reason a grid does not fit. It is a member rather than something a consumer draws for themselves because the state it edits, ArenaTableSort, is Arena's: left to each consumer, the label, the option order and the way a direction is worded are invented once per project over a model they did not define. */
  sortControl?: ArenaTableSortControl;

  /** A sortable header was activated, carrying the column and the direction it should become: the same column flips, a different one starts ascending. ArenaTable never reorders anything itself, so a consumer who ignores this event gets a caret that moves and rows that do not, which is why the member is controlled rather than a starting value. */
  onSortChange?: (sort: ArenaTableSort) => void;

  /** Which page of a longer list is on screen. Present, ArenaTable draws its own ArenaPagination below the grid and names it from `label`, which is what gives that required name its uniqueness on a page with two paged tables. Absent, no pager is drawn and the projected rows are the whole list. */
  page?: ArenaTablePage;

  /** A page was chosen, carrying the new 1-based page. It also fires with 1 when the current page has gone PAST THE END, which is the only reset ArenaTable performs; a filter that leaves the page in range is silent, so returning the reader to page one on a change of criterion stays the consumer's, beside the criterion they hold. */
  onPageChange?: (page: number) => void;
}


export function arenaSortOptionValue(column: number, direction: ArenaTableSort['direction']): string {
  return `${column}:${direction}`;
}

export function arenaParseSortOption(value: string): ArenaTableSort | null {
  const [column, direction] = value.split(':');
  const index = Number.parseInt(column ?? '', 10);
  if (!Number.isInteger(index) || (direction !== 'asc' && direction !== 'desc')) return null;
  return { column: index, direction };
}

const arenaTableStyles = arenaStyles(manifest);

export function ArenaTable({
  columns, children, empty = 'No data.', responsive = true, label,
  sort, sortControl = 'auto', onSortChange, page, onPageChange,
}: ArenaTableProps) {
  if (!label?.trim()) throw new Error('ArenaTable: `label` is required');
  if (columns == null) throw new Error('ArenaTable: `columns` is required');
  const [ref, width] = useArenaContainerWidth();

  const narrow = responsive && width !== null && width < arenaReadBreakpoint('md');

  const rowEls = React.Children.toArray(children);
  const bare = rowEls.length === 0;

  const pageCount = page ? Math.max(1, Math.ceil(page.total / Math.max(1, page.size))) : 1;

  useEffect(() => {
    if (page && page.index > pageCount) onPageChange?.(1);
  }, [page?.index, pageCount]);

  useEffect(() => {
    if (!sort) return;
    const column = columns[sort.column];
    if (column?.sortable) return;
    const name = column ? `"${column.header}"` : 'no column at all';
    arenaWarnOnce(`ArenaTable "${label}": sort.column ${sort.column} is ${name}, which does not declare`
      + ' `sortable`, so no header is a target and the caret is not drawn. ArenaTableSort.column is an'
      + ' INDEX, so moving a column reorders the rows in silence; keep the sort field inside the'
      + ' column entry it belongs to and the two move together.');
  }, [sort?.column, columns]);

  const sortStateOf = (index: number): 'ascending' | 'descending' | 'none' | undefined => {
    if (!columns[index]?.sortable || !sort) return undefined;
    if (sort.column !== index) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  };

  const onHeaderActivate = (index: number) => {
    if (!columns[index]?.sortable || !sort || !onSortChange) return;
    onSortChange(sort.column === index
      ? { column: index, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
      : { column: index, direction: 'asc' });
  };

  const gridRef = useRef<HTMLTableElement | null>(null);
  const [cursor, setCursor] = useState({ row: 0, col: 0 });

  const cellCounts = rowEls.map((row) => (
    React.isValidElement(row) ? React.Children.toArray(row.props.children).length : 0
  ));
  const rowLens = bare ? [] : [columns.length, ...cellCounts];

  const curRow = Math.min(Math.max(cursor.row, 0), Math.max(rowLens.length - 1, 0));
  const curCol = Math.min(Math.max(cursor.col, 0), Math.max((rowLens[curRow] || 0) - 1, 0));

  useEffect(() => {
    const g = gridRef.current;
    if (!g) return;
    const active = g.ownerDocument.activeElement;
    if (!active || !g.contains(active)) return;

    const activeRole = active.getAttribute('role');
    if (activeRole !== 'gridcell' && activeRole !== 'columnheader') return;
    const cell = g.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"], [role="columnheader"][tabindex="0"]');
    if (cell && cell !== active) cell.focus();
  }, [curRow, curCol]);

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const role = t.getAttribute('role');

    if (role !== 'gridcell' && role !== 'columnheader') return;

    let row = curRow;
    let col = curCol;
    if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
    else if (e.key === 'ArrowDown') row = Math.min(rowLens.length - 1, row + 1);
    else if (e.key === 'ArrowLeft') col = Math.max(0, col - 1);
    else if (e.key === 'ArrowRight') col = Math.min(Math.max((rowLens[row] || 1) - 1, 0), col + 1);

    else if (e.key === 'Home') col = 0;
    else if (e.key === 'End') col = Math.max((rowLens[row] || 1) - 1, 0);
    else if (e.key === 'Enter' || e.key === ' ') {

      e.preventDefault();
      if (curRow === 0) { onHeaderActivate(curCol); return; }
      if (e.key === ' ') return;
      const rowEl = rowEls[curRow - 1];
      if (rowEl && React.isValidElement<ArenaTableRowProps>(rowEl)) {
        const { onClick: activate, interactive, disabled } = rowEl.props;
        if (interactive && activate && !disabled) activate();
      }
      return;
    } else return;

    col = Math.min(col, Math.max((rowLens[row] || 1) - 1, 0));

    e.preventDefault();

    if (row !== curRow || col !== curCol) setCursor({ row, col });
  };

  const onCellFocus = (ri: number, ci: number) => {
    if (ri !== curRow || ci !== curCol) setCursor({ row: ri, col: ci });
  };

  const headerNav = (ci: number) => ({
    tabIndex: 0 === curRow && ci === curCol ? 0 : -1,
    onFocus: (e: React.FocusEvent) => { if (e.target === e.currentTarget) onCellFocus(0, ci); },
  });

  const sortable = columns.map((column, index) => ({ column, index })).filter((c) => c.column.sortable);
  const sortBar = narrow && !bare && sortControl !== 'none' && Boolean(sort) && sortable.length > 0;
  const sortOptions: ArenaSelectOption[] = sortable.flatMap(({ column, index }) => [
    { value: arenaSortOptionValue(index, 'asc'), label: `${column.header} \u2191` },
    { value: arenaSortOptionValue(index, 'desc'), label: `${column.header} \u2193` },
  ]);
  const sortValue = sort ? arenaSortOptionValue(sort.column, sort.direction) : undefined;

  const headerClass = (c: ArenaTableColumn): string => {
    const base = arenaTableStyles({ narrow: false, align: c.align || 'left' }).th();
    return c.sortable && sort ? `${base} ${arenaTableStyles({ narrow: false }).thSortable()}` : base;
  };

  return (
    <div ref={ref} className={arenaTableStyles({ narrow }).root()}>
      {narrow ? (
        <div className={arenaTableStyles({ narrow: true }).grid()}>
          {sortBar && (
            <ArenaSelect label="Sort by" options={sortOptions} value={sortValue}
              onChange={(picked) => { const next = arenaParseSortOption(picked); if (next) onSortChange?.(next); }} />
          )}
          {bare && (
            <div className={arenaTableStyles({ narrow: true }).empty()}>{empty}</div>
          )}
          {rowEls.map((row, ri) => (React.isValidElement(row)
            ? React.cloneElement(row, { rowIndex: ri + 1, columns, layout: 'card' })
            : row))}
        </div>
      ) : bare ? (
        <div className={arenaTableStyles({ narrow: false }).empty()}>{empty}</div>
      ) : (
        <>
          <table role="grid" aria-label={label} ref={gridRef}
            onKeyDown={onGridKeyDown}
            className={arenaTableStyles({ narrow: false }).table()}>
            <thead>
              <tr role="row" className={arenaTableStyles({ narrow: false }).headRow()}>
                {columns.map((c, ci) => (
                  <th key={ci} role="columnheader" {...headerNav(ci)}
                    aria-sort={sortStateOf(ci)}
                    onClick={c.sortable && sort ? () => onHeaderActivate(ci) : undefined}
                    className={headerClass(c)}
                    style={{ width: c.width }}>{c.header}{sortStateOf(ci) && sortStateOf(ci) !== 'none' && (
                        <i aria-hidden="true"
                          className={`${arenaTableStyles({ narrow: false }).sortCaret()} ${sort?.direction === 'asc' ? 'ph-bold ph-caret-up' : 'ph-bold ph-caret-down'}`} />
                      )}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowEls.map((row, ri) => (React.isValidElement(row)
                ? React.cloneElement(row, {
                  rowIndex: ri + 1,
                  columns,
                  layout: 'table',
                  cursorCol: curRow === ri + 1 ? curCol : null,
                  onCellFocus,
                })
                : row))}
            </tbody>
          </table>
        </>
      )}
      {!bare && page && (
        <div className={arenaTableStyles({ narrow: false }).pager()}>
          <ArenaPagination page={page.index} pageCount={pageCount} ariaLabel={label}
            onChange={(next) => onPageChange?.(next)} />
        </div>
      )}
    </div>
  );
}
