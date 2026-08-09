import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { ArenaTableColumn } from '../../../Api.generated';
import { ArenaTableState } from '../arena-table/ArenaTableState';
import { ArenaTableRowState } from '../arena-table-row/ArenaTableRowState';
import { arenaTableCellStyles } from './ArenaTableCell.variants';

const PLAIN: ArenaTableColumn = { header: '' };

@Component({
  selector: 'arena-table-cell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'cellClass()',
    '[attr.role]': 'role()',
    '[attr.tabindex]': 'tabIndex()',
    '[style.width]': 'width()',
    '(focus)': 'onFocus()',
  },
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #value><ng-content /></ng-template>
    @if (narrow()) {
      @if (labelled()) {
        <span [class]="styles().cardLabel()">{{ column().header }}</span>
      }
      <span [class]="valueClass()"><ng-container *ngTemplateOutlet="value" /></span>
    } @else {
      <ng-container *ngTemplateOutlet="value" />
    }
  `,
})
export class ArenaTableCell {
  private readonly table = inject(ArenaTableState);
  private readonly row = inject(ArenaTableRowState);

  protected readonly columnIndex = computed(() => this.row.columnIndexOf(this));

  protected readonly column = computed(() => this.table.columns()[this.columnIndex()] ?? PLAIN);

  protected readonly narrow = computed(() => this.table.narrow());

  protected readonly styles = computed(() => arenaTableCellStyles({ narrow: this.narrow() }));

  protected readonly labelled = computed(() => this.narrow() && this.column().mobileLayout !== 'block');

  protected readonly role = computed(() => (this.narrow() ? null : 'gridcell'));

  protected readonly width = computed(() => (this.narrow() ? null : this.column().width ?? null));

  protected readonly tabIndex = computed(() => {
    if (this.narrow()) return null;
    return this.table.isStop(this.row.index(), this.columnIndex()) ? 0 : -1;
  });

  protected readonly cellClass = computed(() => {
    const column = this.column();
    if (this.narrow()) {
      const styles = arenaTableCellStyles({ narrow: true });
      return column.mobileLayout === 'block' ? styles.cardBlock() : styles.cardRow();
    }
    const styles = arenaTableCellStyles({ narrow: false, align: column.align ?? 'left' });
    return column.mono ? styles.tdMono() : styles.td();
  });

  protected readonly valueClass = computed(() => {
    if (!this.narrow() || this.column().mobileLayout === 'block') return '';
    const styles = arenaTableCellStyles({ narrow: true });
    return this.column().mono ? styles.cardValueMono() : styles.cardValue();
  });

  protected onFocus(): void {
    if (this.narrow()) return;
    this.table.cursor.set({ row: this.row.index(), col: this.columnIndex() });
  }
}
