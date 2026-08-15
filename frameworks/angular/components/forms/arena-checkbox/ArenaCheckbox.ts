import {
  ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output,
} from '@angular/core';
import { arenaCheckboxStyles } from './ArenaCheckbox.variants';
import manifest from './ArenaCheckbox.classes.generated';

export const ARENA_CHECK_GLYPH_STYLE = { width: 'var(--sp-3)', height: 'var(--sp-3)' };
export const ARENA_CHECK_STROKE_STYLE = { strokeWidth: 'var(--bw-strong)' };

@Component({
  selector: 'arena-checkbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display: contents',
    '[attr.name]': 'null',
  },
  template: `
    <label [class]="styles().root()" [attr.data-arena-part]="parts.root">
      <span [class]="styles().box()" [attr.data-arena-part]="parts.box">
        @if (checked()) {
          <svg [class]="styles().check()" [attr.data-arena-part]="parts.check" viewBox="0 0 12 12" fill="none" [style]="glyph">
            <path d="M2 6l3 3 5-6" stroke="currentColor" stroke-linecap="round"
                  stroke-linejoin="round" [style]="glyphStroke"></path>
          </svg>
        }
      </span>
      @if (label(); as text) {
        <span [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ text }}</span>
      }
      <input type="checkbox" [class]="styles().input()" [attr.data-arena-part]="parts.input" [checked]="checked()"
             [attr.name]="name()" [attr.value]="value()" [required]="required()"
             [disabled]="disabled()" (change)="onChange($event)" />
    </label>
  `,
})
export class ArenaCheckbox {
  protected readonly parts = manifest.parts;

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
    checked: this.checked(), disabled: this.disabled(),
  }));

  protected onChange(event: Event): void {
    event.stopPropagation();
    this.change.emit((event.target as HTMLInputElement).checked);
  }
}
