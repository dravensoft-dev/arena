import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { ArenaTableColumn } from '../../../Api.generated';
import { isArenaPrimaryActivation } from '../../../AnchorActivation';
import { ArenaTableState } from '../arena-table/ArenaTableState';
import { arenaColumnKey } from '../arena-table/ColumnKey';
import { ArenaTableRowState } from '../arena-table-row/ArenaTableRowState';
import { arenaTableCellStyles } from './ArenaTableCell.variants';
import manifest from '../arena-table/ArenaTable.classes.generated';
import { ArenaSlotAttributes } from '../../../SlotData';

const PLAIN: ArenaTableColumn = { header: '' };

@Component({
  selector: 'td[arena-table-cell]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'cellClass()',
    '[attr.data-arena-align]': "cellData()['data-arena-align'] ?? null",
    '[attr.data-arena-numeric]': "cellData()['data-arena-numeric'] ?? null",
    'data-arena-boundary': '',
    '[attr.data-arena-part]': 'narrow() ? (blocked() ? parts.cardBlock : parts.cardRow) : parts.td',
    '[attr.role]': 'role()',
    '[attr.tabindex]': 'tabIndex()',
    '[style.--arena-column-width]': 'columnWidth()',
    '[style.--arena-column-align]': 'columnAlign()',
    '(focus)': 'onFocus()',
  },
  imports: [NgTemplateOutlet, ArenaSlotAttributes],
  template: `
    <ng-template #value><ng-content /></ng-template>
    <ng-template #shown>
      @if (href(); as url) {
        <a [class]="styles().link()" [attr.data-arena-part]="parts.link" data-arena-boundary [href]="url"
           (click)="onAnchorClick($event)"><ng-container *ngTemplateOutlet="value" /></a>
      } @else {
        <ng-container *ngTemplateOutlet="value" />
      }
    </ng-template>
    @if (narrow()) {
      @if (labelled()) {
        <span [class]="styles().cardLabel()" [attr.data-arena-part]="parts.cardLabel">{{ column().header }}</span>
      }
      <span [class]="valueClass()" [arenaSlotData]="valueData()" [attr.data-arena-part]="parts.cardValue" data-arena-boundary><ng-container *ngTemplateOutlet="shown" /></span>
    } @else {
      <ng-container *ngTemplateOutlet="shown" />
    }
  `,
})
export class ArenaTableCell {
  protected readonly parts = manifest.parts;

  /** Present => the cell draws an <a> around its content, inside its own box, which is where HTML admits one. The member is the cell's rather than the row's. An anchor wrapping a row would break the row/cell structure the grid is made of, and may not contain the button a cell's own contract invites. The member carries the settled anchor convention rather than restating it, the same convention as ArenaCard.href, ArenaCommand.route, ArenaCrumb.href and ArenaSideNavItem.href. A primary click with no modifier is cancelled and reported through `navigate`, so a router owns it. Ctrl, meta, shift, alt, a middle click and a context menu stay the browser's and report nothing. The anchor is a tab stop of its own, which is the answer this table already gives for a control a consumer puts in a cell. The anchor is one Tab from the cell rather than a step-in the grid does not have. Inside a row carrying `interactive` the anchor wins and the row does not fire, because a press that lands on a control inside the row is never the row's. The anchor survives both shapes: below --bp-md the anchor is still an anchor and does not compete with the row's role="button", by the same predicate. */
  readonly href = input<string>();
  /** The cell's anchor was activated by the one activation a router owns, a primary click with no modifier. Arena has already cancelled the anchor's own navigation by the time the event fires. A modified click, a middle click and a context menu are the browser's and do not fire it at all. No payload, because the consumer wrote this element and already holds what it is about, the same shape as ArenaTableRow.click. The event is named `navigate` rather than click, because the cell has no other activation to report: with no `href` there is no anchor. An event that only ever fires for one member is named after what that member does. */
  readonly navigate = output<void>();

  private readonly table = inject(ArenaTableState);
  private readonly row = inject(ArenaTableRowState);

  protected readonly columnIndex = computed(() => this.row.columnIndexOf(this));

  protected readonly column = computed(() => this.table.columns()[this.columnIndex()] ?? PLAIN);

  protected readonly narrow = computed(() => this.table.narrow());

  protected readonly styles = computed(() => arenaTableCellStyles({ narrow: this.narrow() }));

  protected readonly labelled = computed(() => this.narrow() && this.column().mobileLayout !== 'block');

  protected readonly role = computed(() => (this.narrow() ? 'presentation' : null));

  protected readonly columnKey = computed(() => (this.narrow() ? null : arenaColumnKey(this.table.label(), this.column().key)));

  protected readonly columnWidth = computed(() => {
    const key = this.columnKey();
    return key === null ? 'initial' : `var(--arena-column-${key}-width)`;
  });

  protected readonly columnAlign = computed(() => {
    const key = this.columnKey();
    return key === null ? 'initial' : `var(--arena-column-${key}-align)`;
  });

  protected readonly tabIndex = computed(() => {
    if (this.narrow()) return null;
    return this.table.isStop(this.row.index(), this.columnIndex()) ? 0 : -1;
  });

  protected readonly blocked = computed(() => this.column().mobileLayout === 'block');

  protected readonly cellClass = computed(() => {
    const column = this.column();
    if (this.narrow()) {
      const styles = arenaTableCellStyles({ narrow: true });
      return column.mobileLayout === 'block' ? styles.cardBlock() : styles.cardRow();
    }
    return arenaTableCellStyles({ narrow: false, numeric: Boolean(column.numeric) }).td();
  });

  protected readonly cellData = computed(() => {
    const column = this.column();
    if (this.narrow()) {
      const styles = arenaTableCellStyles({ narrow: true });
      return column.mobileLayout === 'block' ? styles.$data.cardBlock() : styles.$data.cardRow();
    }
    return arenaTableCellStyles({ narrow: false, numeric: Boolean(column.numeric) }).$data.td();
  });

  protected readonly valueData = computed(() => {
    if (!this.narrow() || this.column().mobileLayout === 'block') return {};
    return arenaTableCellStyles({ narrow: true, numeric: Boolean(this.column().numeric) }).$data.cardValue();
  });

  protected readonly valueClass = computed(() => {
    if (!this.narrow() || this.column().mobileLayout === 'block') return '';
    return arenaTableCellStyles({ narrow: true, numeric: Boolean(this.column().numeric) }).cardValue();
  });

  protected onFocus(): void {
    if (this.narrow()) return;
    this.table.moveTo(this.row.index(), this.columnIndex());
  }

  protected onAnchorClick(event: MouseEvent): void {
    if (!isArenaPrimaryActivation(event)) return;
    event.preventDefault();
    this.navigate.emit();
  }
}
