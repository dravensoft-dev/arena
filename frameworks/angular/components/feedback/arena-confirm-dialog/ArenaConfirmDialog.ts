import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ArenaButton } from '../../forms/arena-button/ArenaButton';
import { arenaConfirmDialogStyles } from './ArenaConfirmDialog.variants';
import manifest from './ArenaConfirmDialog.classes.generated';
import { type FocusTrapState, arenaHandleOpenTransition, arenaTrapTabKey } from '../../../FocusTrap';

let nextId = 0;

export function isArenaConfirmLocked(required: string | undefined, typed: string): boolean {
  return required !== undefined && required !== '' && typed.trim() !== required;
}

@Component({
  selector: 'arena-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '(keydown)': 'onKeydown($event)',
    '[attr.title]': 'null',
  },
  imports: [ArenaButton],
  template: `
    @if (open()) {
      <div #panel [class]="styles().panel()" [attr.data-arena-part]="parts.panel" role="alertdialog" aria-modal="true" tabindex="-1"
           [attr.aria-labelledby]="titleId" [attr.aria-describedby]="descId">
        <div [class]="styles().head()" [attr.data-arena-part]="parts.head">
          <div [class]="styles().eyebrow()" [attr.data-arena-part]="parts.eyebrow">{{ eyebrow() }}</div>
          <div [id]="titleId" [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ title() }}</div>
        </div>
        <div [id]="descId" [class]="styles().body()" [attr.data-arena-part]="parts.body">
          <ng-content />
          @if (requireText(); as required) {
            <div [class]="styles().requireBlock()" [attr.data-arena-part]="parts.requireBlock">
              <div [class]="styles().requireLabel()" [attr.data-arena-part]="parts.requireLabel">Type "{{ required }}" to confirm</div>
              <input [class]="styles().input()" [attr.data-arena-part]="parts.input" [value]="typed()" (input)="onType($event)" />
            </div>
          }
        </div>
        <div [class]="styles().foot()" [attr.data-arena-part]="parts.foot">
          <arena-button variant="ghost" (click)="cancel.emit()">{{ cancelLabel() }}</arena-button>
          <button type="button" [class]="styles().confirm()" [attr.data-arena-part]="parts.confirm" [disabled]="locked()" (click)="confirm.emit()">{{ confirmLabel() }}</button>
        </div>
      </div>
    }
  `,
})
export class ArenaConfirmDialog {
  protected readonly parts = manifest.parts;

  /** Whether the dialog is shown. The host owns it, as in the other three modals: defaulting it would let an ArenaConfirmDialog whose open was never wired render nothing forever and look like a working closed dialog. */
  readonly open = input.required<boolean, unknown>({ transform: booleanAttribute });

  /** The dialog heading, and the name the panel's aria-labelledby points at. Required: nothing can derive a name for a confirmation, because its subject is editorial, and a modal announcing only its role is worse than none at all. Required whatever open is, since a required member absent is a caller bug rather than a state to render: render the component when there is something to confirm, and hold on to the subject across a cancel so it still has a name while it closes. */
  readonly title = input.required<string>();
  /** Small uppercase label above the title. */
  readonly eyebrow = input<string, string | undefined>(
    'Confirm',
    { transform: (value) => value ?? 'Confirm' },
  );
  /** The confirm button's label. */
  readonly confirmLabel = input<string, string | undefined>(
    'Confirm',
    { transform: (value) => value ?? 'Confirm' },
  );
  /** The cancel button's label. */
  readonly cancelLabel = input<string, string | undefined>(
    'Cancel',
    { transform: (value) => value ?? 'Cancel' },
  );
  /** Gives the confirm button Arena's only filled danger surface. */
  readonly destructive = input(false, { transform: booleanAttribute });
  /** Locks the confirm button until this exact word is typed. */
  readonly requireText = input<string>();
  /** The dialog was dismissed -- by the Cancel action or by the Escape key, in both layers. A scrim click is deliberately NOT one of them: this component never closes on click-outside. No payload. */
  readonly cancel = output<void>();
  /** The action was confirmed. */
  readonly confirm = output<void>();

  private readonly doc = inject(DOCUMENT);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  private readonly uid = `arena-confirm-dialog-${nextId++}`;
  protected readonly titleId = `${this.uid}-title`;
  protected readonly descId = `${this.uid}-body`;

  protected readonly typed = signal('');
  protected readonly locked = computed(() => isArenaConfirmLocked(this.requireText(), this.typed()));
  protected readonly styles = computed(() => arenaConfirmDialogStyles({
    destructive: this.destructive(),
    invalid: this.locked() && this.typed().length > 0,
    open: this.open(),
  }));

  private readonly focusTrap: FocusTrapState = { wasOpen: false, restoreTo: null };

  constructor() {
    afterRenderEffect(() => {
      const isOpen = this.open();
      untracked(() => {
        arenaHandleOpenTransition(this.focusTrap, isOpen, this.panel()?.nativeElement ?? null, this.doc.activeElement);
      });
    });
  }

  protected onType(event: Event): void {
    this.typed.set((event.target as HTMLInputElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.open()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel.emit();
      return;
    }
    if (event.key === 'Tab') {
      const panel = this.panel()?.nativeElement;
      if (panel) arenaTrapTabKey(panel, event, this.doc.activeElement);
    }
  }
}
