import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { arenaStatCardStyles } from './ArenaStatCard.variants';
import manifest from './ArenaStatCard.classes.generated';
import type { ArenaTone, ArenaStatDelta } from '../../../Api.generated';

@Component({
  selector: 'arena-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root', },
  template: `
    <div [class]="styles().head()" [attr.data-arena-part]="parts.head">
      <span [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ label() }}</span>
      @if (icon(); as glyph) {
        <span [class]="styles().icon()" [attr.data-arena-part]="parts.icon" aria-hidden="true"><i [class]="glyph"></i></span>
      }
    </div>
    <div [class]="styles().value()" [attr.data-arena-part]="parts.value">{{ value() }}</div>
    @if (delta()?.value; as amount) {
      <span [class]="styles().delta()" [attr.data-arena-part]="parts.delta">
        <i [class]="delta()?.direction === 'down' ? 'ph-bold ph-arrow-down' : 'ph-bold ph-arrow-up'" aria-hidden="true"></i>
        {{ amount }}
      </span>
    }
    @if (sub(); as caption) {
      <span [class]="styles().sub()" [attr.data-arena-part]="parts.sub">{{ caption }}</span>
    }
  `,
})
export class ArenaStatCard {
  protected readonly parts = manifest.parts;

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
