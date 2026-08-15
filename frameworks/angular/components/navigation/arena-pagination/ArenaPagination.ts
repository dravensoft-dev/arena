import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { arenaPageWindow } from './PaginationWindow';
import { arenaPaginationStyles } from './ArenaPagination.variants';
import manifest from './ArenaPagination.classes.generated';

@Component({
  selector: 'arena-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <nav [class]="styles().root()" [attr.data-arena-part]="parts.root" [attr.aria-label]="label()">
      <button type="button" [class]="styles().nav()" [attr.data-arena-part]="parts.nav" [disabled]="page() <= 1"
              aria-label="Previous" (click)="go(page() - 1)">
        <i class="ph-bold ph-caret-left" aria-hidden="true"></i>
      </button>
      @for (slot of slots(); track $index) {
        @if (slot === '…') {
          <span [class]="styles().ellipsis()" [attr.data-arena-part]="parts.ellipsis">{{ slot }}</span>
        } @else {
          <button type="button" [class]="pageClass(slot)" [attr.data-arena-part]="parts.page"
                  [attr.aria-current]="slot === page() ? 'page' : null"
                  (click)="go(slot)">{{ slot }}</button>
        }
      }
      <button type="button" [class]="styles().nav()" [attr.data-arena-part]="parts.nav" [disabled]="page() >= pageCount()"
              aria-label="Next" (click)="go(page() + 1)">
        <i class="ph-bold ph-caret-right" aria-hidden="true"></i>
      </button>
    </nav>
  `,
})
export class ArenaPagination {
  protected readonly parts = manifest.parts;

  /** The current page, 1-based. */
  readonly page = input.required<number>();
  /** How many pages there are. Required, and guarded at runtime: an ArenaPagination with no page count renders a window over nothing. */
  readonly pageCount = input.required<number>();
  /** Names this navigation landmark. Required, and guarded at runtime: two paginated tables in one dashboard is a routine layout, and a shared constant name leaves them indistinguishable while satisfying the requirement mechanically. It was optional with a "ArenaPagination" default for one batch, which narrowed the gap rather than closing it: a name the caller omits is still the constant. Say what is being paged: "Deployments", not "Pages". */
  readonly ariaLabel = input.required<string>();
  /** A page was chosen; carries the new 1-based page. Never fires for the current page, nor for a page outside 1..pageCount. */
  readonly change = output<number>();

  protected readonly label = computed(() => {
    const name = this.ariaLabel();
    if (name.trim() === '') {
      throw new Error('ArenaPagination: `ariaLabel` is required, and names what is being paged');
    }
    return name;
  });

  protected readonly slots = computed(() => {
    const total = this.pageCount();
    if (!Number.isInteger(total) || total < 1) {
      throw new Error('ArenaPagination: `pageCount` is required, and is a whole number of at least 1');
    }
    return arenaPageWindow(this.page(), total);
  });

  protected readonly styles = computed(() => arenaPaginationStyles());

  protected pageClass(page: number): string {
    const styles = arenaPaginationStyles();
    return `${styles.page()} ${page === this.page() ? styles.pageCurrent() : styles.pageOther()}`;
  }

  protected go(page: number): void {
    if (page < 1 || page > this.pageCount() || page === this.page()) return;
    this.change.emit(page);
  }
}
