import {
  booleanAttribute, ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, output,
} from '@angular/core';
import type { ArenaValueSet } from '../../../Api.generated';
import { ArenaCheckboxGroupState } from './ArenaCheckboxGroupState';
import { arenaCheckboxGroupStyles } from './ArenaCheckboxGroup.variants';
import manifest from '../arena-checkbox/ArenaCheckbox.classes.generated';
import { ArenaIdGenerator } from '../../../ArenaIds';
import { ArenaControlBinding, arenaWarnDoubleBinding } from '../../../ControlBinding';

function toggled(values: readonly string[], value: string, checked: boolean): string[] {
  if (!checked) return values.filter((one) => one !== value);
  return values.includes(value) ? [...values] : [...values, value];
}

@Component({
  selector: 'arena-checkbox-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaCheckboxGroupState, ArenaControlBinding],
  host: {
    'data-arena-boundary': '',
    '[class]': 'styles().group()',
    '[attr.data-arena-part]': 'parts.group',
    role: 'group',
    '[attr.aria-label]': 'label()',
    '[attr.aria-disabled]': "off() ? 'true' : null",
    '[attr.name]': 'null',
  },
  template: `<ng-content />`,
})
export class ArenaCheckboxGroup {
  protected readonly parts = manifest.parts;

  /** Names the group: what the choices are about, not that they are choices. Required, and guarded at runtime: a group with no accessible name is announced unlabelled, and each box's own label says what that box is, never what the set is for. "Notify me about", not "Options". Distinct from `name`, which is the boxes' shared form name and never reaches a screen reader. */
  readonly ariaLabel = input.required<string>();
  /** The ticked boxes' values, in the order they were ticked. A value that matches no box is kept rather than dropped. */
  readonly value = input<readonly string[], readonly string[] | undefined>([], { transform: (value) => value ?? [] });
  /** Shared form name for the underlying checkboxes, so a form submits every ticked value under one key; generated when omitted or blank. */
  readonly name = input<string>();
  /** Whether the whole group is unavailable. Every box it holds is disabled whatever its own disabled says, and the group reflects aria-disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** A box was ticked or unticked; carries the whole set after the change. The native change of the inner box is never stopped, so a listener on the document hears it; this event carries the value. */
  readonly valueChange = output<ArenaValueSet>();

  protected readonly label = computed(() => {
    const name = this.ariaLabel();
    if (name.trim() === '') {
      throw new Error('ArenaCheckboxGroup: `ariaLabel` is required, and names what the choices are about');
    }
    return name;
  });

  protected readonly styles = computed(() => arenaCheckboxGroupStyles());

  private readonly fallbackName = inject(ArenaIdGenerator).next('arena-checkbox-group');
  private readonly chosen = linkedSignal<readonly string[]>(() => this.value());
  private readonly state = inject(ArenaCheckboxGroupState);
  private readonly binding = inject(ArenaControlBinding);
  protected readonly off = computed(() => this.disabled() || this.binding.disabled());
  private readonly warned = effect(() => {
    if (this.binding.bound() && this.value().length > 0) arenaWarnDoubleBinding('ArenaCheckboxGroup', 'value');
  });

  constructor() {
    this.state.groupName = computed(() => this.name() || this.fallbackName);
    this.state.values = computed(() => (this.binding.bound()
      ? (this.binding.value() as readonly string[] | undefined) ?? []
      : this.chosen()));
    this.state.disabled = this.off;
    this.state.toggle = (value: string, checked: boolean) => {
      const next = toggled(this.state.values(), value, checked);
      this.chosen.set(next);
      if (this.binding.bound()) this.binding.value.set(next);
      this.valueChange.emit({ values: next });
      this.binding.onChange(next);
    };
  }
}
