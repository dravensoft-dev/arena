import { ChangeDetectionStrategy, Component, computed, contentChild, input, output } from '@angular/core';
import { ArenaSecondaryAction } from '../../../ProjectionMarkers';
import { arenaErrorStateStyles } from './ArenaErrorState.variants';

@Component({
  selector: 'arena-error-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    role: 'alert',
    '[attr.title]': 'null',
  },
  template: `
    @if (icon(); as glyph) {
      <div [class]="styles().icon()"><i [class]="glyph" aria-hidden="true"></i></div>
    }
    <div [class]="styles().title()">{{ title() }}</div>
    @if (message(); as body) {
      <div [class]="styles().message()">{{ body }}</div>
    }
    @if (code(); as support) {
      <code [class]="styles().code()">{{ support }}</code>
    }
    @if (retryLabel() || secondaryAction()) {
      <div [class]="styles().actions()">
        @if (retryLabel(); as label) {
          <button type="button" [class]="styles().retry()" (click)="retry.emit()">{{ label }}</button>
        }
        <ng-content select="[secondaryAction]" />
      </div>
    }
  `,
})
export class ArenaErrorState {
  /** A Phosphor class name for the danger glyph Arena draws. */
  readonly icon = input<string>();
  /** The headline: what failed. */
  readonly title = input<string, string | undefined>(
    'Something went wrong',
    { transform: (value) => value ?? 'Something went wrong' },
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
