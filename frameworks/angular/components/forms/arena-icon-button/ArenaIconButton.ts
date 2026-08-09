import {
  ChangeDetectionStrategy, Component, ElementRef, afterNextRender, booleanAttribute, computed,
  input, output, viewChild,
} from '@angular/core';
import type { ArenaButtonType, ArenaControlSize, ArenaIconButtonVariant } from '../../../Api.generated';
import { arenaIconButtonStyles } from './ArenaIconButton.variants';

@Component({
  selector: 'arena-icon-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display: contents',
    '[attr.name]': 'null',
  },
  template: `
    <button #control [class]="styles().root()" [attr.type]="type()" [disabled]="disabled()"
            [attr.name]="name()" [attr.value]="value()" [attr.form]="form()"
            [attr.tabindex]="tabStop() ? null : -1"
            [attr.aria-label]="label()" [attr.title]="showLabel() ? null : label()"
            [attr.aria-pressed]="pressed() === undefined ? null : pressed()"
            (click)="onClick($event)">
      <i [class]="icon()" aria-hidden="true"></i>
      @if (showLabel()) {
        <span [class]="styles().label()">{{ label() }}</span>
      }
    </button>
  `,
})
export class ArenaIconButton {
  /** Phosphor class name, e.g. 'ph-bold ph-plus'. Arena draws the <i> and hides it from assistive technology; `label` is the accessible name. */
  readonly icon = input.required<string>();
  /** The accessible name, present in every state. Also the visible text when showLabel is set, and the title attribute when it is not. */
  readonly label = input.required<string>();
  /** Height, from the density tokens: the same scale ArenaButton uses, so the two re-densify together in a toolbar. */
  readonly size = input<ArenaControlSize, ArenaControlSize | undefined>(
    'md',
    { transform: (value) => value ?? 'md' },
  );
  /** Visual treatment. */
  readonly variant = input<ArenaIconButtonVariant, ArenaIconButtonVariant | undefined>(
    'ghost',
    { transform: (value) => value ?? 'ghost' },
  );
  /** Whether this control is a toggle, and whether it is currently on. Present, Arena writes aria-pressed and draws the on state with the same accent tint a current ArenaSideNav item takes, so "this one is on" is one statement across the library; absent, the control is not a toggle at all. The tri-state is the point and a default of false would destroy it: aria-pressed="false" on a plain button announces a toggle that is off rather than a button, so every ArenaIconButton in the system would announce as an unpressed toggle. The label does NOT change with the state, which is what the button pattern means by a toggle: a control that renames itself is announced as a different control rather than as the same one in another state. */
  readonly pressed = input<boolean | undefined>();
  /** Shows the label as text beside the icon (H6). Don't rely on the title alone on touch or keyboard surfaces. */
  readonly showLabel = input(false, { transform: booleanAttribute });
  /** Blocks activation and dims the control. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Native button behaviour. Defaults to 'button' so an icon button inside a form does not submit it by accident. */
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
  /** Whether the control is reached from the page's Tab sequence. Set false when it lives inside a composite that manages its own focus (a grid with a roving tab stop, a menu), where reaching it by Tab would be a second way in. Arena writes tabindex="-1" and the control stays programmatically focusable; a positive tab order is not expressible and never should be. */
  readonly tabStop = input(true, { transform: booleanAttribute });
  /** The button was activated, by pointer or by keyboard. */
  readonly click = output<void>();

  protected readonly styles = computed(() => arenaIconButtonStyles({
    variant: this.variant(), size: this.size(), showLabel: this.showLabel(),
    pressed: this.pressed() === true,
  }));

  private readonly control = viewChild<ElementRef<HTMLButtonElement>>('control');

  constructor() {
    afterNextRender(() => {
      if (this.autoFocus()) this.control()?.nativeElement.focus();
    });
  }

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.disabled()) this.click.emit();
  }
}
