import { ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import { ArenaActions } from '../../../ProjectionMarkers';
import { arenaChartCardStyles } from './ArenaChartCard.variants';
import manifest from './ArenaChartCard.classes.generated';

@Component({
  selector: 'arena-chart-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.title]': 'null',
  },
  template: `
    @if (title() || actions()) {
      <div [class]="styles().head()" [attr.data-arena-part]="parts.head">
        @if (title(); as label) {
          <span [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ label }}</span>
        }
        @if (actions()) {
          <div [class]="styles().actions()" [attr.data-arena-part]="parts.actions"><ng-content select="[actions]" /></div>
        }
      </div>
    }
    <ng-content />
  `,
})
export class ArenaChartCard {
  protected readonly parts = manifest.parts;

  /** The card heading. Absent renders no head unless `actions` is present. */
  readonly title = input<string>();

  protected readonly actions = contentChild(ArenaActions);

  protected readonly styles = computed(() => arenaChartCardStyles());
}
