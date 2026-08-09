import {
  ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, booleanAttribute, computed,
  contentChildren, effect, inject, input, output, untracked,
} from '@angular/core';
import type {
  ArenaSelectOption, ArenaTableColumn, ArenaTablePage, ArenaTablePageControl, ArenaTableSort,
  ArenaTableSortControl,
} from '../../../Api.generated';
import { arenaContainerWidth, arenaReadBreakpoint } from '../../../ContainerSize';
import { arenaWarnOnce } from '../../../WarnOnce';
import { ArenaPagination } from '../../navigation/arena-pagination/ArenaPagination';
import { ArenaSelect } from '../../forms/arena-select/ArenaSelect';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableState } from './ArenaTableState';
import { arenaTableStyles } from './ArenaTable.variants';

export function arenaSortOptionValue(column: number, direction: ArenaTableSort['direction']): string {
  return `${column}:${direction}`;
}

export function arenaParseSortOption(value: string): ArenaTableSort | null {
  const [column, direction] = value.split(':');
  const index = Number.parseInt(column ?? '', 10);
  if (!Number.isInteger(index) || (direction !== 'asc' && direction !== 'desc')) return null;
  return { column: index, direction };
}

@Component({
  selector: 'arena-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaTableState],
  imports: [ArenaPagination, ArenaSelect],
  host: { '[class]': 'styles().root()' },
  template: `
    @if (sortBar()) {
      <div [class]="styles().sortBar()">
        <div [class]="styles().sortField()">
          <arena-select [label]="sortLabel" [options]="sortOptions()" [value]="sortValue()"
                        (change)="onSortPick($event)" />
        </div>
      </div>
    }
    <div [class]="styles().grid()" [attr.role]="gridRole()"
         [attr.aria-label]="empty() ? null : gridLabel()" (keydown)="onKeydown($event)">
      @if (!narrow() && !empty()) {
        <div role="row" [class]="styles().headRow()">
          @for (column of columns(); track $index; let i = $index) {
            <div role="columnheader" [class]="headerClass(column)" [style.width]="column.width"
                 [attr.tabindex]="state.isStop(0, i) ? 0 : -1"
                 [attr.aria-sort]="sortStateOf(i)"
                 (focus)="moveTo(0, i)" (click)="onHeader(i)">{{ column.header }}@if (sortStateOf(i) !== null && sortStateOf(i) !== 'none') {
              <i [class]="styles().sortCaret() + ' ' + caretOf(i)" aria-hidden="true"></i>
            }</div>
          }
        </div>
      }
      <ng-content />
    </div>
    @if (empty()) {
      <div [class]="styles().empty()"><ng-content select="[empty]">No data.</ng-content></div>
    } @else if (pager(); as paging) {
      <div [class]="styles().pager()">
        <arena-pagination [page]="paging.index" [pageCount]="pageCount()"
                          [ariaLabel]="gridLabel()" (change)="pageChange.emit($event)" />
      </div>
    }
  `,
})
export class ArenaTable {
  /** Names the grid for assistive technology. Required, and guarded at runtime: nothing can derive it; ArenaCalendar names its grid from the range it is showing, and a data table's subject is editorial. Say what the rows are, never "ArenaTable". */
  readonly label = input.required<string>();
  /** The columns, in order. A column heads and sets its cells; it never says what goes in them. */
  readonly columns = input.required<readonly ArenaTableColumn[]>();
  /** ArenaCard mode below --bp-md. Set false only when the columns are meaningless apart. */
  readonly responsive = input(true, { transform: booleanAttribute });
  /** Which column the rows are ordered by and which way. Controlled: ArenaTable draws the caret and the aria-sort, and the consumer does the ordering, because ArenaTable does not hold the rows. Absent, no header is a sort target. */
  readonly sort = input<ArenaTableSort>();
  /** How the sort affordance is reached in CARD MODE, where there is no header row to activate and a `sortable` column therefore has no control under it at all. 'auto' draws one compact select above the cards, listing every sortable column in each direction, which is the shape a phone has room for; 'none' leaves card mode unsorted by hand, for a table whose order is the document's rather than the reader's. Above --bp-md the header row is the control and this member draws nothing. The header row does NOT come back below the breakpoint, because card mode exists for the one reason a grid does not fit. It is a member rather than something a consumer draws for themselves because the state it edits, ArenaTableSort, is Arena's: left to each consumer, the label, the option order and the way a direction is worded are invented once per project over a model they did not define. */
  readonly sortControl = input<ArenaTableSortControl>('auto');
  /** Which page of a longer list is on screen. Present, ArenaTable draws its own ArenaPagination below the grid and names it from `label`, which is what gives that required name its uniqueness on a page with two paged tables. Absent, no pager is drawn and the projected rows are the whole list. */
  readonly page = input<ArenaTablePage>();
  /** Whether ArenaTable draws the pager below the grid. 'auto' draws it whenever `page` is bound, which is what a table showing one list of its own wants; 'none' draws nothing and leaves the consumer to place an ArenaPagination themselves, over this table or over two of them at once. It is a separate member from `page` because the two are separate facts: `page` is what the table KNOWS about a longer list, and this is what it DRAWS about it. Bound together, a consumer who wanted the control elsewhere had to withhold `page` and leave the table knowing nothing about paging at all, which is a member deliberately unbound and a comment explaining why. The same split, and the same reasoning, as `sort` and `sortControl`. */
  readonly pageControl = input<ArenaTablePageControl>('auto');
  /** A sortable header was activated, carrying the column and the direction it should become: the same column flips, a different one starts ascending. ArenaTable never reorders anything itself, so a consumer who ignores this event gets a caret that moves and rows that do not, which is why the member is controlled rather than a starting value. */
  readonly sortChange = output<ArenaTableSort>();
  /** A page was chosen, carrying the new 1-based page. It also fires with 1 when the current page has gone PAST THE END, which is the only reset ArenaTable performs; a filter that leaves the page in range is silent, so returning the reader to page one on a change of criterion stays the consumer's, beside the criterion they hold. */
  readonly pageChange = output<number>();

  protected readonly state = inject(ArenaTableState);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly measured = arenaContainerWidth();
  private readonly medium = arenaReadBreakpoint('md');

  protected readonly rows = contentChildren(ArenaTableRow);

  protected readonly narrow = computed(() => {
    const width = this.measured();
    return this.responsive() && width !== null && width < this.medium;
  });

  protected readonly gridLabel = computed(() => {
    const name = this.label();
    if (name.trim() === '') {
      throw new Error('ArenaTable: `label` is required, and names what the rows are — never "ArenaTable"');
    }
    return name;
  });

  protected readonly empty = computed(() => this.rows().length === 0);

  protected readonly gridRole = computed(() => (this.narrow() || this.empty() ? null : 'grid'));

  protected readonly pager = computed(() => (this.pageControl() === 'none' ? undefined : this.page()));

  protected readonly pageCount = computed(() => {
    const paging = this.page();
    if (!paging) return 1;
    return Math.max(1, Math.ceil(paging.total / Math.max(1, paging.size)));
  });

  protected readonly styles = computed(() => arenaTableStyles({ narrow: this.narrow() }));

  protected readonly sortLabel = 'Sort by';

  protected readonly sortable = computed(() => this.columns()
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => column.sortable));

  protected readonly sortBar = computed(() => this.narrow() && !this.empty()
    && this.sortControl() !== 'none' && Boolean(this.sort()) && this.sortable().length > 0);

  protected readonly sortOptions = computed<ArenaSelectOption[]>(() => this.sortable().flatMap(
    ({ column, index }) => [
      { value: arenaSortOptionValue(index, 'asc'), label: `${column.header} \u2191` },
      { value: arenaSortOptionValue(index, 'desc'), label: `${column.header} \u2193` },
    ],
  ));

  protected readonly sortValue = computed(() => {
    const current = this.sort();
    return current ? arenaSortOptionValue(current.column, current.direction) : undefined;
  });

  protected onSortPick(value: string): void {
    const picked = arenaParseSortOption(value);
    if (picked) this.sortChange.emit(picked);
  }

  protected sortStateOf(column: number): string | null {
    if (!this.columns()[column]?.sortable || !this.sort()) return null;
    const current = this.sort();
    if (current?.column !== column) return 'none';
    return current.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected caretOf(column: number): string {
    return this.sort()?.direction === 'asc' ? 'ph-bold ph-caret-up' : 'ph-bold ph-caret-down';
  }

  protected headerClass(column: ArenaTableColumn): string {
    const base = arenaTableStyles({ narrow: false, align: column.align ?? 'left' }).th();
    return column.sortable && this.sort() ? `${base} ${this.styles().thSortable()}` : base;
  }

  protected onHeader(column: number): void {
    if (!this.columns()[column]?.sortable) return;
    const current = this.sort();
    if (!current) return;
    this.sortChange.emit(current.column === column
      ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { column, direction: 'asc' });
  }

  constructor() {
    this.state.columns = this.columns;
    this.state.narrow = this.narrow;
    this.state.rows = this.rows;

    effect(() => {
      const paging = this.page();
      const pages = this.pageCount();
      if (!paging || paging.index <= pages) return;
      untracked(() => this.pageChange.emit(1));
    });

    effect(() => {
      const current = this.sort();
      const columns = this.columns();
      if (!current) return;
      const column = columns[current.column];
      if (column?.sortable) return;
      const name = column ? `"${column.header}"` : 'no column at all';
      arenaWarnOnce(`ArenaTable "${untracked(() => this.label())}": sort.column ${current.column} is ${name},`
        + ' which does not declare `sortable`, so no header is a target and the caret is not drawn.'
        + ' ArenaTableSort.column is an INDEX, so moving a column reorders the rows in silence; keep the'
        + ' sort field inside the column entry it belongs to and the two move together.');
    });

    afterRenderEffect(() => {
      this.state.clamped();
      const grid = this.host.nativeElement.querySelector('[role="grid"]');
      if (!grid) return;
      const active = grid.ownerDocument.activeElement;
      if (!active || !grid.contains(active)) return;
      const role = active.getAttribute('role');
      if (role !== 'gridcell' && role !== 'columnheader') return;
      const stop = grid.querySelector<HTMLElement>(
        '[role="gridcell"][tabindex="0"], [role="columnheader"][tabindex="0"]',
      );
      if (stop && stop !== active) stop.focus();
    });
  }

  protected moveTo(row: number, col: number): void {
    if (!this.state.isStop(row, col)) this.state.cursor.set({ row, col });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as Element | null;
    const role = target?.getAttribute?.('role');
    if (role !== 'gridcell' && role !== 'columnheader') return;

    const lengths = this.state.lengths();
    const at = this.state.clamped();
    let { row, col } = at;

    if (event.key === 'Enter' && at.row === 0) {
      event.preventDefault();
      this.onHeader(at.col);
      return;
    }
    if (event.key === ' ' && at.row === 0) {
      event.preventDefault();
      this.onHeader(at.col);
      return;
    }
    if (event.key === 'ArrowUp') row = Math.max(0, row - 1);
    else if (event.key === 'ArrowDown') row = Math.min(lengths.length - 1, row + 1);
    else if (event.key === 'ArrowLeft') col = Math.max(0, col - 1);
    else if (event.key === 'ArrowRight') col = Math.min(Math.max((lengths[row] ?? 1) - 1, 0), col + 1);
    else if (event.key === 'Home') col = 0;
    else if (event.key === 'End') col = Math.max((lengths[row] ?? 1) - 1, 0);
    else if (event.key === 'Enter') {
      event.preventDefault();
      if (at.row > 0) this.state.activate(at.row);
      return;
    } else return;

    col = Math.min(col, Math.max((lengths[row] ?? 1) - 1, 0));
    event.preventDefault();
    this.moveTo(row, col);
  }
}
