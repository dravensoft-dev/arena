import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { ArenaSpinnerTone } from '../../../Api.generated';
import { arenaSpinnerStyles } from './ArenaSpinner.variants';
import manifest from './ArenaSpinner.classes.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaSlotAttributes } from '../../../SlotData';

@Component({
  selector: 'arena-spinner',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-tone]': "styles().$data.root()['data-arena-tone'] ?? null",
    '[attr.data-arena-part]': 'parts.root',
    role: 'progressbar',
    'aria-live': 'polite',
    '[attr.aria-label]': 'name()',
  },
  template: `<span [class]="styles().circle()" [arenaSlotData]="styles().$data.circle()" [attr.data-arena-part]="parts.circle" aria-hidden="true"></span>`,
})
export class ArenaSpinner {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);
  protected readonly name = computed(() => this.label() ?? this.locale.spinnerLabel);

  /** Colour of the ring. 'on-accent' inside a filled button; 'accent' on a page surface. */
  readonly tone = input<ArenaSpinnerTone, ArenaSpinnerTone | undefined>(
    'accent',
    { transform: (value) => value ?? 'accent' },
  );
  /** Accessible name, announced by the status role. Say what is loading when you can. Absent, the provided locale's spinnerLabel answers it, which reads Loading by default. */
  readonly label = input<string>();

  protected readonly styles = computed(() => arenaSpinnerStyles({ tone: this.tone() }));
}
