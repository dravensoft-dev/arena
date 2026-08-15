import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChild,
  effect,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { ArenaFooter } from '../../../ProjectionMarkers';
import { arenaWarnOnce } from '../../../WarnOnce';
import { arenaDialogStyles } from './ArenaDialog.variants';
import manifest from './ArenaDialog.classes.generated';
import { type FocusTrapState, arenaHandleOpenTransition, arenaTrapTabKey } from '../../../FocusTrap';

let nextId = 0;

@Component({
  selector: 'arena-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().scrim()',
    '[attr.data-arena-part]': 'parts.scrim',
    '(click)': 'onScrimClick()',
    '(keydown)': 'onKeydown($event)',
    '[attr.title]': 'null',
  },
  template: `
    @if (open()) {
      <div #panel [class]="styles().panel()" [attr.data-arena-part]="parts.panel" role="dialog" aria-modal="true" tabindex="-1"
           [attr.aria-labelledby]="titleId" [style.width]="width()"
           (click)="$event.stopPropagation()">
        <div [class]="styles().head()" [attr.data-arena-part]="parts.head">
          @if (eyebrow(); as label) {
            <div [class]="styles().eyebrow()" [attr.data-arena-part]="parts.eyebrow">{{ label }}</div>
          }
          <div [id]="titleId" [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ title() }}</div>
        </div>
        <div [class]="styles().body()" [attr.data-arena-part]="parts.body"><ng-content /></div>
        @if (footer()) {
          <div [class]="styles().foot()" [attr.data-arena-part]="parts.foot"><ng-content select="[footer]" /></div>
        }
      </div>
    }
  `,
})
export class ArenaDialog {
  protected readonly parts = manifest.parts;

  /** Whether the dialog is shown. The host owns it. */
  readonly open = input.required<boolean, unknown>({ transform: booleanAttribute });

  /** Names the dialog for assistive technology and heads it visually. Required: aria-labelledby points at it, and a modal with no name is worse than none at all. */
  readonly title = input.required<string>();
  /** A short kicker above the title. */
  readonly eyebrow = input<string>();
  /** A CSS width for the panel. It defaults to 480px, which each layer reaches in its own idiom, and the input overrides whichever. */
  readonly width = input<string>();
  /** The dialog was dismissed -- by Escape or by a scrim click. No payload. */
  readonly close = output<void>();

  private readonly doc = inject(DOCUMENT);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly titleId = `arena-dialog-${nextId++}-title`;
  protected readonly footer = contentChild(ArenaFooter);
  protected readonly styles = computed(() => arenaDialogStyles({ open: this.open() }));

  private readonly focusTrap: FocusTrapState = { wasOpen: false, restoreTo: null };

  constructor() {
    effect(() => {
      const value = this.width();
      if (value === undefined || arenaIsCssWidth(value)) return;
      arenaWarnOnce(
        `arena-dialog: width takes a CSS width and "${value}" is not one, so the browser drops the `
        + 'declaration and the panel keeps its default. Pass a length, or the spacing scale '
        + 'arithmetic the default itself uses: calc(var(--sp-1) * 160).',
      );
    });
    afterRenderEffect(() => {
      const isOpen = this.open();
      untracked(() => {
        arenaHandleOpenTransition(this.focusTrap, isOpen, this.panel()?.nativeElement ?? null, this.doc.activeElement);
      });
    });
  }

  protected onScrimClick(): void {
    if (this.open()) this.close.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.open()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close.emit();
      return;
    }
    if (event.key === 'Tab') {
      const panel = this.panel()?.nativeElement;
      if (panel) arenaTrapTabKey(panel, event, this.doc.activeElement);
    }
  }
}

function arenaIsCssWidth(value: string): boolean {
  if (value.includes('(') || typeof document === 'undefined') return true;
  const probe = document.createElement('div');
  probe.style.width = value;
  return probe.style.width !== '';
}
