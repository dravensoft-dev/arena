import {
  ChangeDetectionStrategy, Component, ElementRef, booleanAttribute, computed, inject, input, output, viewChild,
} from '@angular/core';
import type { ArenaButtonType, ArenaMenuAlign, ArenaMenuItem } from '../../../Api.generated';
import { arenaSplitButtonStyles } from './ArenaSplitButton.variants';
import manifest from './ArenaSplitButton.classes.generated';
import { ArenaSlotAttributes } from '../../../SlotData';
import { ArenaMenu } from '../../navigation/arena-menu/ArenaMenu';
import { ARENA_MENU_ANCHOR } from '../../navigation/arena-menu/MenuAnchor';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon';

@Component({
  selector: 'arena-split-button',
  standalone: true,
  imports: [ArenaIcon, ArenaSlotAttributes, ArenaMenu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [{
    provide: ARENA_MENU_ANCHOR,
    useFactory: () => {
      const host = inject<ElementRef<HTMLElement>>(ElementRef);
      return () => host.nativeElement.querySelector<HTMLElement>(`[data-arena-part="${manifest.parts.root}"]`);
    },
  }],
  host: {
    style: 'display: contents',
    '[attr.align]': 'null',
  },
  template: `
    <div role="group" [attr.aria-label]="name()" [class]="styles().root()" [arenaSlotData]="styles().$data.root()" [attr.data-arena-part]="parts.root">
      <button #primary [attr.type]="type()" [disabled]="inert()" [class]="styles().primary()" [arenaSlotData]="styles().$data.primary()"
              [attr.data-arena-part]="parts.primary" data-arena-boundary (click)="onPrimary()">
        @if (loading()) {
          <span [class]="styles().spinner()" [arenaSlotData]="styles().$data.spinner()" [attr.data-arena-part]="parts.spinner" aria-hidden="true"></span>
        } @else if (icon(); as glyph) {
          <arena-icon [icon]="glyph" />
        }
        <ng-content />
      </button>
      <arena-menu class="arena-fit" [items]="items()" [align]="align()" (select)="select.emit($event)">
        <button trigger type="button" [attr.aria-label]="caretName()" [disabled]="disabled()" [class]="styles().caret()"
                [arenaSlotData]="styles().$data.caret()" [attr.data-arena-part]="parts.caret">
          <arena-icon icon="ph-bold ph-caret-down" />
        </button>
      </arena-menu>
    </div>
  `,
})
export class ArenaSplitButton {
  protected readonly parts = manifest.parts;

  /** Phosphor class name drawn before the label through ArenaIcon. Replaced by the spinner while loading. */
  readonly icon = input<string>();
  /** Whether the primary action destroys or removes something. Both halves draw the danger outline whatever emphasis the split is given: danger is never filled. */
  readonly destructive = input(false, { transform: booleanAttribute });
  /** Replaces the leading icon with a spinner and blocks the primary half. The caret stays usable, so another action can start while this one runs. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Blocks both halves and dims the control. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The primary half's native button behaviour. Defaults to 'button' so a split inside a form does not submit it by accident. */
  readonly type = input<ArenaButtonType, ArenaButtonType | undefined>(
    'button',
    { transform: (value) => value ?? 'button' },
  );
  /** Names the group of both halves, such as "Deployment". Required, and guarded at runtime after trimming: a group with no name announces only that a group began. */
  readonly label = input.required<string>();
  /** Names the caret half, such as "More deploy options". Required, and guarded at runtime after trimming: a caret is a glyph, so this name is all a screen reader hears. */
  readonly menuLabel = input.required<string>();
  /** The menu's entries, in order: activatable rows, dividers and group headers. */
  readonly items = input.required<readonly ArenaMenuItem[]>();
  /** Which edge of the whole split the panel lines up with: start is the primary half's outer edge, end the caret's outer edge. */
  readonly align = input<ArenaMenuAlign, ArenaMenuAlign | undefined>(
    'end',
    { transform: (value) => value ?? 'end' },
  );
  /** The primary half was activated, by pointer or by keyboard. Never reported while loading or disabled. */
  readonly activate = output<void>();
  /** A menu entry was activated; carries the whole item. A disabled entry reports nothing, and a divider or a header cannot be activated at all. */
  readonly select = output<ArenaMenuItem>();

  private readonly primary = viewChild.required<ElementRef<HTMLButtonElement>>('primary');

  protected readonly inert = computed(() => this.disabled() || this.loading());
  protected readonly styles = computed(() => arenaSplitButtonStyles({ destructive: this.destructive() }));

  protected readonly name = computed(() => {
    const label = this.label();
    if (label.trim() === '') throw new Error('ArenaSplitButton: `label` is required, and names the group of both halves');
    return label;
  });

  protected readonly caretName = computed(() => {
    const label = this.menuLabel();
    if (label.trim() === '') throw new Error('ArenaSplitButton: `menuLabel` is required, and names the caret half');
    return label;
  });

  protected ngAfterContentInit(): void {
    const projected = [...this.primary().nativeElement.childNodes].filter(
      (node) => node.nodeType === node.ELEMENT_NODE
        || (node.nodeType === node.TEXT_NODE && (node.textContent ?? '').trim() !== ''),
    );
    if (projected.length === 0) {
      throw new Error('ArenaSplitButton: content is required, because a primary half with no label names no action');
    }
  }

  protected onPrimary(): void {
    if (!this.inert()) this.activate.emit();
  }
}
