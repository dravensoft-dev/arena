import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, booleanAttribute, computed, inject,
  input, linkedSignal, output, signal, viewChild,
} from '@angular/core';
import type { ArenaFileRejection, ArenaFileSelection } from '../../../Api.generated';
import { arenaFileInputStyles } from './ArenaFileInput.variants';
import manifest from './ArenaFileInput.classes.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaControlBinding } from '../../../ControlBinding';
import { ArenaSlotAttributes } from '../../../SlotData';
import { ArenaTag } from '../../display/arena-tag/ArenaTag';
import {
  arenaFileAnnouncement, arenaFileInputIds, arenaFileRejection, arenaFileSelection, arenaFileSize,
  arenaMergeFiles, arenaRejectionLines, arenaWriteInputFiles,
} from './FileRules';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon';

interface Shown {
  files: File[];
  rejection: ArenaFileRejection | null;
}

const NOTHING: Shown = { files: [], rejection: null };

@Component({
  selector: 'arena-file-input',
  standalone: true,
  imports: [ArenaIcon, ArenaSlotAttributes, ArenaTag],
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
    <label [id]="ids().label" [attr.for]="ids().trigger" [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ label() }}@if (required()) {
      <span [class]="styles().required()" [attr.data-arena-part]="parts.required" aria-hidden="true">*</span>
    }</label>
    @if (required()) {
      <span [id]="requiredId()" [class]="styles().requiredLabel()" [attr.data-arena-part]="parts.requiredLabel">{{ locale.fileInputRequired }}</span>
    }
    <div [class]="styles().zone()" [arenaSlotData]="styles().$data.zone()" [attr.data-arena-part]="parts.zone"
         (dragenter)="onDragEnter($event)" (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)">
      <button #trigger type="button" [id]="ids().trigger" [attr.aria-labelledby]="named()"
              [attr.aria-describedby]="error() || hint() ? noteId() : null" [disabled]="off()"
              [class]="styles().trigger()" [arenaSlotData]="styles().$data.trigger()" [attr.data-arena-part]="parts.trigger" (click)="open()">
        <span [class]="styles().icon()" [attr.data-arena-part]="parts.icon" aria-hidden="true"><arena-icon icon="ph-bold ph-upload-simple" /></span>
        <span [id]="ids().text">{{ multiple() ? locale.fileInputChooseMultiple : locale.fileInputChoose }}</span>
      </button>
      @if (droppable()) {
        <span [class]="styles().prompt()" [attr.data-arena-part]="parts.prompt">{{ locale.fileInputDrop }}</span>
      }
      <input #control type="file" tabindex="-1" aria-hidden="true" [attr.name]="name() ?? null" [attr.accept]="accept() ?? null"
             [multiple]="multiple()" [required]="required()" [disabled]="off()"
             [class]="styles().input()" [attr.data-arena-part]="parts.input"
             (change)="onNativeChange($event)" (invalid)="focusTrigger()" (focus)="focusTrigger()" />
    </div>
    @if (shown().files.length > 0) {
      <ul role="list" [class]="styles().files()" [attr.data-arena-part]="parts.files">
        @for (file of shown().files; track keyOf(file); let index = $index) {
          <li [class]="styles().file()" [attr.data-arena-part]="parts.file">
            <arena-tag removable [disabled]="off()" (remove)="remove(index)">{{ file.name }}</arena-tag>
            <span [class]="styles().size()" [attr.data-arena-part]="parts.size">{{ sizeOf(file) }}</span>
          </li>
        }
      </ul>
    }
    @if (lines().length > 0) {
      <ul role="list" [class]="styles().rejected()" [attr.data-arena-part]="parts.rejected">
        @for (line of lines(); track $index) {
          <li [class]="styles().rejection()" [attr.data-arena-part]="parts.rejection">{{ line }}</li>
        }
      </ul>
    }
    <span role="status" [class]="styles().status()" [attr.data-arena-part]="parts.status">{{ announcement() }}</span>
    @if (error(); as message) {
      <span [id]="noteId()" [class]="styles().error()" [attr.data-arena-part]="parts.error">{{ message }}</span>
    } @else if (hint(); as text) {
      <span [id]="noteId()" [class]="styles().hint()" [attr.data-arena-part]="parts.hint">{{ text }}</span>
    }
  `,
})
export class ArenaFileInput {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);
  private readonly binding = inject(ArenaControlBinding);
  protected readonly off = computed(() => this.disabled() || this.binding.disabled());

  /** Names what is being attached, such as "Passport scan". The text labels the field and, followed by the trigger's own text, names the trigger, so a screen reader hears "Passport scan, Choose file". Required, and guarded at runtime: a blank one throws, because nothing can derive what a file is for. */
  readonly label = input.required<string>();
  /** The trigger's id, and what the label's `for` points at. Generated from `label` when omitted, as `fi-` followed by the label with each run of whitespace replaced by a single hyphen and the whole lowercased. The derivation is normative, and the prefix differs per component on purpose. Identical markup must get the same id in every layer, and two controls sharing a label must not collide. The label and the trigger's text take this id followed by `-label` and `-text`. The hint or the error takes it followed by `-note`, and the required word takes `-required`. */
  readonly id = input<string>();
  /** A line of help under the field, and the trigger's description. An error replaces it while one shows. */
  readonly hint = input<string>();
  /** Controlled error message, such as a count rule or a refusal from the server. Wins over the hint and turns the zone's edge to the danger hue. The message describes the trigger, and a changed message is announced once. */
  readonly error = input<string>();
  /** Marks the label and makes the hidden file input required. A native submission then refuses an empty selection, the browser's message is anchored at the trigger and focus returns to the trigger. The trigger's name then carries the required word, as in "Passport scan, required, Choose file". */
  readonly required = input(false, { transform: booleanAttribute });
  /** Blocks the trigger, the drop zone and every chip's remove, and dims the field. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The name the files are submitted under. The hidden file input carries it and always holds exactly the files shown, so a native submission and `new FormData(form)` carry the real files. */
  readonly name = input<string>();
  /** The native `accept` syntax, such as `.pdf,image/*`: extensions, exact types and wildcard types. The syntax narrows the picker and is enforced on every pick and every drop, because a drop is not filtered by the browser. */
  readonly accept = input<string>();
  /** Whether more than one file may be held. With it a pick or a drop appends, and a file already held, the same name, size and modified time, is held once. Without it a pick replaces the selection, and every accepted file after the first in one drop is refused as surplus. */
  readonly multiple = input(false, { transform: booleanAttribute });
  /** The largest file held, in bytes; a file of exactly this size is held. A bigger one is refused and never held. */
  readonly maxSize = input<number>();
  /** Whether the field is a drop zone with a dashed frame. Without it the field cancels no drag and a file dropped on it is the browser's. The trigger is the keyboard route either way. */
  readonly droppable = input(false, { transform: booleanAttribute });
  /** The selection changed through a pick, a drop or a chip's remove; carries the whole selection as metadata, in held order. A clear the host asks for, and a form reset, fire nothing. */
  readonly change = output<ArenaFileSelection>();
  /** Files in the last pick or drop were refused; carries their names by reason. Never fires empty. */
  readonly reject = output<ArenaFileRejection>();

  protected readonly shown = signal<Shown>(NOTHING);
  private readonly dragging = signal(false);

  protected readonly ids = computed(() => {
    const label = this.label();
    if (label.trim() === '') throw new Error('ArenaFileInput: `label` is required, and names what is being attached');
    return arenaFileInputIds(this.id(), label);
  });

  protected readonly noteId = computed(() => `${this.ids().trigger}-note`);

  protected readonly requiredId = computed(() => `${this.ids().trigger}-required`);

  protected readonly named = computed(() => {
    const ids = this.ids();
    return this.required() ? `${ids.label} ${this.requiredId()} ${ids.text}` : `${ids.label} ${ids.text}`;
  });

  private readonly said = linkedSignal<string | undefined, string>({
    source: this.error,
    computation: (error, previous) => (previous === undefined ? '' : error ?? ''),
  });

  protected readonly lines = computed(() => arenaRejectionLines(this.locale, this.shown().rejection, this.maxSize()));

  protected readonly announcement = computed(() => [
    arenaFileAnnouncement(this.locale, this.shown().files.length, this.lines()), this.said(),
  ].filter(Boolean).join(' '));

  protected readonly styles = computed(() => arenaFileInputStyles({
    droppable: this.droppable(),
    dragging: this.dragging(),
    state: this.error() ? 'error' : 'neutral',
    disabled: this.off(),
  }));


  private readonly control = viewChild<ElementRef<HTMLInputElement>>('control');
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const form = this.control()?.nativeElement.form;
      if (!form) return;
      const reset = () => this.hold([], null);
      form.addEventListener('reset', reset);
      destroyRef.onDestroy(() => form.removeEventListener('reset', reset));
    });
  }

  protected keyOf(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`;
  }

  protected sizeOf(file: File): string {
    return arenaFileSize(file.size, this.locale.locale);
  }

  protected open(): void {
    this.control()?.nativeElement.click();
  }

  protected focusTrigger(): void {
    this.trigger()?.nativeElement.focus();
  }

  protected onNativeChange(event: Event): void {
    event.stopPropagation();
    this.take(Array.from((event.target as HTMLInputElement).files ?? []));
  }

  protected onDragEnter(event: DragEvent): void {
    if (!this.droppable() || !this.carriesFiles(event)) return;
    event.preventDefault();
    if (!this.off()) this.dragging.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.droppable() || !this.carriesFiles(event)) return;
    event.preventDefault();
    if (this.off() && event.dataTransfer) event.dataTransfer.dropEffect = 'none';
  }

  protected onDragLeave(event: DragEvent): void {
    if (!this.droppable()) return;
    const zone = event.currentTarget as HTMLElement;
    if (!zone.contains(event.relatedTarget as Node | null)) this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    if (!this.droppable() || !this.carriesFiles(event)) return;
    event.preventDefault();
    this.dragging.set(false);
    if (!this.off()) this.take(Array.from(event.dataTransfer?.files ?? []));
  }

  protected remove(index: number): void {
    const files = this.shown().files.filter((_, at) => at !== index);
    this.hold(files, this.shown().rejection);
    this.focusTrigger();
    this.report(files);
  }

  private carriesFiles(event: DragEvent): boolean {
    return Boolean(event.dataTransfer?.types?.includes('Files'));
  }

  private take(incoming: File[]): void {
    if (incoming.length === 0) {
      this.write(this.shown().files);
      return;
    }
    const merge = arenaMergeFiles(this.shown().files, incoming, {
      accept: this.accept(), maxSize: this.maxSize(), multiple: this.multiple(),
    });
    const rejection = arenaFileRejection(merge);
    this.hold(merge.held, rejection);
    if (merge.changed) this.report(merge.held);
    if (rejection) this.reject.emit(rejection);
  }

  private hold(files: File[], rejection: ArenaFileRejection | null): void {
    this.write(files);
    this.shown.set({ files, rejection });
    this.said.set('');
  }

  private write(files: readonly File[]): void {
    const control = this.control()?.nativeElement;
    if (control) arenaWriteInputFiles(control, files);
  }

  private report(files: readonly File[]): void {
    this.change.emit(arenaFileSelection(files));
    this.binding.onChange([...files]);
  }

  files(): File[] {
    return [...this.shown().files];
  }

  clear(): void {
    this.hold([], null);
  }
}
