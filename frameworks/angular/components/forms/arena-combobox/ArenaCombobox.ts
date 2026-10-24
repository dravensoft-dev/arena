import {
  ChangeDetectionStrategy, Component, ElementRef, TemplateRef, afterRenderEffect, booleanAttribute, computed, effect,
  inject, input, linkedSignal, output, signal, untracked, viewChild,
} from '@angular/core';
import type { ArenaComboboxFilter, ArenaSelectOption } from '../../../Api.generated';
import { sp1 } from '../../../Tokens.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { arenaPhrase } from '../../../Phrase';
import { ArenaIdGenerator } from '../../../ArenaIds';
import { ArenaAnchoredOverlay, arenaConnectedPositions } from '../../../AnchoredOverlay';
import { ArenaControlBinding, arenaWarnDoubleBinding } from '../../../ControlBinding';
import { ArenaSlotAttributes } from '../../../SlotData';
import {
  arenaActiveOptionId, arenaCommitText, arenaFilterOptions, arenaOpeningOption, arenaOptionId,
  arenaStepOption,
} from './ComboboxRules';
import { arenaComboboxStyles } from './ArenaCombobox.variants';
import manifest from './ArenaCombobox.classes.generated';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon';

export { arenaFilterOptions } from './ComboboxRules';

export const ARENA_COMBOBOX_POSITIONS = arenaConnectedPositions('start', 'below', sp1 * 1.5);

@Component({
  selector: 'arena-combobox',
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
    @if (showLabel()) {
      <label [class]="styles().label()" [attr.data-arena-part]="parts.label" [attr.for]="uid">{{ labelText() }}</label>
    }
    <div #field (mousedown)="onFieldPress($event)" [class]="styles().field()" [arenaSlotData]="styles().$data.field()" [attr.data-arena-part]="parts.field">
      @if (icon(); as glyph) {
        <span [class]="styles().icon()" [attr.data-arena-part]="parts.icon" aria-hidden="true"><arena-icon [icon]="glyph" /></span>
      }
      <input #input [id]="uid" type="text" [value]="shown()" [attr.placeholder]="placeholder() ?? null" [disabled]="off()"
             [required]="required()" role="combobox" aria-autocomplete="list" aria-haspopup="listbox"
             [attr.aria-expanded]="expanded() ? 'true' : 'false'" [attr.aria-controls]="expanded() ? listboxId : null"
             [attr.aria-activedescendant]="activeId() ?? null" [attr.aria-label]="showLabel() ? null : labelText()"
             [attr.aria-invalid]="hasError() ? 'true' : null" [attr.aria-describedby]="describedBy()" autocomplete="off"
             [class]="styles().input()" [arenaSlotData]="styles().$data.input()" [attr.data-arena-part]="parts.input"
             (input)="onInput($event)" (keydown)="onKey($event)" (click)="openList()"
             (blur)="commit()" (compositionstart)="composing = true" (compositionend)="onCompositionEnd($event)" />
      @if (hasError()) {
        <span [class]="styles().statusIcon()" [arenaSlotData]="styles().$data.statusIcon()" [attr.data-arena-part]="parts.statusIcon" aria-hidden="true"><arena-icon icon="ph-fill ph-warning-circle" /></span>
      } @else if (valid()) {
        <span [class]="styles().statusIcon()" [arenaSlotData]="styles().$data.statusIcon()" [attr.data-arena-part]="parts.statusIcon" aria-hidden="true"><arena-icon icon="ph-fill ph-check-circle" /></span>
      }
      <span [class]="styles().caret()" [attr.data-arena-part]="parts.caret" aria-hidden="true"><arena-icon icon="ph-bold ph-caret-down" /></span>
    </div>
    @if (name(); as field) {
      <input type="hidden" [attr.name]="field" [value]="posted()" [disabled]="off()" />
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
        <div [id]="listboxId" role="listbox" [attr.aria-label]="labelText()" [attr.aria-busy]="loading() ? 'true' : null"
             [class]="styles().list()" [attr.data-arena-part]="parts.list">
          @for (row of rows(); track $index; let i = $index) {
            <div [id]="optionId(i)" role="option" [attr.aria-selected]="row.value === drawn() ? 'true' : 'false'" tabindex="-1"
                 [class]="rowStyles(i, row).option()" [arenaSlotData]="rowStyles(i, row).$data.option()" [attr.data-arena-part]="parts.option"
                 (mouseenter)="active.set(i)" (click)="choose(row)">
              <span [class]="rowStyles(i, row).optionLabel()" [arenaSlotData]="rowStyles(i, row).$data.optionLabel()" [attr.data-arena-part]="parts.optionLabel">{{ row.label }}</span>
              @if (row.value === drawn()) {
                <span [class]="styles().optionMark()" [attr.data-arena-part]="parts.optionMark" aria-hidden="true"><arena-icon icon="ph-bold ph-check" /></span>
              }
            </div>
          }
        </div>
        @if (loading()) {
          <div [class]="styles().status()" [attr.data-arena-part]="parts.status">{{ locale.comboboxLoading }}</div>
        } @else if (rows().length === 0) {
          <div [class]="styles().empty()" [attr.data-arena-part]="parts.empty">{{ emptyLine() }}</div>
        }
      </div>
    </ng-template>
  `,
})
export class ArenaCombobox {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);
  private readonly binding = inject(ArenaControlBinding);

  /** The control's accessible name. Required, and guarded at runtime after trimming: a combobox with no name is announced as an unlabelled edit field. */
  readonly label = input.required<string>();
  /** Whether the label is drawn above the field. False keeps the name for assistive technology and draws nothing, for a filter row with no room for a label. */
  readonly showLabel = input(true, { transform: booleanAttribute });
  /** Shown in the empty field. A hint about what to type, never an option. */
  readonly placeholder = input<string>();
  /** The choices, in the order the list draws them. */
  readonly options = input<readonly ArenaSelectOption[], readonly ArenaSelectOption[] | undefined>(
    [],
    { transform: (value) => value ?? [] },
  );
  /** The chosen option's value. A value that neither the options nor an earlier choice holds draws an empty field with the placeholder and posts the empty string. */
  readonly value = input<string>();
  /** Options are being fetched. The list reports itself busy and draws a status line in place of the empty one. Declared, never inferred from the options. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Who narrows the options by the typed text: the control itself, or the host, which listens to search and passes the options it found. A declared member rather than a reading of whether search is listened to. */
  readonly filter = input<ArenaComboboxFilter, ArenaComboboxFilter | undefined>(
    'local',
    { transform: (value) => value ?? 'local' },
  );
  /** Blocks the control and dims it. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Must have a value for the form to submit. An emptied field on a required control restores the chosen label instead of clearing it. */
  readonly required = input(false, { transform: booleanAttribute });
  /** A line of help under the field. */
  readonly hint = input<string>();
  /** Controlled error message, and the whole validation surface: the value is always an option's, so there is nothing for a validator to reject that the options did not already prevent. */
  readonly error = input<string>();
  /** Forces the valid state, drawn with a check glyph at the field's end. */
  readonly valid = input(false, { transform: booleanAttribute });
  /** Phosphor class name drawn at the field's start through ArenaIcon. */
  readonly icon = input<string>();
  /** Submitted with the form. The chosen value is submitted, never the label, through a hidden input drawn only when a name is given. */
  readonly name = input<string>();
  /** A different option was chosen; carries its value. An emptied field committed on a control that is not required reports the empty string. */
  readonly valueChange = output<string>();
  /** The text the list is filtered by changed; carries the new text, empty after a choice, Escape or a blur. The hook a remote search listens to. */
  readonly search = output<string>();

  protected readonly uid = inject(ArenaIdGenerator).next('arena-combobox');
  protected readonly listboxId = `${this.uid}-listbox`;
  protected readonly noteId = `${this.uid}-note`;
  protected composing = false;

  private readonly fieldRef = viewChild.required<ElementRef<HTMLElement>>('field');
  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  private readonly draft = signal<string | null>(null);
  private readonly query = signal<string | null>(null);
  protected readonly active = signal(-1);
  private readonly own = linkedSignal<string | undefined>(() => this.value());
  private readonly labels = new Map<string, string>();
  private reported = '';

  private readonly overlay = new ArenaAnchoredOverlay({
    anchor: () => this.fieldRef().nativeElement,
    trigger: () => this.inputRef().nativeElement,
    panel: () => this.panel(),
    positions: () => ARENA_COMBOBOX_POSITIONS,
    matchAnchorWidth: true,
    onDismiss: (reason) => { if (reason === 'escape') this.restore(); else this.commit(); },
  });

  protected readonly expanded = this.overlay.isOpen;
  protected readonly drawn = computed(() => (this.binding.bound() ? (this.binding.value() as string | undefined) : this.own()));
  protected readonly off = computed(() => this.disabled() || this.binding.disabled());
  protected readonly hasError = computed(() => Boolean(this.error()));
  protected readonly describedBy = computed(() => (this.error() || this.hint() ? this.noteId : null));
  protected readonly labelText = computed(() => {
    const label = this.label();
    if (!label.trim()) throw new Error('arena-combobox: `label` is required, and names the field');
    return label;
  });
  protected readonly rows = computed(() => {
    const query = this.query();
    return this.filter() === 'none' || query === null ? [...this.options()] : arenaFilterOptions(this.options(), query);
  });
  private readonly remembered = computed(() => {
    const value = this.drawn();
    const held = value === undefined ? undefined : this.options().find((option) => option.value === value);
    if (held) this.labels.set(held.value, held.label);
    const known = value !== undefined && (held !== undefined || this.labels.has(value));
    return { known, label: held ? held.label : this.labels.get(value ?? '') ?? '' };
  });
  protected readonly posted = computed(() => (this.remembered().known ? (this.drawn() ?? '') : ''));
  protected readonly shown = computed(() => this.draft() ?? this.remembered().label);
  protected readonly activeId = computed(() => (this.expanded() ? arenaActiveOptionId(this.uid, this.active(), this.rows().length) : undefined));
  protected readonly announcement = computed(() => (this.expanded() && this.query() !== null && !this.loading()
    ? arenaPhrase(this.locale.comboboxCount, { count: this.rows().length })
    : ''));
  protected readonly emptyLine = computed(() => arenaPhrase(this.locale.comboboxEmpty, { query: this.draft() ?? '' }));
  protected readonly styles = computed(() => arenaComboboxStyles({
    disabled: this.off(),
    state: this.hasError() ? 'error' : this.valid() ? 'valid' : 'neutral',
  }));

  private readonly warned = effect(() => {
    if (this.binding.bound() && this.value() !== undefined) arenaWarnDoubleBinding('ArenaCombobox', 'value');
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

  protected rowStyles(index: number, row: ArenaSelectOption) {
    return arenaComboboxStyles({ active: index === this.active(), selected: row.value === this.drawn() });
  }

  protected openList(): void {
    if (this.off() || this.expanded()) return;
    this.overlay.open();
    const chosen = this.drawn();
    this.active.set(arenaOpeningOption(this.rows(), chosen ? [chosen] : []));
  }

  protected choose(row: ArenaSelectOption): void {
    const before = this.drawn();
    this.labels.set(row.value, row.label);
    this.restore();
    if (row.value !== before) this.emit(row.value);
  }

  protected commit(): void {
    const draft = this.draft();
    if (draft === null) {
      this.overlay.close();
      return;
    }
    const verdict = arenaCommitText(draft, this.drawn(), this.required());
    this.restore();
    if (verdict === 'clear') this.emit('');
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
    const row = this.expanded() && this.active() >= 0 ? this.rows()[this.active()] : undefined;
    if (row) {
      event.preventDefault();
      this.choose(row);
      return;
    }
    const draft = this.draft();
    const open = this.expanded();
    if (open) event.preventDefault();
    if (draft !== null && draft.trim() === '') this.commit();
  }

  protected onFieldPress(event: MouseEvent): void {
    const input = this.inputRef().nativeElement;
    if (event.button !== 0 || event.target === input || this.off()) return;
    event.preventDefault();
    input.focus();
    this.openList();
  }

  private typed(text: string): void {
    this.query.set(text);
    if (!this.expanded()) this.overlay.open();
    const next = this.filter() === 'none' ? this.options() : arenaFilterOptions(this.options(), text);
    this.active.set(text.trim() === '' || next.length === 0 ? -1 : 0);
    this.reported = text;
    this.search.emit(text);
  }

  private restore(): void {
    this.draft.set(null);
    this.query.set(null);
    this.active.set(-1);
    this.overlay.close();
    if (this.reported !== '') {
      this.reported = '';
      this.search.emit('');
    }
  }

  private emit(value: string): void {
    this.own.set(value);
    if (this.binding.bound()) this.binding.value.set(value);
    this.valueChange.emit(value);
    this.binding.onChange(value);
  }
}
