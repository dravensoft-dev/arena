import {
  booleanAttribute, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, output, signal,
} from '@angular/core';
import { ArenaRadioGroupState } from './ArenaRadioGroupState';
import { arenaRadioGroupStyles } from './ArenaRadioGroup.variants';
import manifest from '../arena-radio/ArenaRadio.classes.generated';
import { ArenaIdGenerator } from '../../../ArenaIds';
import { ArenaControlBinding, arenaWarnDoubleBinding } from '../../../ControlBinding';

@Component({
  selector: 'arena-radio-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaRadioGroupState, ArenaControlBinding],
  host: {
    'data-arena-boundary': '',
    '[class]': 'styles().group()',
    '[attr.data-arena-part]': 'parts.group',
    role: 'radiogroup',
    '[attr.aria-label]': 'label()',
    '[attr.aria-disabled]': "off() ? 'true' : null",
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
  /** Shared name for the underlying radios; generated when omitted or blank. */
  readonly name = input<string>();
  /** Whether the whole group is unavailable. Every radio it holds is disabled whatever its own disabled says, and the group reflects aria-disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** A different option was chosen; carries its value. */
  readonly valueChange = output<string>();

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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly binding = inject(ArenaControlBinding);
  protected readonly off = computed(() => this.disabled() || this.binding.disabled());
  private readonly warned = effect(() => {
    if (this.binding.bound() && this.value() !== undefined) arenaWarnDoubleBinding('ArenaRadioGroup', 'value');
  });

  constructor() {
    this.state.groupName = computed(() => this.name() || this.fallbackName);
    this.state.selected = computed(() => (this.binding.bound() ? (this.binding.value() as string | undefined) : this.value() ?? this.chosen()));
    this.state.disabled = this.off;
    this.state.choose = (value: string) => {
      this.chosen.set(value);
      if (this.binding.bound()) this.binding.value.set(value);
      this.valueChange.emit(value);
      this.binding.onChange(value);
    };
    this.state.resync = () => {
      const selected = this.state.selected();
      for (const input of this.host.nativeElement.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
        input.checked = input.value === selected;
      }
    };
  }
}
