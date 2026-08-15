import {
  ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output,
} from '@angular/core';
import type { ArenaSelectOption } from '../../../Api.generated';
import { arenaSelectStyles } from './ArenaSelect.variants';
import manifest from './ArenaSelect.classes.generated';

let nextId = 0;

@Component({
  selector: 'arena-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.name]': 'null',
  },
  template: `
    @if (label(); as text) {
      <label [class]="styles().label()" [attr.data-arena-part]="parts.label" [attr.for]="selectId">{{ text }}</label>
    }
    <div [class]="styles().wrap()" [attr.data-arena-part]="parts.wrap">
      @if (icon(); as glyph) {
        <i [class]="styles().iconWrap() + ' ' + glyph" [attr.data-arena-part]="parts.iconWrap" aria-hidden="true"></i>
      }
      <select [class]="styles().field()" [attr.data-arena-part]="parts.field" [attr.id]="selectId" [disabled]="disabled()"
              [required]="required()" [attr.name]="name()"
              [attr.aria-invalid]="hasError()" [attr.aria-describedby]="describedBy()"
              (change)="onChange($event)">
        @if (placeholder(); as text) {
          <option value="" [disabled]="true" [selected]="!value()">{{ text }}</option>
        }
        @for (option of options(); track option.value) {
          <option [value]="option.value" [selected]="option.value === value()">{{ option.label }}</option>
        }
      </select>
      <span [class]="styles().caret()" [attr.data-arena-part]="parts.caret" aria-hidden="true">&#9662;</span>
    </div>
    @if (error(); as message) {
      <span [class]="styles().error()" [attr.data-arena-part]="parts.error" [attr.id]="noteId">{{ message }}</span>
    } @else if (hint(); as text) {
      <span [class]="styles().hint()" [attr.data-arena-part]="parts.hint" [attr.id]="noteId">{{ text }}</span>
    }
  `,
})
export class ArenaSelect {
  protected readonly parts = manifest.parts;

  /** Field label above the control. */
  readonly label = input<string>();
  /** An empty-valued first option, drawn before the choices and unselectable once a real one is made -- "Choose a customer". It is an option rather than an attribute because a native select has no placeholder, and it is what makes "nothing chosen yet" distinguishable from "the first choice". */
  readonly placeholder = input<string>();
  /** The choices, drawn as native options. */
  readonly options = input<readonly ArenaSelectOption[], readonly ArenaSelectOption[] | undefined>(
    [],
    { transform: (value) => value ?? [] },
  );
  /** The selected option's value. */
  readonly value = input<string>();
  /** Blocks the control and dims it. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Must have a value for the form to submit. */
  readonly required = input(false, { transform: booleanAttribute });
  /** A line of help under the field. */
  readonly hint = input<string>();
  /** Controlled error message. It is the whole validation surface here, unlike ArenaInput, which also takes a `validate` function: a native select offers a closed list, so there is no value to parse and nothing for a validator to reject that the options did not already prevent. */
  readonly error = input<string>();
  /** Force the valid (green check) state. */
  readonly valid = input(false, { transform: booleanAttribute });
  /** Phosphor class name drawn at the field's start. */
  readonly icon = input<string>();
  /** Submitted with the form. */
  readonly name = input<string>();
  /** A different option was chosen; carries its value. */
  readonly change = output<string>();

  protected readonly selectId = `arena-select-${nextId++}`;
  protected readonly noteId = `${this.selectId}-note`;

  protected readonly hasError = computed(() => Boolean(this.error()));

  protected readonly describedBy = computed(() => (this.error() || this.hint() ? this.noteId : null));

  protected readonly styles = computed(() => arenaSelectStyles({
    disabled: this.disabled(),
    hasIcon: Boolean(this.icon()),
    state: this.hasError() ? 'error' : this.valid() ? 'valid' : 'neutral',
  }));

  protected onChange(event: Event): void {
    event.stopPropagation();
    this.change.emit((event.target as HTMLSelectElement).value);
  }
}
