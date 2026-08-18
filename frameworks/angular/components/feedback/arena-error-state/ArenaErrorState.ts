import { ChangeDetectionStrategy, Component, computed, contentChild, input, output } from '@angular/core';
import type { ArenaHeadingLevel } from '../../../Api.generated';
import { ArenaButton } from '../../forms/arena-button/ArenaButton';
import { ArenaSecondaryAction } from '../../../ProjectionMarkers';
import { arenaErrorStateStyles } from './ArenaErrorState.variants';
import manifest from './ArenaErrorState.classes.generated';

@Component({
  selector: 'arena-error-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    role: 'alert',
    '[attr.title]': 'null',
  },
  imports: [ArenaButton],
  template: `
    @if (icon(); as glyph) {
      <div [class]="styles().icon()" [attr.data-arena-part]="parts.icon"><i [class]="glyph" aria-hidden="true"></i></div>
    }
    @switch (headingLevel()) {
      @case ('h1') { <h1 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ title() }}</h1> }
      @case ('h2') { <h2 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ title() }}</h2> }
      @case ('h3') { <h3 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ title() }}</h3> }
      @case ('h4') { <h4 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ title() }}</h4> }
      @default { <div [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ title() }}</div> }
    }
    @if (message(); as body) {
      <div [class]="styles().message()" [attr.data-arena-part]="parts.message">{{ body }}</div>
    }
    @if (code(); as support) {
      <code [class]="styles().code()" [attr.data-arena-part]="parts.code">{{ support }}</code>
    }
    @if (retryLabel() || secondaryAction()) {
      <div [class]="styles().actions()" [attr.data-arena-part]="parts.actions">
        @if (retryLabel(); as label) {
          <arena-button variant="primary" (click)="retry.emit()">{{ label }}</arena-button>
        }
        <ng-content select="[secondaryAction]" />
      </div>
    }
  `,
})
export class ArenaErrorState {
  protected readonly parts = manifest.parts;

  /** A Phosphor class name for the danger glyph Arena draws. */
  readonly icon = input<string>();
  /** The headline: what failed. */
  readonly title = input<string, string | undefined>(
    'Something went wrong',
    { transform: (value) => value ?? 'Something went wrong' },
  );
  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h3`, the card rung of the title ladder, for the reason an empty state does: a failure fills the body of a region something above it already names. `none` takes the headline out of the outline, which is what a failure inside a small surface wants, and it is available here because `title` carries a default rather than being required. */
  readonly headingLevel = input<ArenaHeadingLevel, ArenaHeadingLevel | undefined>(
    'h3', { transform: (value) => value ?? 'h3' },
  );
  /** A sentence of detail under the title. */
  readonly message = input<string>();
  /** A diagnostic/support code, shown monospaced. */
  readonly code = input<string>();
  /** The label of the retry button Arena draws. Absent renders no retry. */
  readonly retryLabel = input<string>();
  /** The retry button was activated. */
  readonly retry = output<void>();

  protected readonly secondaryAction = contentChild(ArenaSecondaryAction);

  protected readonly styles = computed(() => arenaErrorStateStyles());
}
