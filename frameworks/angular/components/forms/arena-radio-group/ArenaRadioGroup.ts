import {
  ChangeDetectionStrategy, Component, computed, inject, input, output, signal,
} from '@angular/core';
import { ArenaRadioGroupState } from './ArenaRadioGroupState';
import { arenaRadioGroupStyles } from './ArenaRadioGroup.variants';
import manifest from '../arena-radio/ArenaRadio.classes.generated';
import { ArenaIdGenerator } from '../../../ArenaIds';

@Component({
  selector: 'arena-radio-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaRadioGroupState],
  host: {
    '[class]': 'styles().group()',
    '[attr.data-arena-part]': 'parts.group',
    role: 'radiogroup',
    '[attr.aria-label]': 'label()',
    '[attr.name]': 'null',
  },
  template: `<ng-content />`,
})
export class ArenaRadioGroup {
  protected readonly parts = manifest.parts;

  /** Names the group: what is being chosen, not that it is a choice. Required, and guarded at runtime: a radiogroup with no accessible name is announced unlabelled, and each option's own label says what that option is, never what the set is for. "Deployment target", not "Options". Distinct from `name`, which is the radios' shared form name and never reaches a screen reader. */
  readonly ariaLabel = input.required<string>();
  /** The selected option's value. */
  readonly value = input<string>();
  /** Shared name for the underlying radios; generated when omitted. */
  readonly name = input<string>();
  /** A different option was chosen; carries its value. */
  readonly change = output<string>();

  protected readonly label = computed(() => {
    const name = this.ariaLabel();
    if (name.trim() === '') {
      throw new Error('ArenaRadioGroup: `ariaLabel` is required, and names what is being chosen');
    }
    return name;
  });

  protected readonly styles = computed(() => arenaRadioGroupStyles());

  private readonly fallbackName = inject(ArenaIdGenerator).next('arena-radio-group');
  private readonly chosen = signal<string | undefined>(undefined);
  private readonly state = inject(ArenaRadioGroupState);

  constructor() {
    this.state.groupName = computed(() => this.name() ?? this.fallbackName);
    this.state.selected = computed(() => this.value() ?? this.chosen());
    this.state.choose = (value: string) => {
      this.chosen.set(value);
      this.change.emit(value);
    };
  }
}
