import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { ArenaTableColumn } from '../../../Api.generated';
import { isArenaPrimaryActivation } from '../../../AnchorActivation';
import { ArenaTableState } from '../arena-table/ArenaTableState';
import { ArenaTableRowState } from '../arena-table-row/ArenaTableRowState';
import { arenaTableCellStyles } from './ArenaTableCell.variants';
import manifest from '../arena-table/ArenaTable.classes.generated';

const PLAIN: ArenaTableColumn = { header: '' };

@Component({
  selector: 'td[arena-table-cell]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'cellClass()',
    '[attr.data-arena-part]': 'narrow() ? (blocked() ? parts.cardBlock : parts.cardRow) : parts.td',
    '[attr.role]': 'role()',
    '[attr.tabindex]': 'tabIndex()',
    '[style.width]': 'width()',
    '(focus)': 'onFocus()',
  },
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #value><ng-content /></ng-template>
    <ng-template #shown>
      @if (href(); as url) {
        <a [class]="styles().link()" [attr.data-arena-part]="parts.link" [href]="url"
           (click)="onAnchorClick($event)"><ng-container *ngTemplateOutlet="value" /></a>
      } @else {
        <ng-container *ngTemplateOutlet="value" />
      }
    </ng-template>
    @if (narrow()) {
      @if (labelled()) {
        <span [class]="styles().cardLabel()" [attr.data-arena-part]="parts.cardLabel">{{ column().header }}</span>
      }
      <span [class]="valueClass()" [attr.data-arena-part]="parts.cardValue"><ng-container *ngTemplateOutlet="shown" /></span>
    } @else {
      <ng-container *ngTemplateOutlet="shown" />
    }
  `,
})
export class ArenaTableCell {
  protected readonly parts = manifest.parts;

  /** Present => the cell draws an <a> around its content, inside its own box, which is where HTML admits one and why this member is the cell's rather than the row's: an anchor wrapping a row would break the row/cell structure the grid is made of, and may not contain the button a cell's own contract invites. It carries the settled anchor convention rather than restating it, the fifth member to do so after ArenaCard.href, ArenaCommand.route, ArenaCrumb.href and ArenaSideNavItem.href: a primary click with no modifier is cancelled and reported through `navigate`, so a router owns it, and ctrl, meta, shift, alt, a middle click and a context menu stay the browser's and report nothing. The anchor is a tab stop of its own, which is the answer this table already gives for a control a consumer puts in a cell, so it is one Tab from the cell rather than a step-in the grid does not have. Inside a row carrying `interactive` the anchor wins and the row does not fire, because a press that lands on a control inside the row was never the row's. It survives both shapes: below --bp-md the anchor is still an anchor and does not compete with the row's role="button", by the same predicate. */
  readonly href = input<string>();
  /** The cell's anchor was activated by the one activation a router owns, a primary click with no modifier, and Arena has already cancelled the anchor's own navigation by the time it fires; a modified click, a middle click and a context menu are the browser's and do not fire it at all. No payload, because the consumer wrote this element and already holds what it is about, the same shape as ArenaTableRow.click. It is `navigate` rather than a `click` because the cell has no other activation to report: with no `href` there is no anchor, and an event that only ever fires for one member is named after what that member does. */
  readonly navigate = output<void>();

  private readonly table = inject(ArenaTableState);
  private readonly row = inject(ArenaTableRowState);

  protected readonly columnIndex = computed(() => this.row.columnIndexOf(this));

  protected readonly column = computed(() => this.table.columns()[this.columnIndex()] ?? PLAIN);

  protected readonly narrow = computed(() => this.table.narrow());

  protected readonly styles = computed(() => arenaTableCellStyles({ narrow: this.narrow() }));

  protected readonly labelled = computed(() => this.narrow() && this.column().mobileLayout !== 'block');

  protected readonly role = computed(() => (this.narrow() ? 'presentation' : null));

  protected readonly width = computed(() => (this.narrow() ? null : this.column().width ?? null));

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

  protected onAnchorClick(event: MouseEvent): void {
    if (!isArenaPrimaryActivation(event)) return;
    event.preventDefault();
    this.navigate.emit();
  }
}
