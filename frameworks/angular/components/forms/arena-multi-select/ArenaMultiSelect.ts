import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, TemplateRef, afterNextRender, afterRenderEffect, booleanAttribute,
  computed, effect, inject, input, linkedSignal, output, signal, untracked, viewChild,
} from '@angular/core';
import type { ArenaComboboxFilter, ArenaSelectOption, ArenaValueSet } from '../../../Api.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { arenaPhrase } from '../../../Phrase';
import { ArenaIdGenerator } from '../../../ArenaIds';
import { ArenaAnchoredOverlay } from '../../../AnchoredOverlay';
import { ArenaControlBinding, arenaWarnDoubleBinding } from '../../../ControlBinding';
import { ArenaSlotAttributes } from '../../../SlotData';
import { ArenaTag } from '../../display/arena-tag/ArenaTag';
import { ARENA_COMBOBOX_POSITIONS } from '../arena-combobox/ArenaCombobox';
import {
  arenaActiveOptionId, arenaAtCap, arenaChipAfterRemoval, arenaChipWindow, arenaFilterOptions,
  arenaOpeningOption, arenaOptionId, arenaStepChip, arenaStepOption, arenaToggleValue, arenaUniqueValues,
} from '../arena-combobox/ComboboxRules';
import { arenaMultiSelectStyles } from './ArenaMultiSelect.variants';
import manifest from '../arena-combobox/ArenaCombobox.classes.generated';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon';

const CLOSE = '[data-arena-part="tag.close"]';

@Component({
  selector: 'arena-multi-select',
  standalone: true,
  imports: [ArenaIcon, ArenaSlotAttributes, ArenaTag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaControlBinding],
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-disabled]': "styles().$data.root()['data-arena-disabled'] ?? null",
    '[attr.data-arena-part]': 'parts.root',
    '[attr.name]': 'null',
  },
  template: `
    @if (showLabel()) {
      <label [class]="styles().label()" [attr.data-arena-part]="parts.label" [attr.for]="uid">{{ labelText() }}</label>
    }
    <div #field (mousedown)="onFieldPress($event)" [class]="styles().field()" [arenaSlotData]="styles().$data.field()" [attr.data-arena-part]="parts.field">
      @if (icon(); as glyph) {
        <span [class]="styles().icon()" [attr.data-arena-part]="parts.icon" aria-hidden="true"><arena-icon [icon]="glyph" /></span>
      }
      <div #chips [class]="styles().chips()" [attr.data-arena-part]="parts.chips" (keydown)="onChipKey($event)">
        @for (one of window().shown; track one; let i = $index) {
          <arena-tag removable [tabStop]="false" [disabled]="off()" (remove)="remove(i)">{{ chipLabel(one) }}</arena-tag>
        }
        @if (window().hidden > 0) {
          <span role="img" [attr.aria-label]="moreLabel()" [class]="styles().more()" [attr.data-arena-part]="parts.more">{{ moreText() }}</span>
        }
        <input #input [id]="uid" type="text" [value]="draft()" [attr.placeholder]="chosen().length === 0 ? (placeholder() ?? null) : null"
               [disabled]="off()" role="combobox" aria-autocomplete="list" aria-haspopup="listbox"
               [attr.aria-expanded]="expanded() ? 'true' : 'false'" [attr.aria-controls]="expanded() ? listboxId : null"
               [attr.aria-activedescendant]="activeId() ?? null" [attr.aria-label]="showLabel() ? null : labelText()"
               [attr.aria-required]="required() ? 'true' : null" [attr.aria-invalid]="hasError() ? 'true' : null"
               [attr.aria-describedby]="describedBy()" autocomplete="off"
               [class]="styles().input()" [arenaSlotData]="styles().$data.input()" [attr.data-arena-part]="parts.input"
               (input)="onInput($event)" (keydown)="onKey($event)" (click)="openList()"
               (blur)="closeList()" (compositionstart)="composing = true" (compositionend)="onCompositionEnd($event)" />
      </div>
      @if (clearable() && chosen().length > 0 && !off()) {
        <button type="button" tabindex="-1" [attr.aria-label]="locale.multiSelectClear" [class]="styles().clear()" [attr.data-arena-part]="parts.clear"
                (mousedown)="$event.preventDefault()" (click)="clearAll()">
          <arena-icon icon="ph-bold ph-x-circle" />
        </button>
      }
      @if (hasError()) {
        <span [class]="styles().statusIcon()" [arenaSlotData]="styles().$data.statusIcon()" [attr.data-arena-part]="parts.statusIcon" aria-hidden="true"><arena-icon icon="ph-fill ph-warning-circle" /></span>
      } @else if (valid()) {
        <span [class]="styles().statusIcon()" [arenaSlotData]="styles().$data.statusIcon()" [attr.data-arena-part]="parts.statusIcon" aria-hidden="true"><arena-icon icon="ph-fill ph-check-circle" /></span>
      }
      <span [class]="styles().caret()" [attr.data-arena-part]="parts.caret" aria-hidden="true"><arena-icon icon="ph-bold ph-caret-down" /></span>
    </div>
    @if (name(); as field) {
      @for (one of chosen(); track one) {
        <input type="hidden" [attr.name]="field" [value]="one" [disabled]="off()" />
      }
    }
    <span role="status" [class]="styles().announcement()" [attr.data-arena-part]="parts.announcement">{{ announcement() }}</span>
    @if (error(); as message) {
      <span [class]="styles().error()" [attr.data-arena-part]="parts.error" [attr.id]="noteId">{{ message }}</span>
    } @else if (hint(); as text) {
      <span [class]="styles().hint()" [attr.data-arena-part]="parts.hint" [attr.id]="noteId">{{ text }}</span>
    }
    <ng-template #panel>
      <div [class]="styles().panel()" [attr.data-arena-surface]="'floating'" [attr.data-arena-part]="parts.panel"
           (mousedown)="$event.preventDefault()">
        <div [id]="listboxId" role="listbox" aria-multiselectable="true" [attr.aria-label]="labelText()" [attr.aria-busy]="loading() ? 'true' : null"
             [class]="styles().list()" [attr.data-arena-part]="parts.list">
          @for (row of rows(); track $index; let i = $index) {
            <div [id]="optionId(i)" role="option" [attr.aria-selected]="isChosen(row) ? 'true' : 'false'"
                 [attr.aria-disabled]="isBlocked(row) ? 'true' : null" tabindex="-1"
                 [class]="rowStyles(i, row).option()" [arenaSlotData]="rowStyles(i, row).$data.option()" [attr.data-arena-part]="parts.option"
                 (mouseenter)="active.set(i)" (click)="toggle(row)">
              <span [class]="rowStyles(i, row).optionLabel()" [arenaSlotData]="rowStyles(i, row).$data.optionLabel()" [attr.data-arena-part]="parts.optionLabel">{{ row.label }}</span>
              @if (isChosen(row)) {
                <span [class]="styles().optionMark()" [attr.data-arena-part]="parts.optionMark" aria-hidden="true"><arena-icon icon="ph-bold ph-check" /></span>
              }
            </div>
          }
        </div>
        @if (loading()) {
          <div [class]="styles().status()" [attr.data-arena-part]="parts.status">{{ locale.multiSelectLoading }}</div>
        } @else if (rows().length === 0) {
          <div [class]="styles().empty()" [attr.data-arena-part]="parts.empty">{{ emptyLine() }}</div>
        }
      </div>
    </ng-template>
  `,
})
export class ArenaMultiSelect {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);
  private readonly binding = inject(ArenaControlBinding);
  private readonly injector = inject(Injector);

  /** The control's accessible name. Required, and guarded at runtime after trimming: a field with no name is announced as an unlabelled edit field. */
  readonly label = input.required<string>();
  /** Whether the label is drawn above the field. False keeps the name for assistive technology and draws nothing, for a filter row with no room for a label. */
  readonly showLabel = input(true, { transform: booleanAttribute });
  /** Shown in the empty field while no value is chosen. A hint about what to type, never an option. */
  readonly placeholder = input<string>();
  /** The choices, in the order the list draws them. */
  readonly options = input<readonly ArenaSelectOption[], readonly ArenaSelectOption[] | undefined>(
    [],
    { transform: (value) => value ?? [] },
  );
  /** The chosen values, in the order they were chosen. A value that neither the options nor an earlier choice holds is kept and drawn as its own text. */
  readonly value = input<readonly string[], readonly string[] | undefined>([], { transform: (value) => value ?? [] });
  /** The most values that can be chosen. Absent, there is no limit. Once it is reached, every row not chosen is unavailable and choosing one is announced as blocked; removing a value stays possible. */
  readonly max = input<number>();
  /** How many chosen values are drawn as chips before the rest collapse into a count. Absent, every chip is drawn and the field wraps. The collapsed values stay readable in the open list, where they are the chosen rows. */
  readonly maxVisible = input<number>();
  /** Whether a control that empties the whole selection is drawn while a value is chosen. A declared boolean rather than a reading of whether change is listened to; false by default because a field one press can empty is a choice the consumer makes. */
  readonly clearable = input(false, { transform: booleanAttribute });
  /** Options are being fetched. The list reports itself busy and draws a status line in place of the empty one. Declared, never inferred from the options. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Who narrows the options by the typed text: the control itself, or the host, which listens to search and passes the options it found. A declared member rather than a reading of whether search is listened to. */
  readonly filter = input<ArenaComboboxFilter, ArenaComboboxFilter | undefined>(
    'local',
    { transform: (value) => value ?? 'local' },
  );
  /** Blocks the control and dims it, chips included. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** At least one value must be chosen for the form to be complete. The field reports itself required to assistive technology. */
  readonly required = input(false, { transform: booleanAttribute });
  /** A line of help under the field. */
  readonly hint = input<string>();
  /** Controlled error message, and the whole validation surface: every value is an option's or one the consumer supplied, so there is nothing for a validator to parse. */
  readonly error = input<string>();
  /** Forces the valid state, drawn with a check glyph at the field's end. */
  readonly valid = input(false, { transform: booleanAttribute });
  /** Phosphor class name drawn at the field's start through ArenaIcon. */
  readonly icon = input<string>();
  /** Submitted with the form. Each chosen value is submitted under it as a hidden input, so a form posts a repeated field; nothing is drawn without a name. */
  readonly name = input<string>();
  /** The chosen set changed, by a row, a chip or the clear control; carries the whole new set, never a difference. */
  readonly valueChange = output<ArenaValueSet>();
  /** The text the list is filtered by changed; carries the new text, empty after a pick, Escape or a blur. The hook a remote search listens to. */
  readonly search = output<string>();

  protected readonly uid = inject(ArenaIdGenerator).next('arena-multi-select');
  protected readonly listboxId = `${this.uid}-listbox`;
  protected readonly noteId = `${this.uid}-note`;
  protected composing = false;

  private readonly fieldRef = viewChild.required<ElementRef<HTMLElement>>('field');
  private readonly chipsRef = viewChild.required<ElementRef<HTMLElement>>('chips');
  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  protected readonly draft = signal('');
  private readonly query = signal<string | null>(null);
  private readonly notice = signal('');
  protected readonly active = signal(-1);
  private readonly own = linkedSignal<readonly string[]>(() => this.value());
  private readonly labels = new Map<string, string>();
  private reported = '';

  private readonly overlay = new ArenaAnchoredOverlay({
    anchor: () => this.fieldRef().nativeElement,
    trigger: () => this.inputRef().nativeElement,
    panel: () => this.panel(),
    positions: () => ARENA_COMBOBOX_POSITIONS,
    matchAnchorWidth: true,
    onDismiss: () => this.closeList(),
  });

  protected readonly expanded = this.overlay.isOpen;
  protected readonly chosen = computed(() => arenaUniqueValues(this.binding.bound()
    ? ((this.binding.value() as readonly string[] | undefined) ?? [])
    : this.own()));
  private readonly remembered = computed(() => {
    const options = this.options();
    for (const one of this.chosen()) {
      const held = options.find((option) => option.value === one);
      if (held) this.labels.set(held.value, held.label);
    }
    return new Map(this.labels);
  });
  protected readonly off = computed(() => this.disabled() || this.binding.disabled());
  protected readonly hasError = computed(() => Boolean(this.error()));
  protected readonly describedBy = computed(() => (this.error() || this.hint() ? this.noteId : null));
  protected readonly labelText = computed(() => {
    const label = this.label();
    if (!label.trim()) throw new Error('arena-multi-select: `label` is required, and names the field');
    return label;
  });
  protected readonly rows = computed(() => {
    const query = this.query();
    return this.filter() === 'none' || query === null ? [...this.options()] : arenaFilterOptions(this.options(), query);
  });
  protected readonly window = computed(() => arenaChipWindow(this.chosen(), this.maxVisible()));
  protected readonly capped = computed(() => arenaAtCap(this.chosen(), this.max()));
  protected readonly moreText = computed(() => arenaPhrase(this.locale.multiSelectMore, { count: this.window().hidden }));
  protected readonly moreLabel = computed(() => arenaPhrase(this.locale.multiSelectMoreLabel, { count: this.window().hidden }));
  protected readonly activeId = computed(() => (this.expanded() ? arenaActiveOptionId(this.uid, this.active(), this.rows().length) : undefined));
  protected readonly announcement = computed(() => this.notice() || (this.expanded() && this.query() !== null && !this.loading()
    ? arenaPhrase(this.locale.multiSelectCount, { count: this.rows().length })
    : ''));
  protected readonly emptyLine = computed(() => arenaPhrase(this.locale.multiSelectEmpty, { query: this.draft() }));
  protected readonly styles = computed(() => arenaMultiSelectStyles({
    disabled: this.off(),
    state: this.hasError() ? 'error' : this.valid() ? 'valid' : 'neutral',
  }));

  private readonly warned = effect(() => {
    if (this.binding.bound() && this.value().length > 0) arenaWarnDoubleBinding('ArenaMultiSelect', 'value');
  });

  constructor() {
    afterRenderEffect(() => {
      const index = this.active();
      if (!this.expanded() || index < 0) return;
      untracked(() => {
        const row = this.overlay.panelElement()?.querySelectorAll('[role="option"]').item(index);
        if (row instanceof HTMLElement && typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'nearest' });
      });
    });
  }

  protected optionId(index: number): string {
    return arenaOptionId(this.uid, index);
  }

  protected chipLabel(value: string): string {
    return this.remembered().get(value) ?? value;
  }

  protected isChosen(row: ArenaSelectOption): boolean {
    return this.chosen().includes(row.value);
  }

  protected isBlocked(row: ArenaSelectOption): boolean {
    return this.capped() && !this.isChosen(row);
  }

  protected rowStyles(index: number, row: ArenaSelectOption) {
    return arenaMultiSelectStyles({ active: index === this.active(), selected: this.isChosen(row), blocked: this.isBlocked(row) });
  }

  protected openList(): void {
    if (this.off() || this.expanded()) return;
    this.overlay.open();
    this.active.set(arenaOpeningOption(this.rows(), this.chosen()));
  }

  protected closeList(): void {
    this.draft.set('');
    this.query.set(null);
    this.notice.set('');
    this.active.set(-1);
    this.overlay.close();
    this.settle();
  }

  protected toggle(row: ArenaSelectOption): boolean {
    const next = arenaToggleValue(this.chosen(), row.value, this.max());
    if (next === null) {
      const text = arenaPhrase(this.locale.multiSelectMax, { max: this.max() ?? 0 });
      this.notice.update((before) => (before === text ? `${text}\u00a0` : text));
      return false;
    }
    this.labels.set(row.value, row.label);
    this.notice.set('');
    this.draft.set('');
    this.query.set(null);
    this.settle();
    this.active.set(this.options().findIndex((option) => option.value === row.value));
    this.emit(next);
    return true;
  }

  protected remove(index: number): void {
    if (this.off()) return;
    const shown = this.window().shown;
    this.emit(this.chosen().filter((one) => one !== shown[index]));
    this.focusChip(arenaChipAfterRemoval(index, shown.length));
  }

  protected clearAll(): void {
    this.notice.set('');
    this.emit([]);
    this.inputRef().nativeElement.focus();
  }

  protected onInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.draft.set(text);
    if (!this.composing) this.typed(text);
  }

  protected onCompositionEnd(event: Event): void {
    this.composing = false;
    this.typed((event.target as HTMLInputElement).value);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.isComposing || this.composing || event.keyCode === 229) return;
    const field = event.target as HTMLInputElement;
    const atStart = this.draft() === '' && (field.selectionStart ?? 0) === 0;
    if ((event.key === 'Backspace' || event.key === 'ArrowLeft') && atStart && this.window().shown.length > 0) {
      event.preventDefault();
      this.focusChip(this.window().shown.length - 1);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.expanded()) {
        if (event.key === 'ArrowDown') this.openList();
        return;
      }
      this.active.set(arenaStepOption(this.active(), event.key, this.rows().length));
      return;
    }
    if (event.key !== 'Enter') return;
    if (this.expanded()) event.preventDefault();
    const row = this.expanded() && this.active() >= 0 ? this.rows()[this.active()] : undefined;
    if (row && this.toggle(row)) this.closeList();
  }

  protected onFieldPress(event: MouseEvent): void {
    const input = this.inputRef().nativeElement;
    const target = event.target as HTMLElement;
    if (event.button !== 0 || target === input || this.off() || target.closest('button')) return;
    event.preventDefault();
    input.focus();
    this.openList();
  }

  protected onChipKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (!target.matches(CLOSE)) return;
    const buttons = Array.from(this.chipsRef().nativeElement.querySelectorAll<HTMLElement>(CLOSE));
    const index = buttons.indexOf(target);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.focusChip(arenaStepChip(index, event.key, buttons.length));
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.remove(index);
    }
  }

  private focusChip(index: number): void {
    afterNextRender(() => {
      const buttons = this.chipsRef().nativeElement.querySelectorAll<HTMLElement>(CLOSE);
      const target = index >= 0 ? buttons.item(index) : null;
      (target ?? this.inputRef().nativeElement).focus();
    }, { injector: this.injector });
  }

  private typed(text: string): void {
    this.query.set(text);
    this.notice.set('');
    if (!this.expanded()) this.overlay.open();
    const next = this.filter() === 'none' ? this.options() : arenaFilterOptions(this.options(), text);
    this.active.set(text.trim() === '' || next.length === 0 ? -1 : 0);
    this.reported = text;
    this.search.emit(text);
  }

  private settle(): void {
    if (this.reported === '') return;
    this.reported = '';
    this.search.emit('');
  }

  private emit(values: string[]): void {
    this.own.set(values);
    if (this.binding.bound()) this.binding.value.set(values);
    this.valueChange.emit({ values });
    this.binding.onChange(values);
  }
}
