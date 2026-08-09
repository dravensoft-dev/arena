import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { arenaStatCardStyles } from './ArenaStatCard.variants';
import type { ArenaTone, ArenaStatDelta } from '../../../Api.generated';

@Component({
  selector: 'arena-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'styles().root()' },
  template: `
    <div [class]="styles().head()">
      <span [class]="styles().label()">{{ label() }}</span>
      @if (icon(); as glyph) {
        <span [class]="styles().icon()" aria-hidden="true"><i [class]="glyph"></i></span>
      }
    </div>
    <div [class]="styles().value()">{{ value() }}</div>
    @if (delta()?.value; as amount) {
      <span [class]="styles().delta()">
        <i [class]="delta()?.direction === 'down' ? 'ph-bold ph-arrow-down' : 'ph-bold ph-arrow-up'" aria-hidden="true"></i>
        {{ amount }}
      </span>
    }
    @if (sub(); as caption) {
      <span [class]="styles().sub()">{{ caption }}</span>
    }
  `,
})
export class ArenaStatCard {
  /** Short uppercase microlabel, two words at most. */
  readonly label = input.required<string>();
  /** Preformatted, e.g. "1,284" or "99.9%". ArenaStatCard never formats. */
  readonly value = input.required<string>();
  /** What state the number IS in right now, as against how it moved. ArenaBadge's vocabulary. */
  readonly tone = input<ArenaTone, ArenaTone | undefined>(
    'neutral',
    { transform: (value) => value ?? 'neutral' },
  );
  /** How the number moved. Absent renders no pill. */
  readonly delta = input<ArenaStatDelta>();
  /** Small muted line under the value: context, e.g. "vs last week". */
  readonly sub = input<string>();
  /** A Phosphor class name for a small glyph beside the label, drawn muted. Arena renders the aria-hidden wrapper and the `<i>`. */
  readonly icon = input<string>();

  protected readonly styles = computed(() => arenaStatCardStyles({ tone: this.tone(), deltaTone: this.delta()?.tone ?? 'neutral' }));
}
