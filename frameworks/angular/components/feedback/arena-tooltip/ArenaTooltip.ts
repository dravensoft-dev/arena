import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, TemplateRef, computed, inject, input,
  signal, viewChild,
} from '@angular/core';
import type { ConnectedPosition } from '@angular/cdk/overlay';
import { delayClose, delayOpen, sp2 } from '../../../Tokens.generated';
import { ArenaAnchoredOverlay, arenaConnectedPositions } from '../../../AnchoredOverlay';
import { arenaTooltipStyles } from './ArenaTooltip.variants';
import manifest from './ArenaTooltip.classes.generated';
import { ArenaIdGenerator } from '../../../ArenaIds';
import { arenaAccessibleText, arenaTooltipRedundant } from './TooltipName';
import { ArenaSlotAttributes } from '../../../SlotData';

export const ARENA_TOOLTIP_POSITIONS: ConnectedPosition[] = arenaConnectedPositions('center', 'above', sp2);

export function arenaJoinDescribedBy(own: string | null, bubbleId: string): string {
  return own ? `${own} ${bubbleId}` : bubbleId;
}

export function arenaStripDescribedBy(current: string | null, bubbleId: string): string | null {
  if (!current) return null;
  const rest = current.split(/\s+/).filter((id) => id && id !== bubbleId);
  return rest.length ? rest.join(' ') : null;
}

@Component({
  selector: 'arena-tooltip',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '(pointerenter)': 'scheduleOpen()',
    '(pointerleave)': 'scheduleClose()',
    '(focusin)': 'openNow()',
    '(focusout)': 'closeNow()',
  },
  template: `
    <ng-content />
    <ng-template #bubble>
      <span [class]="styles().bubble()" [attr.data-arena-surface]="'floating'" [arenaSlotData]="styles().$data.bubble()" [attr.data-arena-part]="parts.bubble" role="tooltip" [id]="bubbleId">@if (quiet()) {<span aria-hidden="true">{{ label() }}</span>} @else {{{ label() }}}</span>
    </ng-template>
  `,
})
export class ArenaTooltip {
  protected readonly parts = manifest.parts;

  /** The bubble's text. Arena draws the bubble; the consumer names it. */
  readonly label = input.required<string>();

  protected readonly bubbleId = inject(ArenaIdGenerator).next('arena-tooltip');
  protected readonly styles = computed(() => arenaTooltipStyles());
  protected readonly quiet = signal(false);

  private readonly bubble = viewChild.required<TemplateRef<unknown>>('bubble');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private timer: ReturnType<typeof setTimeout> | null = null;

  private readonly overlay = new ArenaAnchoredOverlay({
    anchor: () => this.host.nativeElement,
    trigger: () => this.trigger(),
    panel: () => this.bubble(),
    positions: () => ARENA_TOOLTIP_POSITIONS,
    onDismiss: () => this.closeNow(),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.closeNow());
  }

  protected scheduleOpen(): void {
    this.schedule(() => this.attach(), delayOpen);
  }

  protected scheduleClose(): void {
    this.schedule(() => this.detach(), delayClose);
  }

  protected openNow(): void {
    this.clearTimer();
    this.attach();
  }

  protected closeNow(): void {
    this.clearTimer();
    this.detach();
  }

  private schedule(run: () => void, ms: number): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      run();
    }, ms);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private attach(): void {
    if (this.overlay.isOpen()) return;
    const trigger = this.trigger();
    this.quiet.set(trigger ? arenaTooltipRedundant(arenaAccessibleText(trigger), this.label()) : false);
    this.overlay.open();
    this.describeTrigger();
  }

  private detach(): void {
    if (!this.overlay.isOpen()) return;
    this.undescribeTrigger();
    this.overlay.close();
  }

  private trigger(): HTMLElement | null {
    const first = this.host.nativeElement.firstElementChild;
    return first instanceof HTMLElement ? first : null;
  }

  private describeTrigger(): void {
    const trigger = this.trigger();
    if (trigger) {
      trigger.setAttribute('aria-describedby', arenaJoinDescribedBy(trigger.getAttribute('aria-describedby'), this.bubbleId));
    }
  }

  private undescribeTrigger(): void {
    const trigger = this.trigger();
    if (!trigger) return;
    const rest = arenaStripDescribedBy(trigger.getAttribute('aria-describedby'), this.bubbleId);
    if (rest) trigger.setAttribute('aria-describedby', rest);
    else trigger.removeAttribute('aria-describedby');
  }
}
