import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output } from '@angular/core';
import { arenaAlertStyles } from './ArenaAlert.variants';
import type { ArenaAlertTone } from '../../../Api.generated';

const TONE_ICONS: Record<ArenaAlertTone, string> = {
  info: 'ph-fill ph-info',
  success: 'ph-fill ph-check-circle',
  warning: 'ph-fill ph-warning',
  danger: 'ph-fill ph-warning-octagon',
  neutral: 'ph-fill ph-note',
};

@Component({
  selector: 'arena-alert',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.role]': "tone() === 'danger' ? 'alert' : 'status'",
    '[attr.title]': 'null',
  },
  template: `
    <i [class]="styles().icon() + ' ' + (icon() ?? toneIcon())" aria-hidden="true"></i>
    <div [class]="styles().body()">
      @if (title(); as heading) {
        <div [class]="styles().title()">{{ heading }}</div>
      }
      <div [class]="styles().message()"><ng-content /></div>
      @if (actionLabel(); as label) {
        <button type="button" [class]="styles().action()" (click)="action.emit()">{{ label }}</button>
      }
    </div>
    @if (dismissible()) {
      <button type="button" [class]="styles().close()" aria-label="Dismiss" (click)="close.emit()">
        <i class="ph-bold ph-x" aria-hidden="true"></i>
      </button>
    }
  `,
})
export class ArenaAlert {
  /** The severity: colour, default icon, and (for danger) the alert role. */
  readonly tone = input<ArenaAlertTone, ArenaAlertTone | undefined>(
    'info',
    { transform: (value) => value ?? 'info' },
  );
  /** An optional bold lead line above the message. */
  readonly title = input<string>();
  /** A Phosphor class name overriding the tone's default glyph. Arena draws it. */
  readonly icon = input<string>();
  /** The label of a single inline action button. Absent renders no action. */
  readonly actionLabel = input<string>();
  /** Whether the × is shown. Every layer gates the × on this member and never on whether anything listens for `close`, because Arena never derives what it draws from what a consumer listens for. */
  readonly dismissible = input(false, { transform: booleanAttribute });
  /** The inline action button was activated. */
  readonly action = output<void>();
  /** The × was activated. */
  readonly close = output<void>();

  protected readonly styles = computed(() => arenaAlertStyles({ tone: this.tone(), titled: !!this.title() }));
  protected readonly toneIcon = computed(() => TONE_ICONS[this.tone()]);
}
