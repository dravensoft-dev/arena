import {
  ChangeDetectionStrategy, Component, DestroyRef, booleanAttribute, computed, inject, input, output, signal,
} from '@angular/core';
import { dismissConfirmation } from '../../../Tokens.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaIconButton } from '../arena-icon-button/ArenaIconButton';
import { arenaCopyButtonStyles } from './ArenaCopyButton.variants';
import manifest from './ArenaCopyButton.classes.generated';

export type ArenaCopyPhase = 'rest' | 'copied' | 'failed';

export const ARENA_COPY_GLYPHS = { rest: 'ph-bold ph-copy', copied: 'ph-bold ph-check', failed: 'ph-bold ph-warning' } as const;

export const ARENA_COPY_CONFIRMATION = dismissConfirmation;

@Component({
  selector: 'arena-copy-button',
  standalone: true,
  imports: [ArenaIconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
  },
  template: `
    <arena-icon-button [icon]="glyph()" [label]="name()" [showLabel]="showLabel()" [disabled]="off()" (click)="copy()" />
    <span role="status" [class]="styles().announcement()" [attr.data-arena-part]="parts.announcement">{{ said() }}</span>
  `,
})
export class ArenaCopyButton {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);

  /** What is written to the clipboard, exactly as given. A blank text draws the button disabled, because there is nothing to copy; it is data, so it is not guarded. */
  readonly text = input.required<string>();
  /** The button's accessible name, the same in every state. Absent or blank, the provided locale's copyButtonLabel answers it, which reads Copy by default. Name what is copied when a page holds more than one. */
  readonly label = input<string>();
  /** Draws the name beside the glyph, as ArenaIconButton.showLabel does. */
  readonly showLabel = input(false, { transform: booleanAttribute });
  /** Blocks the copy. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The clipboard took the text. No payload, because the consumer already holds the text. */
  readonly copied = output<void>();
  /** The clipboard refused the text, or the page has none, as on an insecure origin. No payload and never an error object. */
  readonly copyFailed = output<void>();

  protected readonly phase = signal<ArenaCopyPhase>('rest');
  protected readonly glyph = computed(() => ARENA_COPY_GLYPHS[this.phase()]);
  protected readonly name = computed(() => {
    const own = this.label();
    return own?.trim() ? own : this.locale.copyButtonLabel;
  });
  protected readonly off = computed(() => this.disabled() || this.text().trim() === '');
  protected readonly said = computed(() => {
    const phase = this.phase();
    if (phase === 'copied') return this.locale.copyButtonCopied;
    return phase === 'failed' ? this.locale.copyButtonFailed : '';
  });
  protected readonly styles = computed(() => arenaCopyButtonStyles());

  private clock: ReturnType<typeof setTimeout> | undefined;
  private alive = true;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.alive = false;
      clearTimeout(this.clock);
    });
  }

  protected copy(): void {
    if (this.off()) return;
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    if (!clipboard?.writeText) {
      this.settle('failed');
      return;
    }
    clipboard.writeText(this.text()).then(() => this.settle('copied'), () => this.settle('failed'));
  }

  private settle(next: Exclude<ArenaCopyPhase, 'rest'>): void {
    if (!this.alive) return;
    clearTimeout(this.clock);
    this.phase.set(next);
    this.clock = setTimeout(() => this.phase.set('rest'), ARENA_COPY_CONFIRMATION);
    if (next === 'copied') this.copied.emit();
    else this.copyFailed.emit();
  }
}
