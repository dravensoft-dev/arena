import {
  ChangeDetectionStrategy, Component, DOCUMENT, DestroyRef, ElementRef, Injector, TemplateRef,
  ViewContainerRef, computed, inject, input, viewChild,
} from '@angular/core';
import {
  type ConnectedPosition, type OverlayRef, createFlexibleConnectedPositionStrategy,
  createOverlayRef, createRepositionScrollStrategy,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { delayClose, delayOpen, sp2 } from '../../../Tokens.generated';
import { arenaTooltipStyles } from './ArenaTooltip.variants';
import manifest from './ArenaTooltip.classes.generated';
import { ArenaIdGenerator } from '../../../ArenaIds';

export const ARENA_TOOLTIP_POSITIONS: ConnectedPosition[] = [
  { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -sp2 },
  { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: sp2 },
];

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
      <span [class]="styles().bubble()" [attr.data-arena-part]="parts.bubble" role="tooltip" [id]="bubbleId">{{ label() }}</span>
    </ng-template>
  `,
})
export class ArenaTooltip {
  protected readonly parts = manifest.parts;

  /** The bubble's text. Arena draws the bubble; the consumer names it. */
  readonly label = input.required<string>();

  protected readonly bubbleId = inject(ArenaIdGenerator).next('arena-tooltip');
  protected readonly styles = computed(() => arenaTooltipStyles({ anchored: true }));

  private readonly bubble = viewChild.required<TemplateRef<unknown>>('bubble');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly doc = inject(DOCUMENT);

  private ref: OverlayRef | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private detachEscape: (() => void) | null = null;

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
    if (this.ref) return;
    const ref = createOverlayRef(this.injector, {
      positionStrategy: createFlexibleConnectedPositionStrategy(this.injector, this.host)
        .withPositions(ARENA_TOOLTIP_POSITIONS)
        .withPush(false),
      scrollStrategy: createRepositionScrollStrategy(this.injector),
    });
    ref.attach(new TemplatePortal(this.bubble(), this.viewContainer));
    this.ref = ref;
    this.describeTrigger();
    this.listenForEscape();
  }

  private detach(): void {
    this.detachEscape?.();
    this.detachEscape = null;
    this.undescribeTrigger();
    this.ref?.dispose();
    this.ref = null;
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

  private listenForEscape(): void {
    const onKeydown = (event: Event): void => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') this.closeNow();
    };
    this.doc.addEventListener('keydown', onKeydown);
    this.detachEscape = () => this.doc.removeEventListener('keydown', onKeydown);
  }
}
