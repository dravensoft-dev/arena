import {
  ChangeDetectionStrategy, Component, booleanAttribute, computed, contentChild, inject, input, output,
} from '@angular/core';
import type { ArenaSheetPlacement } from '../../../Api.generated';
import { ArenaFooter } from '../../../ProjectionMarkers';
import { arenaSheetStyles } from './ArenaSheet.variants';
import manifest from './ArenaSheet.classes.generated';
import { ArenaIdGenerator } from '../../../ArenaIds';

@Component({
  selector: 'arena-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'open() ? parts.root : null',
    '(keydown)': 'onKeydown($event)',
    '[attr.title]': 'null',
  },
  template: `
    @if (open()) {
      <div [class]="styles().head()" [attr.data-arena-part]="parts.head">
        <button type="button" [id]="triggerId" [class]="styles().trigger()" [attr.data-arena-part]="parts.trigger"
                [attr.aria-expanded]="!collapsed()" [attr.aria-controls]="bodyId"
                (click)="fold()" (keydown)="onTriggerKeydown($event)">
          <span>{{ heading() }}</span>
          <i [class]="styles().caret() + ' ' + caretGlyph()" [attr.data-arena-part]="parts.caret" aria-hidden="true"></i>
        </button>
        @if (dismissible()) {
          <button type="button" [class]="styles().close()" [attr.data-arena-part]="parts.close" aria-label="Close" (click)="close.emit()">
            <i class="ph-bold ph-x" aria-hidden="true"></i>
          </button>
        }
      </div>
      <div [id]="bodyId" [class]="styles().body()" [attr.data-arena-part]="parts.body" role="group"
           [attr.aria-labelledby]="triggerId" [hidden]="collapsed()">
        <ng-content />
      </div>
      @if (footer()) {
        <div [class]="styles().foot()" [attr.data-arena-part]="parts.foot"><ng-content select="[footer]" /></div>
      }
    }
  `,
})
export class ArenaSheet {
  protected readonly parts = manifest.parts;

  /** Whether the panel is on the page at all. The host owns it, the same way it owns a dialog's. Closed renders nothing, which is what distinguishes it from collapsed. */
  readonly open = input.required<boolean, unknown>({ transform: booleanAttribute });
  /** The edge the panel is anchored to. It spans that edge and stands off the device's own inset there, so a bottom sheet on a phone clears the home indicator. */
  readonly placement = input<ArenaSheetPlacement, ArenaSheetPlacement | undefined>(
    'bottom',
    { transform: (value) => value ?? 'bottom' },
  );
  /** Names the panel for assistive technology and heads it visually. It is also the accessible name of the fold control, so a reader hears which panel is being folded rather than the word Toggle. Required and **guarded at runtime** rather than defaulted: what this panel is showing is editorial, and a constant fallback would satisfy the pattern mechanically while telling a screen-reader user nothing. */
  readonly title = input.required<string>();
  /** Whether the body is folded away. The header stays visible either way: a collapsed panel is still on the page and still says what it is, which is why folding is not the same act as closing. The body is hidden rather than removed, so the fold control's reference to it never points at nothing. */
  readonly collapsed = input(false, { transform: booleanAttribute });
  /** The fold control was pressed, carrying the state it moved to. Arena never folds the panel by itself, so a host that ignores this gets a control that reports and a body that does not move. */
  readonly collapsedChange = output<boolean>();
  /** Whether the close control is shown. Every layer gates it on this member and never on whether anything listens for `close`, because Arena never derives what it draws from what a consumer listens for. */
  readonly dismissible = input(false, { transform: booleanAttribute });
  /** The panel was dismissed, by the close control or by Escape. No payload. Escape reports here rather than adding a member of its own, and it is the only key the panel takes: a non-modal panel leaves every other key to the page behind it. */
  readonly close = output<void>();

  protected readonly footer = contentChild(ArenaFooter);
  private readonly uid = inject(ArenaIdGenerator).next('arena-sheet');
  protected readonly triggerId = `${this.uid}-trigger`;
  protected readonly bodyId = `${this.uid}-body`;

  protected readonly caretGlyph = computed(() => (this.collapsed() ? 'ph-bold ph-caret-up' : 'ph-bold ph-caret-down'));
  protected readonly styles = computed(() => arenaSheetStyles({ placement: this.placement(), open: this.open() }));

  protected readonly heading = computed(() => {
    const text = this.title();
    if (text.trim() === '') {
      throw new Error('ArenaSheet: `title` is required, and names the panel and the control that folds it');
    }
    return text;
  });

  protected fold(): void {
    this.collapsedChange.emit(!this.collapsed());
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.fold();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.open() || event.key !== 'Escape') return;
    event.preventDefault();
    this.close.emit();
  }
}
