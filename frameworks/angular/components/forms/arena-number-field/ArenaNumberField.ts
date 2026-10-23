import {
  ChangeDetectionStrategy, Component, ElementRef, booleanAttribute, computed, effect, inject, input, linkedSignal,
  output, signal, viewChild,
} from '@angular/core';
import type { ArenaNumberFormat, ArenaValidateOn } from '../../../Api.generated';
import { arenaNumberFieldStyles } from './ArenaNumberField.variants';
import manifest from './ArenaNumberField.classes.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaControlBinding, arenaWarnDoubleBinding } from '../../../ControlBinding';
import { ArenaSlotAttributes } from '../../../SlotData';
import { arenaValueWriter } from '../../../DataVisuals';
import {
  arenaCanonicalNumber, arenaClampNumber, arenaDraftText, arenaFieldFormat, arenaNumberBaseline, arenaNumberFieldIds,
  arenaNumberKey, arenaNumberSeparators, arenaParseNumber, arenaStepNumber,
} from '../NumberRules';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon';

type Commit = 'blur' | 'enter' | 'step';

const numberOrUndefined = (value: number | null | undefined): number | undefined =>
  (value === null || value === undefined || Number.isNaN(value) ? undefined : value);

@Component({
  selector: 'arena-number-field',
  standalone: true,
  imports: [ArenaIcon, ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaControlBinding],
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-disabled]': "styles().$data.root()['data-arena-disabled'] ?? null",
    '[attr.data-arena-part]': 'parts.root',
    '[attr.name]': 'null',
    '[attr.id]': 'null',
  },
  template: `
    @if (showLabel()) {
      <label [id]="ids().label" [attr.for]="ids().control" [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ label() }}@if (required()) {
        <span [class]="styles().required()" [attr.data-arena-part]="parts.required" aria-hidden="true">*</span>
      }</label>
    }
    <div [class]="styles().field()" [arenaSlotData]="styles().$data.field()" [attr.data-arena-part]="parts.field">
      @if (steppers()) {
        <button type="button" tabindex="-1" [attr.aria-label]="locale.numberFieldDecrease" [disabled]="frozen() || atMin()"
                [class]="styles().stepper()" [attr.data-arena-part]="parts.stepper" (mousedown)="$event.preventDefault()" (click)="stepBy(-1)">
          <arena-icon icon="ph-bold ph-minus" />
        </button>
      }
      @if (prefix(); as text) {
        <span [class]="styles().prefix()" [attr.data-arena-part]="parts.prefix" aria-hidden="true">{{ text }}</span>
      }
      <input #control type="text" role="spinbutton" inputmode="decimal" autocomplete="off" [id]="ids().control"
             [value]="shown()" [attr.aria-valuenow]="committed() ?? null" [attr.aria-valuemin]="min() ?? null"
             [attr.aria-valuemax]="max() ?? null" [attr.aria-valuetext]="valueText()"
             [attr.aria-label]="showLabel() ? null : label()" [attr.aria-invalid]="hasError()"
             [attr.aria-describedby]="noteId()" [disabled]="off()" [readOnly]="readOnly()" [required]="required()"
             [attr.placeholder]="placeholder() ?? null"
             [class]="styles().input()" [arenaSlotData]="styles().$data.input()" [attr.data-arena-part]="parts.input"
             (focus)="onFocus()" (input)="onInput($event)" (change)="onNativeChange($event)" (blur)="onBlur()"
             (keydown)="onKeyDown($event)" />
      @if (suffix(); as text) {
        <span [class]="styles().suffix()" [attr.data-arena-part]="parts.suffix" aria-hidden="true">{{ text }}</span>
      }
      @if (hasError()) {
        <span [class]="styles().statusIcon()" [arenaSlotData]="styles().$data.statusIcon()" [attr.data-arena-part]="parts.statusIcon" aria-hidden="true"><arena-icon icon="ph-fill ph-warning-circle" /></span>
      } @else if (isValid()) {
        <span [class]="styles().statusIcon()" [arenaSlotData]="styles().$data.statusIcon()" [attr.data-arena-part]="parts.statusIcon" aria-hidden="true"><arena-icon icon="ph-fill ph-check-circle" /></span>
      }
      @if (steppers()) {
        <button type="button" tabindex="-1" [attr.aria-label]="locale.numberFieldIncrease" [disabled]="frozen() || atMax()"
                [class]="styles().stepper()" [attr.data-arena-part]="parts.stepper" (mousedown)="$event.preventDefault()" (click)="stepBy(1)">
          <arena-icon icon="ph-bold ph-plus" />
        </button>
      }
    </div>
    @if (name(); as field) {
      <input type="hidden" [attr.name]="field" [value]="canonical()" [disabled]="off()" />
    }
    @if (shownError(); as message) {
      <span [id]="ids().note" [class]="styles().error()" [attr.data-arena-part]="parts.error">{{ message }}</span>
    } @else if (hint(); as text) {
      <span [id]="ids().note" [class]="styles().hint()" [attr.data-arena-part]="parts.hint">{{ text }}</span>
    }
  `,
})
export class ArenaNumberField {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);
  private readonly binding = inject(ArenaControlBinding);
  protected readonly off = computed(() => this.disabled() || this.binding.disabled());
  private readonly warned = effect(() => {
    if (this.binding.bound() && this.value() !== undefined) arenaWarnDoubleBinding('ArenaNumberField', 'value');
  });

  /** Names the number, such as "Replicas", and labels the field. Required, and guarded at runtime: a blank one throws, because nothing can derive what a number counts. */
  readonly label = input.required<string>();
  /** Draws the label above the field. False keeps the accessible name and drops the drawn text, for a field inside a row that already names it. */
  readonly showLabel = input(true, { transform: booleanAttribute });
  /** The field's id, and what the label's `for` points at. Generated from `label` when omitted, as `nf-` followed by the label with each run of whitespace replaced by a single hyphen and the whole lowercased. The derivation is normative, and the prefix differs per component on purpose. Identical markup must get an identical id in every layer, and two controls sharing a label must not collide. The hint or the error takes it followed by `-note`. */
  readonly id = input<string>();
  /** A line of help under the field, and the field's description. An error replaces it while one shows. */
  readonly hint = input<string>();
  /** Controlled error message; wins over `validate`, and describes the field while it shows. */
  readonly error = input<string>();
  /** Force the valid (green check) state. */
  readonly valid = input(false, { transform: booleanAttribute });
  /** Marks the label and sets the native `required` on the field, so a native submission refuses an empty one. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Called on a committed number; returns the error message, or empty for valid. Never called for an empty field. */
  readonly validate = input<(value: number) => string>();
  /** When `validate` runs: "blur" on a commit by blur or Enter, "change" on every commit, a key or stepper step included. */
  readonly validateOn = input<ArenaValidateOn, ArenaValidateOn | undefined>(
    'blur',
    { transform: (value) => value ?? 'blur' },
  );
  /** The committed number. Absent, the field is empty and holds what the person commits; present, it controls the field. A number outside `min` and `max` is drawn and announced at the nearest bound, and nothing is reported. */
  readonly value = input<number>();
  /** The lowest number a commit keeps. Home goes to it, and the decrease stepper stops at it. */
  readonly min = input<number>();
  /** The highest number a commit keeps. End goes to it, and the increase stepper stops at it. */
  readonly max = input<number>();
  /** What an arrow key or a stepper adds or takes away; Page Up and Page Down move ten of it. A step lands on the decimal places of `step`, `min` and the number it starts from, and a typed number is clamped but never snapped to it. A step that is not a positive number reads as 1. */
  readonly step = input<number, number | undefined>(1, { transform: (value) => value ?? 1 });
  /** How the value is written while the field is not being edited. Absent, or with no `locale`, it follows `ArenaLocale.locale`, and the field reads typed text in the same locale. `compact` is ignored, because 48.2K cannot be read back. */
  readonly format = input<ArenaNumberFormat>();
  /** Static text Arena draws before the number, such as `$`. Spoken with the value, never typed. */
  readonly prefix = input<string>();
  /** Static text Arena draws after the number, such as `kg`. Spoken with the value, never typed. */
  readonly suffix = input<string>();
  /** Whether the decrease and increase buttons are drawn at the field's two ends. The steppers stay out of the Tab sequence: the field is the one stop, and its arrow keys do what they do. */
  readonly steppers = input(true, { transform: booleanAttribute });
  /** Blocks editing and both steppers, and dims the field. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Shows the value at full contrast on the panel surface and blocks editing; no key and no stepper changes it. */
  readonly readOnly = input(false, { transform: booleanAttribute });
  /** Shown when empty. */
  readonly placeholder = input<string>();
  /** Submitted with the form as the plain decimal string, such as `1234.5`, through a hidden input; empty when the field is empty. The drawn field carries formatted text and is never submitted. */
  readonly name = input<string>();
  /** A number was committed, clamped, and differs from the one before; carries it. */
  readonly change = output<number>();
  /** The field was committed empty. Never fires with `change` for one commit, and never for a field that was already empty. */
  readonly clear = output<void>();

  private readonly held = linkedSignal<number | undefined>(() => this.value());
  protected readonly committed = computed(() => {
    const given = this.binding.bound()
      ? numberOrUndefined(this.binding.value() as number | null | undefined)
      : this.value() ?? this.held();
    return given === undefined ? undefined : arenaClampNumber(given, this.min(), this.max());
  });
  private readonly draft = signal<string | null>(null);
  private readonly localError = signal<string | null>(null);
  private readonly touched = signal(false);

  protected readonly ids = computed(() => {
    const label = this.label();
    if (label.trim() === '') throw new Error('ArenaNumberField: `label` is required, and names the number the field holds');
    return arenaNumberFieldIds(this.id(), label);
  });

  private readonly shape = computed(() => arenaFieldFormat(this.format(), this.locale.locale));
  private readonly write = computed(() => arenaValueWriter({ format: this.shape() }));
  private readonly spoken = computed(() => arenaValueWriter({ prefix: this.prefix(), suffix: this.suffix(), format: this.shape() }));
  private readonly separators = computed(() => arenaNumberSeparators(this.shape().locale ?? this.locale.locale));

  protected readonly frozen = computed(() => this.off() || this.readOnly());
  protected readonly shown = computed(() => {
    const draft = this.draft();
    if (draft !== null) return draft;
    const value = this.committed();
    return value === undefined ? '' : this.write()(value);
  });
  protected readonly valueText = computed(() => {
    const value = this.committed();
    return value === undefined ? null : this.spoken()(value);
  });
  protected readonly canonical = computed(() => arenaCanonicalNumber(this.committed()));
  protected readonly atMin = computed(() => {
    const value = this.committed();
    const min = this.min();
    return value !== undefined && min !== undefined && value <= min;
  });
  protected readonly atMax = computed(() => {
    const value = this.committed();
    const max = this.max();
    return value !== undefined && max !== undefined && value >= max;
  });

  protected readonly shownError = computed(() => {
    const controlled = this.error();
    if (controlled !== undefined) return controlled;
    return this.touched() ? this.localError() : null;
  });
  protected readonly hasError = computed(() => Boolean(this.shownError()));
  protected readonly isValid = computed(() => !this.hasError() && (this.valid()
    || (this.touched() && this.validate() !== undefined && this.committed() !== undefined && this.localError() === null)));
  protected readonly noteId = computed(() => (this.shownError() || this.hint() ? this.ids().note : null));

  protected readonly styles = computed(() => arenaNumberFieldStyles({
    state: this.hasError() ? 'error' : this.isValid() ? 'valid' : 'neutral',
    steppers: this.steppers(),
    disabled: this.off(),
    readOnly: this.readOnly(),
  }));

  private readonly control = viewChild<ElementRef<HTMLInputElement>>('control');

  private sync(): void {
    const element = this.control()?.nativeElement;
    if (element && element.value !== this.shown()) element.value = this.shown();
  }

  private focused(): boolean {
    const element = this.control()?.nativeElement;
    return element !== undefined && element === element.ownerDocument.activeElement;
  }

  private runValidate(next: number | undefined): void {
    const fn = this.validate();
    if (fn) this.localError.set(next === undefined ? null : fn(next) || null);
  }

  private commit(next: number | undefined, how: Commit): void {
    const kept = next === undefined ? undefined : arenaClampNumber(next, this.min(), this.max());
    if (this.focused()) this.draft.set(arenaDraftText(kept, this.separators()));
    if (how !== 'step' || this.validateOn() === 'change') {
      this.touched.set(true);
      this.runValidate(kept);
    }
    if (kept === this.committed()) return;
    this.held.set(kept);
    if (this.binding.bound()) {
      this.binding.value.set(kept ?? null);
      this.binding.onChange(kept ?? null);
    }
    if (kept === undefined) this.clear.emit();
    else this.change.emit(kept);
  }

  private typed(): number | undefined {
    const draft = this.draft();
    if (draft === null) return this.committed();
    const parsed = arenaParseNumber(draft, this.separators());
    return parsed === undefined || Number.isNaN(parsed) ? this.committed() : parsed;
  }

  protected stepBy(steps: number): void {
    const from = this.typed();
    if (from === undefined) this.commit(arenaNumberBaseline(this.min(), this.max()), 'step');
    else this.commit(arenaStepNumber(from, steps, this.step(), this.min(), this.max()), 'step');
    this.sync();
  }

  private settle(how: Commit): void {
    const draft = this.draft();
    if (draft === null) return;
    const parsed = arenaParseNumber(draft, this.separators());
    if (parsed !== undefined && Number.isNaN(parsed)) {
      this.draft.set(how === 'blur' ? null : arenaDraftText(this.committed(), this.separators()));
      return;
    }
    this.commit(parsed, how);
  }

  protected onFocus(): void {
    this.draft.set(arenaDraftText(this.committed(), this.separators()));
  }

  protected onInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  protected onNativeChange(event: Event): void {
    event.stopPropagation();
  }

  protected onBlur(): void {
    this.settle('blur');
    this.draft.set(null);
    this.sync();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') { this.settle('enter'); this.sync(); return; }
    if (event.key === 'Escape') { this.draft.set(arenaDraftText(this.committed(), this.separators())); this.sync(); return; }
    const key = arenaNumberKey(event.key);
    if (key === null || this.frozen()) return;
    if (key === 'home' || key === 'end') {
      const bound = key === 'home' ? this.min() : this.max();
      if (bound === undefined) return;
      event.preventDefault();
      this.commit(bound, 'step');
      this.sync();
      return;
    }
    event.preventDefault();
    this.stepBy(key);
  }

  focus(options?: FocusOptions): void {
    this.control()?.nativeElement.focus(options);
  }

  select(): void {
    this.control()?.nativeElement.select();
  }
}
