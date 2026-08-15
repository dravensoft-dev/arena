import { ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import { ArenaCard } from '../arena-card/ArenaCard';
import { ArenaBrand, ArenaFooter } from '../../../ProjectionMarkers';
import { arenaUnauthCardStyles } from './ArenaUnauthCard.variants';
import manifest from './ArenaUnauthCard.classes.generated';

@Component({
  selector: 'arena-unauth-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.title]': 'null',
  },
  imports: [ArenaCard],
  template: `
    <arena-card>
      <div [class]="styles().body()" [attr.data-arena-part]="parts.body">
        @if (brand()) {
          <div [class]="styles().brand()" [attr.data-arena-part]="parts.brand"><ng-content select="[brand]" /></div>
        }
        @if (eyebrow(); as label) {
          <div [class]="styles().eyebrow()" [attr.data-arena-part]="parts.eyebrow">{{ label }}</div>
        }
        @if (title(); as heading) {
          <div [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading }}</div>
        }
        <ng-content />
        @if (footer()) {
          <div [class]="styles().footer()" [attr.data-arena-part]="parts.footer"><ng-content select="[footer]" /></div>
        }
      </div>
    </arena-card>
  `,
})
export class ArenaUnauthCard {
  protected readonly parts = manifest.parts;

  /** Mono crimson microlabel: the product, not the task. */
  readonly eyebrow = input<string>();
  /** The task. "Welcome back", "Check your inbox". */
  readonly title = input<string>();

  protected readonly brand = contentChild(ArenaBrand);
  protected readonly footer = contentChild(ArenaFooter);

  protected readonly styles = computed(() => arenaUnauthCardStyles());
}
