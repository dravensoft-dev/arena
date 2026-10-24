import {
  ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, booleanAttribute, computed, effect, inject, input, linkedSignal,
  output, signal, viewChildren,
} from '@angular/core';
import type { ArenaPinCharacters } from '../../../Api.generated';
import { arenaPinInputStyles } from './ArenaPinInput.variants';
import manifest from './ArenaPinInput.classes.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaControlBinding, arenaWarnDoubleBinding } from '../../../ControlBinding';
import { ArenaIdGenerator } from '../../../ArenaIds';
import { ArenaSlotAttributes } from '../../../SlotData';
import { arenaPhrase } from '../../../Phrase';
import {
  arenaPinBackspace, arenaPinCode, arenaPinCompletes, arenaPinDelete, arenaPinFilter, arenaPinInputMode, arenaPinInsert, arenaPinKey,
  arenaPinLength, arenaPinMoveTo, arenaPinPattern, arenaPinTabStop, arenaPinTyped, type ArenaPinEdit,
} from './PinRules';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon';

const mirroredAt = (element: Element) => {
  const dir = element.closest('[dir]')?.getAttribute('dir');
  return dir ? dir.toLowerCase() === 'rtl' : element.ownerDocument.defaultView?.getComputedStyle(element).direction === 'rtl';
};

@Component({
  selector: 'arena-pin-input',
  standalone: true,
  imports: [ArenaIcon, ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaControlBinding],
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-disabled]': "styles().$data.root()['data-arena-disabled'] ?? null",
    '[attr.data-arena-part]': 'parts.root',
    '[attr.name]': 'null',
  },
  template: `
    <span [id]="labelId" [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ heading() }}@if (required()) {
      <span [class]="styles().required()" [attr.data-arena-part]="parts.required" aria-hidden="true">*</span>
    }</span>
    <div role="group" [attr.aria-labelledby]="labelId" [class]="styles().group()" [attr.data-arena-part]="parts.group"
         (focusout)="onGroupBlur($event)">
      @for (index of cellIndexes(); track index) {
        <input #cell [type]="masked() ? 'password' : 'text'" [attr.inputmode]="inputMode()" [attr.pattern]="pattern() ?? null"
               [attr.autocomplete]="autoComplete()" autocapitalize="off" spellcheck="false"
               [value]="code().charAt(index)" [attr.tabindex]="index === stop() ? 0 : -1"
               [attr.aria-label]="cellName(index)" [attr.aria-invalid]="hasError()" [attr.aria-describedby]="noteId()"
               [required]="required()" [disabled]="off()"
               [class]="styles().cell()" [arenaSlotData]="styles().$data.cell()" [attr.data-arena-part]="parts.cell"
               (focus)="focused.set(index)" (input)="onInput(index, $event)" (change)="onNativeChange($event)"
               (keydown)="onKeyDown(index, $event)" (paste)="onPaste(index, $event)" />
      }
      @if (hasError()) {
        <span [class]="styles().statusIcon()" [arenaSlotData]="styles().$data.statusIcon()" [attr.data-arena-part]="parts.statusIcon" aria-hidden="true"><arena-icon icon="ph-fill ph-warning-circle" /></span>
      } @else if (isValid()) {
        <span [class]="styles().statusIcon()" [arenaSlotData]="styles().$data.statusIcon()" [attr.data-arena-part]="parts.statusIcon" aria-hidden="true"><arena-icon icon="ph-fill ph-check-circle" /></span>
      }
    </div>
    @if (name(); as field) {
      <input type="hidden" [attr.name]="field" [value]="code()" [disabled]="off()" />
    }
    @if (shownError(); as message) {
      <span [id]="noteBase" [class]="styles().error()" [attr.data-arena-part]="parts.error">{{ message }}</span>
    } @else if (hint(); as text) {
      <span [id]="noteBase" [class]="styles().hint()" [attr.data-arena-part]="parts.hint">{{ text }}</span>
    }
  `,
})
export class ArenaPinInput {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);
  private readonly binding = inject(ArenaControlBinding);
  private readonly base = inject(ArenaIdGenerator).next('arena-pin-input');
  protected readonly labelId = `${this.base}-label`;
  protected readonly noteBase = `${this.base}-note`;
  protected readonly off = computed(() => this.disabled() || this.binding.disabled());
  private readonly warned = effect(() => {
    if (this.binding.bound() && this.value() !== undefined) arenaWarnDoubleBinding('ArenaPinInput', 'value');
  });

  /** Names the code, such as "Verification code", drawn above the cells and the group's accessible name. Required, and guarded at runtime: a blank one throws, because nothing can derive what a code is for. */
  readonly label = input.required<string>();
  /** How many cells, one per character. A value that is not a whole number of at least 1 reads as 6. */
  readonly length = input<number, number | undefined>(6, { transform: (value) => value ?? 6 });
  /** Which characters a cell accepts, and which keypad a phone shows. A refused character changes nothing and fires no event. */
  readonly characters = input<ArenaPinCharacters, ArenaPinCharacters | undefined>(
    'numeric',
    { transform: (value) => value ?? 'numeric' },
  );
  /** Hides what each cell holds, as a password field does. */
  readonly masked = input(false, { transform: booleanAttribute });
  /** The whole code. Absent, the cells hold what the person types; present, it controls them. A string shorter than `length` fills the first cells, and a character `characters` refuses is dropped. */
  readonly value = input<string>();
  /** A line of help under the cells, and each cell's description. An error replaces it while one shows. */
  readonly hint = input<string>();
  /** Controlled error message; the cells turn crimson and invalid, and the message describes each cell while it shows. */
  readonly error = input<string>();
  /** Force the valid (green check) state. */
  readonly valid = input(false, { transform: booleanAttribute });
  /** Marks the label and sets the native `required` on every cell, so a native submission refuses a code with an empty cell. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Blocks editing and dims it. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Submitted with the form as the whole code, once, through a hidden input. The cells carry no name, so a form never receives one character on its own. */
  readonly name = input<string>();
  /** The browser autofill hint, on every cell. A code that is not sent by text message, such as a device PIN, passes `off`. */
  readonly autoComplete = input<string, string | undefined>(
    'one-time-code',
    { transform: (value) => value ?? 'one-time-code' },
  );
  /** The code after an edit, whatever its length; a refused character fires nothing. */
  readonly change = output<string>();
  /** The code, when an edit makes it `length` characters long. Fires after `change`. A typed character fires it only when it completes the code anew. A paste or autofill of more than one character fires it whenever the code ends full. A `value` the host fills does not fire it. */
  readonly complete = output<string>();
  /** Focus left the group; carries the code. A move from one cell to another is not a blur. */
  readonly blur = output<string>();

  private readonly held = linkedSignal<string>(() => this.value() ?? '');
  protected readonly total = computed(() => arenaPinLength(this.length()));
  protected readonly cellIndexes = computed(() => Array.from({ length: this.total() }, (_, index) => index));
  protected readonly code = computed(() => arenaPinCode(this.binding.bound()
    ? String(this.binding.value() ?? '')
    : this.held(), this.total(), this.characters()));
  protected readonly focused = signal<number | null>(null);
  protected readonly stop = computed(() => {
    const at = this.focused();
    return at === null ? arenaPinTabStop(this.code(), this.total()) : Math.min(at, this.total() - 1);
  });
  protected readonly inputMode = computed(() => arenaPinInputMode(this.characters()));
  protected readonly pattern = computed(() => arenaPinPattern(this.characters()));

  protected readonly heading = computed(() => {
    const label = this.label();
    if (label.trim() === '') throw new Error('ArenaPinInput: `label` is required, and names what the code is for');
    return label;
  });

  protected readonly shownError = computed(() => this.error() || null);
  protected readonly hasError = computed(() => Boolean(this.shownError()));
  protected readonly isValid = computed(() => !this.hasError() && this.valid());
  protected readonly noteId = computed(() => (this.shownError() || this.hint() ? this.noteBase : null));

  protected readonly styles = computed(() => arenaPinInputStyles({
    state: this.hasError() ? 'error' : this.isValid() ? 'valid' : 'neutral',
    disabled: this.off(),
  }));

  private readonly cells = viewChildren<ElementRef<HTMLInputElement>>('cell');

  protected cellName(index: number): string {
    return arenaPhrase(this.locale.pinInputCell, { index: index + 1, total: this.total() });
  }

  private sync(code: string): void {
    this.cells().forEach((cell, index) => {
      const shown = code[index] ?? '';
      if (cell.nativeElement.value !== shown) cell.nativeElement.value = shown;
    });
  }

  private readonly answered = signal(0);
  private clamp = false;
  private readonly clamped = afterRenderEffect(() => {
    this.answered();
    if (!this.clamp) return;
    this.clamp = false;
    const limit = arenaPinTabStop(this.code(), this.total());
    const at = this.focused();
    if (at !== null && at > limit) this.cells()[limit]?.nativeElement.focus();
  });

  private apply(edit: ArenaPinEdit, inserted = 0): void {
    const before = this.code();
    this.cells()[edit.cell]?.nativeElement.focus();
    if (edit.code !== before) {
      this.held.set(edit.code);
      if (this.binding.bound()) {
        this.binding.value.set(edit.code);
        this.binding.onChange(edit.code);
      }
      this.change.emit(edit.code);
      if (arenaPinCompletes(before, edit.code, this.total(), inserted)) this.complete.emit(edit.code);
      this.clamp = true;
      this.answered.update((count) => count + 1);
    }
    this.sync(this.code());
  }

  protected onInput(index: number, event: Event): void {
    const typed = (event.target as HTMLInputElement).value;
    const code = this.code();
    const text = arenaPinTyped(code[index] ?? '', typed);
    this.apply(arenaPinInsert(code, index, text, this.total(), this.characters()), arenaPinFilter(text, this.characters()).length);
  }

  protected onPaste(index: number, event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    this.apply(arenaPinInsert(this.code(), index, text, this.total(), this.characters()), arenaPinFilter(text, this.characters()).length);
  }

  protected onKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      this.apply(event.key === 'Backspace' ? arenaPinBackspace(this.code(), index) : arenaPinDelete(this.code(), index));
      return;
    }
    const move = arenaPinKey(event.key, mirroredAt(event.currentTarget as Element));
    if (move === null) return;
    event.preventDefault();
    this.cells()[arenaPinMoveTo(index, move, this.total())]?.nativeElement.focus();
  }

  protected onNativeChange(event: Event): void {
    event.stopPropagation();
  }

  protected onGroupBlur(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && (event.currentTarget as HTMLElement).contains(next)) return;
    this.focused.set(null);
    this.blur.emit(this.code());
  }

  focus(options?: FocusOptions): void {
    this.cells()[0]?.nativeElement.focus(options);
  }
}
