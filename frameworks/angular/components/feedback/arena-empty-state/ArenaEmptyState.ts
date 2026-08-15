import { ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import { ArenaAction } from '../../../ProjectionMarkers';
import { arenaEmptyStateStyles } from './ArenaEmptyState.variants';
import manifest from './ArenaEmptyState.classes.generated';

@Component({
  selector: 'arena-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.title]': 'null',
  },
  template: `
    @if (icon(); as glyph) {
      <div [class]="styles().icon()" [attr.data-arena-part]="parts.icon"><i [class]="glyph" aria-hidden="true"></i></div>
    }
    @if (title(); as heading) {
      <div [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading }}</div>
    }
    @if (message(); as body) {
      <div [class]="styles().message()" [attr.data-arena-part]="parts.message">{{ body }}</div>
    }
    @if (action()) {
      <div [class]="styles().action()" [attr.data-arena-part]="parts.action"><ng-content select="[action]" /></div>
    }
  `,
})
export class ArenaEmptyState {
  protected readonly parts = manifest.parts;

  /** A Phosphor class name for the glyph Arena draws, muted. */
  readonly icon = input<string>();
  /** The headline: what is empty. */
  readonly title = input.required<string>();
  /** A sentence of guidance under the title. */
  readonly message = input<string>();

  protected readonly action = contentChild(ArenaAction);

  protected readonly styles = computed(() => arenaEmptyStateStyles());
}
