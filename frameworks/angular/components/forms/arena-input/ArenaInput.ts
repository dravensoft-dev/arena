import {
  ChangeDetectionStrategy, Component, ElementRef, booleanAttribute, computed, input, output, signal,
  viewChild,
} from '@angular/core';
import type { ArenaInputType, ArenaValidateOn } from '../../../Api.generated';
import { arenaInputStyles } from './ArenaInput.variants';

export function arenaInputIdFor(id: string | undefined, label: string | undefined): string | null {
  if (id) return id;
  return label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : null;
}

@Component({
  selector: 'arena-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.name]': 'null',
    '[attr.id]': 'null',
  },
  template: `
    @if (label(); as text) {
      <label [class]="styles().label()" [attr.for]="controlId()">{{ text }}@if (required()) {
        <span [class]="styles().required()">*</span>
      }</label>
    }
    <div [class]="styles().field()">
      @if (icon()) {
        <i [class]="iconClass()" aria-hidden="true"></i>
      }
      @if (prefix(); as text) {
        <span [class]="styles().prefix()">{{ text }}</span>
      }
      <input #control [class]="styles().input()" [attr.id]="controlId()" [attr.type]="type()"
             [value]="value() ?? ''" [disabled]="disabled()" [readOnly]="readOnly()"
             [required]="required()" [attr.aria-invalid]="hasError()"
             [attr.placeholder]="placeholder()" [attr.name]="name()"
             [attr.autocomplete]="autoComplete()" [attr.min]="min()" [attr.max]="max()"
             [attr.step]="step()" [attr.maxlength]="maxLength()" [attr.pattern]="pattern()"
             (input)="onInput($event)" (change)="onNativeChange($event)" (blur)="onBlur($event)" />
      @if (hasError()) {
        <i [class]="statusIconClass('ph-fill ph-warning-circle')" aria-hidden="true"></i>
      } @else if (isValid()) {
        <i [class]="statusIconClass('ph-fill ph-check-circle')" aria-hidden="true"></i>
      }
    </div>
    @if (shownError(); as message) {
      <span [class]="styles().error()">{{ message }}</span>
    } @else if (hint(); as text) {
      <span [class]="styles().hint()">{{ text }}</span>
    }
  `,
})
export class ArenaInput {
  /** Field label above the control. */
  readonly label = input<string>();
  /** The control's id, and what the label's `for` points at. Generated from `label` when omitted, as `in-` followed by the label with each run of whitespace replaced by a single hyphen and the whole lowercased. The derivation is normative, and the prefix differs per component on purpose: the same markup must get the same id in every layer, and an ArenaInput and an ArenaTextarea sharing a label must not collide. */
  readonly id = input<string>();
  /** A line of help under the field. */
  readonly hint = input<string>();
  /** Controlled error message; wins over `validate`. */
  readonly error = input<string>();
  /** Force the valid (green check) state. */
  readonly valid = input(false, { transform: booleanAttribute });
  /** Marks the label and the control required. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Called on the value; returns the error message, or empty for valid. */
  readonly validate = input<(value: string) => string>();
  /** When `validate` runs. */
  readonly validateOn = input<ArenaValidateOn, ArenaValidateOn | undefined>(
    'blur',
    { transform: (value) => value ?? 'blur' },
  );
  /** Native input type. */
  readonly type = input<ArenaInputType, ArenaInputType | undefined>(
    'text',
    { transform: (value) => value ?? 'text' },
  );
  /** Phosphor class name drawn at the field's start. */
  readonly icon = input<string>();
  /** Static text Arena draws before the value, e.g. `git@`. */
  readonly prefix = input<string>();
  /** The controlled text. */
  readonly value = input<string>();
  /** Blocks editing and dims it. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Shows the value but blocks editing. */
  readonly readOnly = input(false, { transform: booleanAttribute });
  /** Shown when empty. */
  readonly placeholder = input<string>();
  /** Submitted with the form. */
  readonly name = input<string>();
  /** The browser autofill hint. */
  readonly autoComplete = input<string>();
  /** Minimum, for number/date types. */
  readonly min = input<string>();
  /** Maximum, for number/date types. */
  readonly max = input<string>();
  /** Step, for number/date types. */
  readonly step = input<string>();
  /** Caps the length. */
  readonly maxLength = input<number>();
  /** A regex the value must match. */
  readonly pattern = input<string>();
  /** Edited; carries the new value. */
  readonly change = output<string>();
  /** Left the field; carries the value. */
  readonly blur = output<string>();

  private readonly localError = signal<string | null>(null);
  private readonly touched = signal(false);

  protected readonly controlId = computed(() => arenaInputIdFor(this.id(), this.label()));

  protected readonly shownError = computed(() => {
    const controlled = this.error();
    if (controlled !== undefined) return controlled;
    return this.touched() ? this.localError() : null;
  });

  protected readonly hasError = computed(() => Boolean(this.shownError()));

  protected readonly isValid = computed(() => !this.hasError()
    && (this.valid() || (this.touched() && this.validate() !== undefined && this.localError() === null)));

  protected readonly styles = computed(() => arenaInputStyles({
    state: this.hasError() ? 'error' : this.isValid() ? 'valid' : 'neutral',
    disabled: this.disabled(),
    readonly: this.readOnly(),
  }));

  protected readonly iconClass = computed(() => `${this.styles().icon()} ${this.icon() ?? ''}`.trim());

  protected statusIconClass(glyph: string): string {
    return `${glyph} ${this.styles().statusIcon()}`;
  }

  protected onInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.change.emit(text);
    if (this.validateOn() === 'change') {
      this.touched.set(true);
      this.runValidate(text);
    }
  }

  protected onNativeChange(event: Event): void {
    event.stopPropagation();
  }

  protected onBlur(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.touched.set(true);
    this.runValidate(text);
    this.blur.emit(text);
  }

  private runValidate(text: string): void {
    const fn = this.validate();
    if (fn) this.localError.set(fn(text) || null);
  }

  private readonly control = viewChild<ElementRef<HTMLInputElement>>('control');

  focus(options?: FocusOptions): void {
    this.control()?.nativeElement.focus(options);
  }

  select(): void {
    this.control()?.nativeElement.select();
  }
}
