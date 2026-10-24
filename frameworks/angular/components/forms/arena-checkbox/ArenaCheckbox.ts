import {
  ChangeDetectionStrategy, Component, booleanAttribute, computed, effect, inject, input, output,
} from '@angular/core';
import { arenaCheckboxStyles } from './ArenaCheckbox.variants';
import manifest from './ArenaCheckbox.classes.generated';
import { ArenaControlBinding, arenaWarnDoubleBinding } from '../../../ControlBinding';
import { arenaWarnOnce } from '../../../WarnOnce';
import { ArenaCheckboxGroupState } from '../arena-checkbox-group/ArenaCheckboxGroupState';
import { ArenaSlotAttributes } from '../../../SlotData';

export const ARENA_CHECK_GLYPH_STYLE = { width: 'var(--sp-3)', height: 'var(--sp-3)' };
export const ARENA_CHECK_STROKE_STYLE = { strokeWidth: 'var(--bw-strong)' };

@Component({
  selector: 'arena-checkbox',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaControlBinding],
  host: {
    style: 'display: contents',
    '[attr.name]': 'null',
  },
  template: `
    <label [class]="styles().root()" [arenaSlotData]="styles().$data.root()" [attr.data-arena-part]="parts.root">
      <span [class]="styles().box()" [arenaSlotData]="styles().$data.box()" [attr.data-arena-part]="parts.box">
        @if (drawn()) {
          <svg [class]="styles().check()" [attr.data-arena-part]="parts.check" viewBox="0 0 12 12" fill="none" [style]="glyph">
            <path d="M2 6l3 3 5-6" stroke="currentColor" stroke-linecap="round"
                  stroke-linejoin="round" [style]="glyphStroke"></path>
          </svg>
        }
      </span>
      @if (showLabel()) {
        <span [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ accessibleName() }}</span>
      }
      <input type="checkbox" [class]="styles().input()" [attr.data-arena-part]="parts.input" [checked]="drawn()"
             [attr.aria-label]="showLabel() ? null : accessibleName()"
             [attr.name]="formName()" [attr.value]="value()" [required]="required()"
             [disabled]="off()" (change)="onChange($event)" />
    </label>
  `,
})
export class ArenaCheckbox {
  protected readonly parts = manifest.parts;
  private readonly binding = inject(ArenaControlBinding);
  private readonly group = inject(ArenaCheckboxGroupState, { optional: true });
  protected readonly drawn = computed(() => {
    if (this.group) return this.group.values().includes(this.groupValue());
    return this.binding.bound() ? (this.binding.value() as boolean) : this.checked();
  });
  protected readonly accessibleName = computed(() => {
    const text = this.label();
    if (!text.trim()) throw new Error('ArenaCheckbox: `label` is required, and names the checkbox');
    return text;
  });
  protected readonly off = computed(() => this.disabled() || this.binding.disabled() || (this.group?.disabled() ?? false));
  protected readonly formName = computed(() => (this.group ? this.group.groupName() : this.name()));
  private readonly warned = effect(() => {
    if (this.group) {
      if (this.checked() !== false) {
        arenaWarnOnce('ArenaCheckbox: `checked` is bound inside an ArenaCheckboxGroup, so `checked` is ignored '
          + 'and the group\'s `value` is drawn. Bind one of the two.');
      }
      return;
    }
    if (this.binding.bound() && this.checked() !== false) arenaWarnDoubleBinding('ArenaCheckbox', 'checked');
  });

  /** Whether it is ticked. */
  readonly checked = input(false, { transform: booleanAttribute });
  /** The checkbox's accessible name, and the text beside the box unless `showLabel` is false. Required, and guarded at runtime after trimming: a checkbox with no name is announced as an unlabelled checkbox. */
  readonly label = input.required<string>();
  /** Whether the label is drawn beside the box. False keeps the name on the input for assistive technology and draws nothing, for a row-selection box with no room for text. */
  readonly showLabel = input(true, { transform: booleanAttribute });
  /** Blocks toggling and dims it. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Must be checked for the form to submit. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Submitted with the form. */
  readonly name = input<string>();
  /** The value submitted under `name` when checked. */
  readonly value = input<string>();
  /** Toggled; carries the new checked state. */
  readonly valueChange = output<boolean>();

  protected readonly glyph = ARENA_CHECK_GLYPH_STYLE;
  protected readonly glyphStroke = ARENA_CHECK_STROKE_STYLE;

  protected readonly styles = computed(() => arenaCheckboxStyles({
    checked: this.drawn(), disabled: this.off(),
  }));

  private groupValue(): string {
    const value = this.value();
    if (!value?.trim()) throw new Error('ArenaCheckbox: `value` is required inside an ArenaCheckboxGroup');
    return value;
  }

  protected onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const checked = input.checked;
    if (this.binding.bound()) this.binding.value.set(checked);
    this.valueChange.emit(checked);
    this.binding.onChange(checked);
    this.group?.toggle(this.groupValue(), checked);
    input.checked = this.drawn();
  }
}
