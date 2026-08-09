import {
  ChangeDetectionStrategy, Component, DestroyRef, booleanAttribute, computed, contentChildren,
  inject, input, output,
} from '@angular/core';
import { isArenaOwnActivation } from '../../../AnchorActivation';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';
import { ArenaTableState } from '../arena-table/ArenaTableState';
import { ArenaTableRowState } from './ArenaTableRowState';
import { arenaTableRowStyles } from './ArenaTableRow.variants';

@Component({
  selector: 'arena-table-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaTableRowState],
  host: { style: 'display: contents' },
  template: `
    <div [class]="rowClass()" [attr.role]="role()" [attr.aria-disabled]="inert()"
         [attr.tabindex]="cardStop()" (keydown)="onKeydown($event)"
         (click)="onClick($event)">
      <ng-content />
    </div>
  `,
})
export class ArenaTableRow {
  /** Whether the row can be activated. A boolean rather than "is `click` bound?": Arena never derives what it draws from what a consumer listens for, because an outbound member's subscriber list is private in at least one platform and a consumer's binding leaves nothing in the DOM to detect, so deriving the interactive shape from it is a divergence waiting to happen, and it was one. Below --bp-md the row is a card, and an interactive card is a role="button" tab stop with an Enter/Space handler; a non-interactive one is inert, because a dead tab stop on every row of every table is worse than the gap it would close. */
  readonly interactive = input(false, { transform: booleanAttribute });
  /** Whether the row is drawn but cannot be activated: a record the consumer's rules lock. It reflects through `aria-disabled` rather than the native attribute, and the card shape stays a role="button" in the tab order rather than leaving it, because a disabled control nobody can reach is a control nobody knows exists. With no `click` there is nothing to disable and the row is inert already. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The row was activated, by pointer or by Enter on one of its cells. No payload, because the consumer wrote this element and already holds the row this is about. */
  readonly click = output<void>();

  private readonly table = inject(ArenaTableState);
  private readonly arenaRowState = inject(ArenaTableRowState);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cells = contentChildren(ArenaTableCell);

  protected readonly role = computed(() => {
    if (!this.table.narrow()) return 'row';
    return this.interactive() ? 'button' : null;
  });

  protected readonly cardStop = computed(() => (this.table.narrow() && this.interactive() ? 0 : null));

  protected readonly inert = computed(() => (this.disabled() ? 'true' : null));

  protected readonly rowClass = computed(() => {
    const narrow = this.table.narrow();
    const styles = arenaTableRowStyles({ narrow });
    if (narrow) return styles.card();
    return this.table.rowIndexOf(this) === 1 ? `${styles.row()} ${styles.rowFirst()}` : styles.row();
  });

  constructor() {
    this.arenaRowState.index = computed(() => this.table.rowIndexOf(this));
    this.arenaRowState.cells = this.cells;
    this.table.registerRow(this, {
      cells: computed(() => this.cells().length),
      activate: () => this.emit(),
    });
    this.destroyRef.onDestroy(() => this.table.releaseRow(this));
  }

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.ownActivation(event)) return;
    this.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.table.narrow() || !this.interactive()) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    if (!this.ownActivation(event)) return;
    this.emit();
  }

  private ownActivation(event: Event): boolean {
    const container = event.currentTarget;
    return !(container instanceof Element) || isArenaOwnActivation(event.target, container);
  }

  private emit(): void {
    if (this.interactive() && !this.disabled()) this.click.emit();
  }
}
