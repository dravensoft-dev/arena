import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ArenaControlSize, ArenaSpinnerTone } from '../../../Api.generated';
import { arenaSpinnerStyles } from './ArenaSpinner.variants';
import manifest from './ArenaSpinner.classes.generated';

@Component({
  selector: 'arena-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    role: 'progressbar',
    'aria-live': 'polite',
    '[attr.aria-label]': 'label()',
  },
  template: `<span [class]="styles().circle()" [attr.data-arena-part]="parts.circle" aria-hidden="true"></span>`,
})
export class ArenaSpinner {
  protected readonly parts = manifest.parts;

  /** Diameter. 'sm' is --icon-sm exactly, so a spinner at that size sits inline with control text. */
  readonly size = input<ArenaControlSize, ArenaControlSize | undefined>(
    'md',
    { transform: (value) => value ?? 'md' },
  );
  /** Colour of the ring. 'on-accent' inside a filled button; 'accent' on a page surface. */
  readonly tone = input<ArenaSpinnerTone, ArenaSpinnerTone | undefined>(
    'accent',
    { transform: (value) => value ?? 'accent' },
  );
  /** Accessible name, announced by the status role. Say what is loading when you can. */
  readonly label = input<string, string | undefined>('Loading', { transform: (value) => value ?? 'Loading' });

  protected readonly styles = computed(() => arenaSpinnerStyles({ tone: this.tone(), size: this.size() }));
}
