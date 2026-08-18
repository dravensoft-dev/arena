import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ArenaKeyValueRow } from '../../../Api.generated';
import { arenaKeyValueStyles } from './ArenaKeyValue.variants';
import manifest from './ArenaKeyValue.classes.generated';

@Component({
  selector: 'arena-key-value',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <dl [class]="styles().root()" [attr.data-arena-part]="parts.root">
      @for (row of rows(); track $index) {
        <div [class]="styles().row()" [attr.data-arena-part]="parts.row">
          <dt [class]="styles().term()" [attr.data-arena-part]="parts.term">{{ row.term }}</dt>
          <dd [class]="row.numeric ? styles().valueNumeric() : styles().value()"
              [attr.data-arena-part]="parts.value">{{ row.value }}</dd>
        </div>
      }
      @if (total(); as sum) {
        <div [class]="styles().total()" [attr.data-arena-part]="parts.total">
          <dt [class]="styles().totalTerm()" [attr.data-arena-part]="parts.totalTerm">{{ sum.term }}</dt>
          <dd [class]="sum.numeric ? styles().totalValueNumeric() : styles().totalValue()"
              [attr.data-arena-part]="parts.totalValue">{{ sum.value }}</dd>
        </div>
      }
    </dl>
  `,
})
export class ArenaKeyValue {
  protected readonly parts = manifest.parts;

  /** The rows, in the order they are given. An empty array renders an empty list rather than throwing, because a summary with nothing to adjust is a state a basket reaches on its way to being filled and not a mistake in the markup. */
  readonly rows = input.required<readonly ArenaKeyValueRow[]>();
  /** The row the others add up to, drawn last, ruled off above and set in the heading register. It is a member rather than the last element of rows because the rule and the register are what say a total is a total, and deriving that from position would make the last adjustment in a list look like one. */
  readonly total = input<ArenaKeyValueRow>();

  protected readonly styles = computed(() => arenaKeyValueStyles());
}
