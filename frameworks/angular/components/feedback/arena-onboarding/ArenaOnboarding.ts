import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { arenaOnboardingStyles } from './ArenaOnboarding.variants';
import { type FocusTrapState, arenaHandleOpenTransition, arenaTrapTabKey } from '../../../FocusTrap';
import { onboardingWidth, onboardingHeightReserve, sp3, sp4 } from '../../../Tokens.generated';

const SSR_VIEWPORT_H = 900;
import type { ArenaOnboardingAnchor, ArenaOnboardingStep } from '../../../Api.generated';

@Component({
  selector: 'arena-onboarding',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '(click)': 'onScrimClick()',
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    @if (visible()) {
      <div #panel [class]="styles().panel()" role="dialog" aria-modal="true" tabindex="-1"
           [attr.aria-label]="label()"
           (click)="$event.stopPropagation()"
           [style.top.px]="position()?.top" [style.left.px]="position()?.left">
        @if (step().eyebrow; as eyebrow) {
          <div [class]="styles().eyebrow()">{{ eyebrow }}</div>
        }
        @if (step().title; as title) {
          <div [class]="styles().title()">{{ title }}</div>
        }
        @if (step().body; as body) {
          <div [class]="styles().body()">{{ body }}</div>
        }
        <div [class]="styles().foot()">
          <div [class]="styles().dots()" [attr.aria-label]="'Progress: step ' + (index() + 1) + ' of ' + steps().length">
            @for (dot of steps(); track $index) {
              <span [class]="styles().dot() + ' ' + ($index === index() ? styles().dotOn() : styles().dotOff())"></span>
            }
          </div>
          @if (index() > 0) {
            <button type="button" [class]="styles().text()" (click)="back.emit()">Back</button>
          }
          @if (!last()) {
            <button type="button" [class]="styles().text()" (click)="skip.emit()">Skip</button>
          }
          <button type="button" [class]="styles().next()" (click)="last() ? done.emit() : next.emit()">
            {{ last() ? 'Got it' : 'Next' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class ArenaOnboarding {
  /** Whether the tour is shown. Closed renders nothing, scrim included. */
  readonly open = input.required<boolean, unknown>({ transform: booleanAttribute });
  /** The tour, in order. An empty tour renders nothing. */
  readonly steps = input.required<readonly ArenaOnboardingStep[]>();
  /** Which step is current. The host owns it and answers next/back. */
  readonly index = input<number, number | undefined>(0, { transform: (value) => value ?? 0 });
  /** Where to attach the coachmark, as the two viewport coordinates it positions from. Absent floats it bottom-right. */
  readonly anchor = input<ArenaOnboardingAnchor>();
  /** Next was activated on a step that is not the last. */
  readonly next = output<void>();
  /** Back was activated on a step that is not the first. */
  readonly back = output<void>();
  /** Skip was activated, or the scrim was clicked. */
  readonly skip = output<void>();
  /** The final step's confirming control was activated. */
  readonly done = output<void>();

  private readonly doc = inject(DOCUMENT);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly visible = computed(() => this.open() && this.steps().length > 0);
  protected readonly step = computed<ArenaOnboardingStep>(() => this.steps()[this.index()] ?? {});
  protected readonly last = computed(() => this.index() === this.steps().length - 1);

  protected readonly label = computed(() => {
    const current = this.step();
    return current.title ?? current.eyebrow ?? `Step ${this.index() + 1} of ${this.steps().length}`;
  });

  protected readonly styles = computed(() => arenaOnboardingStyles({
    placement: this.anchor() ? 'anchored' : 'floating',
    open: this.open(),
  }));

  protected readonly position = computed(() => {
    const rect = this.anchor();
    if (!rect) return null;
    const view = this.doc.defaultView;
    const W = onboardingWidth;
    const EDGE = sp4;
    const top = Math.min(rect.bottom + sp3, (view?.innerHeight ?? SSR_VIEWPORT_H) - onboardingHeightReserve);
    const left = view ? Math.min(rect.left, view.innerWidth - W - EDGE) : rect.left;
    return { top, left: Math.max(EDGE, left) };
  });

  private readonly focusTrap: FocusTrapState = { wasOpen: false, restoreTo: null };

  constructor() {
    afterRenderEffect(() => {

      const isOpen = this.visible();
      untracked(() => {
        arenaHandleOpenTransition(this.focusTrap, isOpen, this.panel()?.nativeElement ?? null, this.doc.activeElement);
      });
    });
  }

  protected onScrimClick(): void {
    if (this.visible()) this.skip.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.visible()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.skip.emit();
      return;
    }
    if (event.key === 'Tab') {
      const panel = this.panel()?.nativeElement;
      if (panel) arenaTrapTabKey(panel, event, this.doc.activeElement);
    }
  }
}
