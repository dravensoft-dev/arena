import {
  ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, booleanAttribute, computed,
  input, output, viewChild,
} from '@angular/core';
import { arenaTextareaStyles } from './ArenaTextarea.variants';
import manifest from './ArenaTextarea.classes.generated';

export const ARENA_COUNTER_WARNING_SHARE = 0.9;

export function arenaTextareaIdFor(id: string | undefined, label: string | undefined): string | null {
  if (id) return id;
  return label ? `ta-${label.replace(/\s+/g, '-').toLowerCase()}` : null;
}

export function arenaCounterIsNear(length: number, maxLength: number): boolean {
  return length > maxLength * ARENA_COUNTER_WARNING_SHARE;
}

export function arenaBorderBoxSlack(element: HTMLElement): number {
  return element.offsetHeight - element.clientHeight;
}

@Component({
  selector: 'arena-textarea',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.name]': 'null',
    '[attr.id]': 'null',
  },
  template: `
    @if (label(); as text) {
      <label [class]="styles().label()" [attr.data-arena-part]="parts.label" [attr.for]="controlId()">{{ text }}@if (required()) {
        <span [class]="styles().required()" [attr.data-arena-part]="parts.required">*</span>
      }</label>
    }
    <textarea #control [class]="styles().field()" [attr.data-arena-part]="parts.field" [attr.id]="controlId()" [attr.rows]="rows()"
              [attr.maxlength]="maxLength()" [disabled]="disabled()" [required]="required()"
              [readOnly]="readOnly()" [attr.placeholder]="placeholder()" [attr.name]="name()"
              [attr.aria-invalid]="hasError()" [value]="value() ?? ''"
              (input)="onInput($event)" (change)="onNativeChange($event)"></textarea>
    <div [class]="styles().foot()" [attr.data-arena-part]="parts.foot">
      @if (shownError(); as message) {
        <span [class]="styles().error()" [attr.data-arena-part]="parts.error">{{ message }}</span>
      } @else if (hint(); as text) {
        <span [class]="styles().hint()" [attr.data-arena-part]="parts.hint">{{ text }}</span>
      } @else {
        <span></span>
      }
      @if (counterText(); as text) {
        <span [class]="counterClass()" [attr.data-arena-part]="parts.counter">{{ text }}</span>
      }
    </div>
  `,
})
export class ArenaTextarea {
  protected readonly parts = manifest.parts;

  /** Field label; the counter and error sit under the field. */
  readonly label = input<string>();
  /** The control's id, and what the label's `for` points at. Generated from `label` when omitted, as `ta-` followed by the label with each run of whitespace replaced by a single hyphen and the whole lowercased: the derivation ArenaInput.id states, under this component's own prefix. */
  readonly id = input<string>();
  /** A line of help under the field. */
  readonly hint = input<string>();
  /** Error message; turns the border crimson and shows below. */
  readonly error = input<string>();
  /** Marks the label and the control required. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Shows a live length/maxLength count, which warns once the length is STRICTLY past nine tenths of `maxLength`; exactly at the share is not yet near the limit. */
  readonly counter = input(false, { transform: booleanAttribute });
  /** Grows with the content instead of scrolling. */
  readonly autoResize = input(false, { transform: booleanAttribute });
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
  /** Caps the length; feeds the counter. */
  readonly maxLength = input<number>();
  /** Initial visible rows. */
  readonly rows = input<number, number | undefined>(4, { transform: (value) => value ?? 4 });
  /** Edited; carries the new text. */
  readonly change = output<string>();

  protected readonly controlId = computed(() => arenaTextareaIdFor(this.id(), this.label()));
  protected readonly shownError = computed(() => this.error() ?? null);
  protected readonly hasError = computed(() => Boolean(this.shownError()));

  protected readonly styles = computed(() => arenaTextareaStyles({
    state: this.hasError() ? 'error' : 'neutral',
    resize: this.autoResize() ? 'none' : 'vertical',
    disabled: this.disabled(),
    readonly: this.readOnly(),
  }));

  protected readonly length = computed(() => (this.value() ?? '').length);

  protected readonly counterText = computed(() => {
    const cap = this.maxLength();
    if (!this.counter() || cap === undefined) return null;
    return `${this.length()}/${cap}`;
  });

  protected readonly counterClass = computed(() => {
    const cap = this.maxLength();
    return cap !== undefined && arenaCounterIsNear(this.length(), cap)
      ? this.styles().counterNear()
      : this.styles().counter();
  });

  private readonly control = viewChild<ElementRef<HTMLTextAreaElement>>('control');

  constructor() {
    afterRenderEffect(() => {
      this.value();
      if (this.autoResize()) this.grow();
    });
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    if (this.autoResize()) this.fit(target);
    this.change.emit(target.value);
  }

  protected onNativeChange(event: Event): void {
    event.stopPropagation();
  }

  private grow(): void {
    const element = this.control()?.nativeElement;
    if (element) this.fit(element);
  }

  private fit(element: HTMLTextAreaElement): void {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight + arenaBorderBoxSlack(element)}px`;
  }
}
