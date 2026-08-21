import React, { useEffect, useRef, useState } from 'react';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import { useArenaContainerWidth, arenaReadBreakpoint } from '../../../UseArenaContainerWidth.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaTable.classes.generated.ts';

import { ArenaPagination } from '../../navigation/arena-pagination/ArenaPagination.tsx';
import { ArenaSelect } from '../../forms/arena-select/ArenaSelect.tsx';
import type { ArenaTableRowProps } from '../arena-table-row/ArenaTableRow.tsx';

import type {
  ArenaSelectOption, ArenaTableColumn, ArenaTablePage, ArenaTablePageControl, ArenaTableSlice,
  ArenaTableSort, ArenaTableSortControl,
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

  /** Whether ArenaTable draws the pager below the grid. 'auto' draws it whenever `page` is bound, which is what a table showing one list of its own wants; 'none' draws nothing and leaves the consumer to place an ArenaPagination themselves, over this table or over two of them at once. It is a separate member from `page` because the two are separate facts: `page` is what the table KNOWS about a longer list, and this is what it DRAWS about it. Bound together, a consumer who wanted the control elsewhere had to withhold `page` and leave the table knowing nothing about paging at all, which is a member deliberately unbound and a comment explaining why. The same split, and the same reasoning, as `sort` and `sortControl`. */
  pageControl?: ArenaTablePageControl;

  /** Where the projected rows sit inside a longer list, which is what `aria-rowcount` and `aria-rowindex` carry on the grid. Absent with `page` bound, both are derived from the page, so a paged table needs nothing here. Bind it when the projection is not a page: a window a scroller renders, an infinite list that grows, or a page inside which you render less again. It is a separate member from `page` because the two answer separate questions, the same split `page` and `pageControl` make: `page` is the model the pager draws, and this is where the rows in the DOM sit in the list they came from. Bound together, this one answers the two attributes whole rather than composing with the page, because a reader is told one position and two sources for it is how they disagree. */
  slice?: ArenaTableSlice;

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

const arenaSortOptions = (columns: readonly ArenaTableColumn[]): ArenaSelectOption[] =>
  columns.flatMap((column, index) => (column.sortable
    ? [{ value: arenaSortOptionValue(index, 'asc'), label: `${column.header} \u2191` },
      { value: arenaSortOptionValue(index, 'desc'), label: `${column.header} \u2193` }]
    : []));

const arenaTableStyles = arenaStyles(manifest);

export function ArenaTable({
  columns, children, empty = 'No data.', responsive = true, label,
  sort, sortControl = 'auto', onSortChange, page, slice, pageControl = 'auto', onPageChange,
}: ArenaTableProps) {
  if (!label?.trim()) throw new Error('ArenaTable: `label` is required');
  if (columns == null) throw new Error('ArenaTable: `columns` is required');
  const [ref, width] = useArenaContainerWidth();

  const narrow = responsive && width !== null && width < arenaReadBreakpoint('md');

  const rowEls = React.Children.toArray(children);
  const bare = rowEls.length === 0;
  const flat = narrow || bare;

  const pageCount = page ? Math.max(1, Math.ceil(page.total / Math.max(1, page.size))) : 1;

  const extent = slice ?? (page ? { total: page.total, offset: (page.index - 1) * page.size } : null);
  const rowCount = extent === null ? undefined : extent.total < 0 ? -1 : extent.total + 1;

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

  const gridRows = bare ? 0 : rowEls.length + 1;
  const rowCells = (index: number): number => {
    if (index < 0 || index >= gridRows) return 0;
    if (index === 0) return columns.length;
    const row = rowEls[index - 1];
    return React.isValidElement(row) ? React.Children.toArray(row.props.children).length : 0;
  };

  const curRow = Math.min(Math.max(cursor.row, 0), Math.max(gridRows - 1, 0));
  const curCol = Math.min(Math.max(cursor.col, 0), Math.max(rowCells(curRow) - 1, 0));

  useEffect(() => {
    const g = gridRef.current;
    if (!g || flat) return;
    const active = g.ownerDocument.activeElement;
    if (!active || !g.contains(active)) return;

    if (active.tagName !== 'TD' && active.tagName !== 'TH') return;
    const cell = g.querySelector<HTMLElement>('td[tabindex="0"], th[tabindex="0"]');
    if (cell && cell !== active) cell.focus();
  }, [curRow, curCol]);

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    if (flat) return;
    const t = e.target;
    if (!(t instanceof Element)) return;

    if (t.tagName !== 'TD' && t.tagName !== 'TH') return;

    let row = curRow;
    let col = curCol;
    if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
    else if (e.key === 'ArrowDown') row = Math.min(gridRows - 1, row + 1);
    else if (e.key === 'ArrowLeft') col = Math.max(0, col - 1);
    else if (e.key === 'ArrowRight') col = Math.min(Math.max((rowCells(row) || 1) - 1, 0), col + 1);

    else if (e.key === 'Home') col = 0;
    else if (e.key === 'End') col = Math.max((rowCells(row) || 1) - 1, 0);
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

    col = Math.min(col, Math.max((rowCells(row) || 1) - 1, 0));

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

  const sortBar = narrow && !bare && sortControl !== 'none' && Boolean(sort)
    && columns.some((column) => column.sortable);
  const sortValue = sort ? arenaSortOptionValue(sort.column, sort.direction) : undefined;

  const sortableClass = arenaTableStyles({ narrow: false }).thSortable();
  const headerClass = (c: ArenaTableColumn): string => {
    const base = arenaTableStyles({ narrow: false, align: c.align || 'left' }).th();
    return c.sortable && sort ? `${base} ${sortableClass}` : base;
  };

  return (
    <div ref={ref} className={arenaTableStyles({ narrow }).root()} data-arena-part={manifest.parts.root}>
      {narrow && sortBar && (
        <div className={arenaTableStyles({ narrow: true }).sortBar()} data-arena-part={manifest.parts.sortBar}>
          <div className={arenaTableStyles({ narrow: true }).sortField()} data-arena-part={manifest.parts.sortField}>
            <ArenaSelect label="Sort by" options={arenaSortOptions(columns)} value={sortValue}
              onChange={(picked) => { const next = arenaParseSortOption(picked); if (next) onSortChange?.(next); }} />
          </div>
        </div>
      )}
      <table role={flat ? 'presentation' : 'grid'} aria-label={flat ? undefined : label} ref={gridRef}
        aria-rowcount={flat ? undefined : rowCount}
        onKeyDown={onGridKeyDown}
        className={arenaTableStyles({ narrow }).grid()} data-arena-part={manifest.parts.grid}>
        {!flat && (
          <thead>
            <tr aria-rowindex={extent ? 1 : undefined}
              className={arenaTableStyles({ narrow: false }).headRow()} data-arena-part={manifest.parts.headRow}>
              {columns.map((c, ci) => {
                const state = sortStateOf(ci);
                return (
                  <th key={ci} scope="col" {...headerNav(ci)}
                    aria-sort={state}
                    onClick={c.sortable && sort ? () => onHeaderActivate(ci) : undefined}
                    className={headerClass(c)} data-arena-part={manifest.parts.th}
                    style={{ width: c.width }}>{c.header}{state && state !== 'none' && (
                        <i aria-hidden="true"
                          className={`${arenaTableStyles({ narrow: false }).sortCaret()} ${sort?.direction === 'asc' ? 'ph-bold ph-caret-up' : 'ph-bold ph-caret-down'}`} data-arena-part={manifest.parts.sortCaret} />
                      )}</th>
                );
              })}
            </tr>
          </thead>
        )}
        <tbody role={flat ? 'presentation' : undefined}
          className={arenaTableStyles({ narrow }).body()} data-arena-part={manifest.parts.body}>
          {rowEls.map((row, ri) => (React.isValidElement(row)
            ? React.cloneElement(row, {
              rowIndex: ri + 1,
              ariaRowIndex: flat || !extent ? null : extent.offset + ri + 2,
              columns,
              layout: narrow ? 'card' : 'table',
              cursorCol: narrow || curRow !== ri + 1 ? null : curCol,
              onCellFocus: narrow ? undefined : onCellFocus,
            })
            : row))}
        </tbody>
      </table>
      {bare && (
        <div className={arenaTableStyles({ narrow }).empty()} data-arena-part={manifest.parts.empty}>{empty}</div>
      )}
      {!bare && page && pageControl !== 'none' && (
        <div className={arenaTableStyles({ narrow: false }).pager()} data-arena-part={manifest.parts.pager}>
          <ArenaPagination page={page.index} pageCount={pageCount} ariaLabel={label}
            onChange={(next) => onPageChange?.(next)} />
        </div>
      )}
    </div>
  );
}
