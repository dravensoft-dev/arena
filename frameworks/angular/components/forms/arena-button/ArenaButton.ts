import {
  ChangeDetectionStrategy, Component, ElementRef, afterNextRender, booleanAttribute, computed,
  input, output, viewChild,
} from '@angular/core';
import type { ArenaButtonType, ArenaButtonVariant, ArenaControlSize } from '../../../Api.generated';
import { arenaButtonStyles } from './ArenaButton.variants';
import manifest from './ArenaButton.classes.generated';

@Component({
  selector: 'arena-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display: contents',
    '[attr.name]': 'null',
  },
  template: `
    <button #control [class]="styles().root()" [attr.data-arena-part]="parts.root" [attr.type]="type()" [disabled]="inert()"
            [attr.name]="name()" [attr.value]="value()" [attr.form]="form()"
            [attr.tabindex]="tabStop() ? null : -1" (click)="onClick($event)">
      @if (loading()) {
        <span [class]="styles().spinner()" [attr.data-arena-part]="parts.spinner" aria-hidden="true"></span>
      } @else if (icon(); as glyph) {
        <i [class]="glyph" aria-hidden="true"></i>
      }
      <ng-content />
      @if (iconRight(); as glyph) {
        <i [class]="glyph" aria-hidden="true"></i>
      }
    </button>
  `,
})
export class ArenaButton {
  protected readonly parts = manifest.parts;

  /** Which action this is. Danger is outline, never filled. */
  readonly variant = input<ArenaButtonVariant, ArenaButtonVariant | undefined>(
    'primary',
    { transform: (value) => value ?? 'primary' },
  );
  /** Height, from the density tokens, so the button re-densifies inside .arena-compact. */
  readonly size = input<ArenaControlSize, ArenaControlSize | undefined>(
    'md',
    { transform: (value) => value ?? 'md' },
  );
  /** Phosphor class name drawn before the label. Replaced by the spinner while loading. */
  readonly icon = input<string>();
  /** Phosphor class name drawn after the label: a caret on a menu trigger, an arrow on a next action. */
  readonly iconRight = input<string>();
  /** Replaces the leading icon with a spinner and blocks activation. The spin slows under reduced motion rather than stopping: a frozen spinner reads as a hung process. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Stretches to the container's width. */
  readonly full = input(false, { transform: booleanAttribute });
  /** Blocks activation and dims the control. Implied by loading. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Native button behaviour. Defaults to 'button' so a button inside a form does not submit it by accident. */
  readonly type = input<ArenaButtonType, ArenaButtonType | undefined>(
    'button',
    { transform: (value) => value ?? 'button' },
  );
  /** Submitted with the form, when the button submits one. */
  readonly name = input<string>();
  /** The value submitted under `name`. */
  readonly value = input<string>();
  /** Focused on mount. */
  readonly autoFocus = input(false, { transform: booleanAttribute });
  /** The id of the form this button belongs to, when it is not a descendant of it. */
  readonly form = input<string>();
  /** Whether the control is reached from the page's Tab sequence. Set false when it lives inside a composite that manages its own focus (a grid with a roving tab stop, a menu), where reaching it by Tab would be a second way in. Arena writes tabindex="-1" and the control stays programmatically focusable; a positive tab order is not expressible and never should be. Arena's own table is NOT that composite: its grid deliberately has no step-in, so a control in a cell keeps its place in the page Tab sequence and setting this false there takes away its only keyboard route, since the cursor moves by cell and Enter activates the row. */
  readonly tabStop = input(true, { transform: booleanAttribute });
  /** The button was activated, by pointer or by keyboard. */
  readonly click = output<void>();

  protected readonly inert = computed(() => this.disabled() || this.loading());
  protected readonly styles = computed(() => arenaButtonStyles({
    variant: this.variant(), size: this.size(), full: this.full(),
  }));

  private readonly control = viewChild<ElementRef<HTMLButtonElement>>('control');

  constructor() {
    afterNextRender(() => {
      if (this.autoFocus()) this.control()?.nativeElement.focus();
    });
  }

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.inert()) this.click.emit();
  }
}
