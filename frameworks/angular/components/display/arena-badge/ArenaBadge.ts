import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import type { ArenaTone } from '../../../Api.generated';
import { arenaBadgeStyles } from './ArenaBadge.variants';

@Component({
  selector: 'arena-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'styles().root()' },
  template: `
    @if (dot()) {
      <span [class]="styles().dot()"></span>
    }
    <ng-content />
  `,
})
export class ArenaBadge {
  /** System status (success/warning/danger/info) reflects an object's actual state; emphasis (accent, gold) is editorial; neutral carries no semantic weight. */
  readonly tone = input<ArenaTone, ArenaTone | undefined>(
    'neutral',
    { transform: (value) => value ?? 'neutral' },
  );
  /** Draws a filled dot in the tone colour before the label. */
  readonly dot = input(false, { transform: booleanAttribute });

  protected readonly styles = computed(() => arenaBadgeStyles({ tone: this.tone() }));
}
