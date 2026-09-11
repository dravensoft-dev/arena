import {
  ChangeDetectionStrategy, Component, booleanAttribute, computed, effect, inject, input, output,
} from '@angular/core';
import { arenaCheckboxStyles } from './ArenaCheckbox.variants';
import manifest from './ArenaCheckbox.classes.generated';
import { ArenaControlBinding, arenaWarnDoubleBinding } from '../../../ControlBinding';

export const ARENA_CHECK_GLYPH_STYLE = { width: 'var(--sp-3)', height: 'var(--sp-3)' };
export const ARENA_CHECK_STROKE_STYLE = { strokeWidth: 'var(--bw-strong)' };

@Component({
  selector: 'arena-checkbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaControlBinding],
  host: {
    style: 'display: contents',
    '[attr.name]': 'null',
  },
  template: `
    <label [class]="styles().root()" [attr.data-arena-part]="parts.root">
      <span [class]="styles().box()" [attr.data-arena-part]="parts.box">
        @if (drawn()) {
          <svg [class]="styles().check()" [attr.data-arena-part]="parts.check" viewBox="0 0 12 12" fill="none" [style]="glyph">
            <path d="M2 6l3 3 5-6" stroke="currentColor" stroke-linecap="round"
                  stroke-linejoin="round" [style]="glyphStroke"></path>
          </svg>
        }
      </span>
      @if (label(); as text) {
        <span [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ text }}</span>
      }
      <input type="checkbox" [class]="styles().input()" [attr.data-arena-part]="parts.input" [checked]="drawn()"
             [attr.name]="name()" [attr.value]="value()" [required]="required()"
             [disabled]="off()" (change)="onChange($event)" />
    </label>
  `,
})
export class ArenaCheckbox {
  protected readonly parts = manifest.parts;
  private readonly binding = inject(ArenaControlBinding);
  protected readonly drawn = computed(() => (this.binding.bound() ? (this.binding.value() as boolean) : this.checked()));
  protected readonly off = computed(() => this.disabled() || this.binding.disabled());
  private readonly warned = effect(() => {
    if (this.binding.bound() && this.checked() !== false) arenaWarnDoubleBinding('ArenaCheckbox', 'checked');
  });

  /** Whether it is ticked. */
  readonly checked = input(false, { transform: booleanAttribute });
  /** Text beside the box. */
  readonly label = input<string>();
  /** Blocks toggling and dims it. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Must be checked for the form to submit. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Submitted with the form. */
  readonly name = input<string>();
  /** The value submitted under `name` when checked. */
  readonly value = input<string>();
  /** Toggled; carries the new checked state. */
  readonly change = output<boolean>();

  protected readonly glyph = ARENA_CHECK_GLYPH_STYLE;
  protected readonly glyphStroke = ARENA_CHECK_STROKE_STYLE;

  protected readonly styles = computed(() => arenaCheckboxStyles({
    checked: this.drawn(), disabled: this.off(),
  }));

  protected onChange(event: Event): void {
    event.stopPropagation();
    const checked = (event.target as HTMLInputElement).checked;
    this.change.emit(checked);
    this.binding.onChange(checked);
  }
}
