import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output } from '@angular/core';
import type { ArenaToastTone } from '../../../Api.generated';
import { dismissDefault, dismissActionable } from '../../../Tokens.generated';
import { arenaToastStyles } from './ArenaToast.variants';
import manifest from './ArenaToast.classes.generated';

export const ARENA_TOAST_DISMISS = { default: dismissDefault, actionable: dismissActionable } as const;

@Component({
  selector: 'arena-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.role]': "tone() === 'danger' ? 'alert' : 'status'",
    '[attr.aria-live]': "tone() === 'danger' ? 'assertive' : 'polite'",
    '[attr.data-persist]': "pinned() ? '' : null",
    '[attr.title]': 'null',
  },
  template: `
    <div [class]="styles().body()" [attr.data-arena-part]="parts.body">
      @if (title(); as heading) {
        <div [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading }}@if (pinned()) {
          <span [class]="styles().pinned()" [attr.data-arena-part]="parts.pinned" title="Does not auto-dismiss">Pinned</span>
        }</div>
      }
      @if (message(); as text) {
        <div [class]="styles().message()" [attr.data-arena-part]="parts.message">{{ text }}</div>
      }
      @if (actionLabel(); as label) {
        <button type="button" [class]="styles().action()" [attr.data-arena-part]="parts.action" (click)="action.emit()">{{ label }}</button>
      }
    </div>
    @if (dismissible()) {
      <button type="button" [class]="styles().close()" [attr.data-arena-part]="parts.close" aria-label="Close" (click)="close.emit()">
        <i class="ph-bold ph-x" aria-hidden="true"></i>
      </button>
    }
  `,
})
export class ArenaToast {
  protected readonly parts = manifest.parts;

  /** The bold lead line. */
  readonly title = input<string>();
  /** The body. */
  readonly message = input<string>();
  /** The side bar's colour, and whether the toast announces assertively. */
  readonly tone = input<ArenaToastTone, ArenaToastTone | undefined>(
    'neutral',
    { transform: (value) => value ?? 'neutral' },
  );
  /** The label of the single inline action: Undo, Retry, View logs. Absent renders no action. */
  readonly actionLabel = input<string>();
  /** The inline action was activated. */
  readonly action = output<void>();
  /** Disables the host's auto-dismiss and shows the Pinned marker. **Implied by `tone: "danger"`, which ignores `false`**: a critical message that vanishes on a timer is one a user can miss entirely, and this was documented as mandatory in an error state while nothing enforced it. Set it explicitly for any other tone that must not disappear on its own. */
  readonly persist = input(false, { transform: booleanAttribute });
  /** Whether the × is shown. Every layer gates the × on this member and never on whether anything listens for `close`, because Arena never derives what it draws from what a consumer listens for. */
  readonly dismissible = input(false, { transform: booleanAttribute });
  /** The × was activated. */
  readonly close = output<void>();

  protected readonly pinned = computed(() => this.persist() || this.tone() === 'danger');
  protected readonly styles = computed(() => arenaToastStyles({ tone: this.tone() }));
}
