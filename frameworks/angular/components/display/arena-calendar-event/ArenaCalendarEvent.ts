import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, booleanAttribute,
  computed, inject, input, output, signal, viewChild,
} from '@angular/core';
import type { ArenaCatSlot } from '../../../Api.generated';
import { arenaCatColor } from '../../../DataVisuals';
import { arenaPublished } from '../../../ProjectedInputs';
import { ArenaIconButton } from '../../forms/arena-icon-button/ArenaIconButton';
import { ArenaCalendarState } from '../arena-calendar/ArenaCalendarState';
import {
  type EventTimes, arenaFormatDate, arenaFormatHM, arenaShowsTime, arenaStacksActions,
} from '../arena-calendar/CalendarInternals';
import { arenaCalendarEventStyles } from './ArenaCalendarEvent.variants';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

let seq = 0;

@Component({
  selector: 'arena-calendar-event',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArenaIconButton],
  host: { style: 'display: contents', '[attr.title]': 'null', '[attr.id]': 'null' },
  template: `
    @if (across(); as across) {
      @if (hasPanel()) {
        <div [id]="domId" [class]="chipClass()" [style]="across"
             [style.top.px]="topPx()" [style.height.px]="heightPx()"
             [style.background]="tint()" [style.borderLeftColor]="ink()"
             (keydown)="onKeydown($event)">
          @if (interactive()) {
            <button #focusable type="button" tabindex="-1" [class]="bodyClass()"
                    [attr.aria-label]="label()" [attr.aria-disabled]="inert()"
                    (click)="onActivate($event)">
              <span [class]="styles().title()">{{ heading() }}</span>
              @if (showTime()) {
                <span [class]="styles().time()">{{ timeLabel() }}</span>
              }
            </button>
          } @else {
            <span #focusable tabindex="-1" [class]="bodyClass()" (click)="onActivate($event)">
              <span [class]="styles().title()">{{ heading() }}</span>
              @if (showTime()) {
                <span [class]="styles().time()">{{ timeLabel() }}</span>
              }
            </span>
          }
          <span #kebabWrap [class]="kebabClass()">
            <arena-icon-button icon="ph-bold ph-dots-three-vertical" label="Actions" size="sm"
                               [tabStop]="false" (click)="togglePanel()" />
            @if (panelOpen()) {
              <span #panel [class]="styles().panel()" [style.zIndex]="1">
                <ng-content select="[actions]" />
              </span>
            }
          </span>
        </div>
      } @else if (interactive()) {
        <button #focusable [id]="domId" type="button" tabindex="-1" [class]="chipClass()"
                [style]="across" [style.top.px]="topPx()" [style.height.px]="heightPx()"
                [style.background]="tint()" [style.borderLeftColor]="ink()"
                [attr.aria-label]="label()" [attr.aria-disabled]="inert()"
                (click)="onActivate($event)">
          <span [class]="styles().title()">{{ heading() }}</span>
          @if (showTime()) {
            <span [class]="styles().time()">{{ timeLabel() }}</span>
          }
        </button>
      } @else {
        <div #focusable [id]="domId" tabindex="-1" [class]="chipClass()"
             [style]="across" [style.top.px]="topPx()" [style.height.px]="heightPx()"
             [style.background]="tint()" [style.borderLeftColor]="ink()"
             (click)="onActivate($event)">
          <span [class]="styles().title()">{{ heading() }}</span>
          @if (showTime()) {
            <span [class]="styles().time()">{{ timeLabel() }}</span>
          }
        </div>
      }
    }
  `,
})
export class ArenaCalendarEvent {
  /** Stable identity, so a host can switch on it rather than on the title. */
  readonly id = input.required<string>();
  /** What the chip reads. */
  readonly title = input.required<string>();
  /** ISO datetime the event begins. */
  readonly start = input.required<string>();
  /** ISO datetime the event ends. */
  readonly end = input.required<string>();
  /** Identity colour. Give the same entity the same slot everywhere and it keeps its colour across views. */
  readonly colorId = input<ArenaCatSlot>();
  /** Whether the chip can be activated. A boolean rather than "is `click` bound?", because Arena never derives what it draws from what a consumer listens for, and the same member `ArenaTableRow.interactive` is for the same reason. An interactive chip is a <button> a keyboard user reaches with Enter from the hour cell it overlaps; a non-interactive one draws the same chip with no role and no activation, so a read-only schedule announces events rather than a screenful of buttons that do nothing. */
  readonly interactive = input(false, { transform: booleanAttribute });
  /** Whether the chip shows its action button. A boolean rather than "is the actions slot filled?": Arena never derives what it draws from what a consumer listens for, because projected content is not inspectable in at least one platform, so gating the drawing on it is a divergence waiting to happen. */
  readonly actionsEnabled = input(false, { transform: booleanAttribute });
  /** Whether the chip is drawn but cannot be activated: an event a consumer's rules lock, such as one already past or owned by someone else. It reflects through `aria-disabled` rather than the native `disabled` attribute, so the chip keeps its place in the grid's roving Tab sequence and is announced as unavailable instead of disappearing from it. With `interactive` false there is nothing to activate and the chip is inert already. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The chip was activated. No payload: the consumer wrote this element, so they already hold the event this is about. Never emitted while `disabled`. */
  readonly click = output<void>();

  private readonly times = arenaPublished<EventTimes>(
    () => ({ id: this.id(), start: this.start(), end: this.end() }),
  );

  protected readonly domId = `arena-calendar-event-${seq++}`;

  private readonly state = inject(ArenaCalendarState);
  private readonly destroyRef = inject(DestroyRef);
  private readonly focusable = viewChild<ElementRef<HTMLElement>>('focusable');
  private readonly kebabWrap = viewChild<ElementRef<HTMLElement>>('kebabWrap');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private openedByUser = false;

  protected readonly panelOpen = signal(false);

  protected readonly hasPanel = computed(() => this.actionsEnabled());

  private readonly placement = computed(() => this.state.placementOf(this));

  protected readonly topPx = computed(() => {
    const at = this.placement();
    return at ? this.state.y(at.startMin) : 0;
  });

  protected readonly heightPx = computed(() => {
    const at = this.placement();
    return at ? this.state.y(at.endMin) - this.state.y(at.startMin) : 0;
  });

  protected readonly across = computed(() => {
    const at = this.placement();
    if (!at) return null;
    const columns = this.state.days().length;
    const leftShare = ((at.dayIndex + at.col / at.cols) / columns) * 100;
    const widthShare = (1 / (at.cols * columns)) * 100;
    return { left: `${leftShare}%`, right: `${100 - leftShare - widthShare}%` };
  });

  protected readonly showTime = computed(() => {
    const at = this.placement();
    return at !== null && arenaShowsTime(this.heightPx(), this.state.slotWidth(at.cols));
  });

  protected readonly actionsBelow = computed(() => {
    const at = this.placement();
    return at !== null && arenaStacksActions(this.heightPx(), this.state.slotWidth(at.cols));
  });

  protected readonly ink = computed(() => arenaCatColor(this.colorId() ?? 1));

  protected readonly tint = computed(
    () => `color-mix(in oklab, ${this.ink()} 16%, var(--surface-card))`,
  );

  protected readonly timeLabel = computed(() => {
    const at = this.placement();
    return at ? `${arenaFormatHM(at.startMin)} – ${arenaFormatHM(at.endMin)}` : '';
  });

  protected readonly label = computed(() => {
    const at = this.placement();
    if (!at) return null;
    const day = arenaFormatDate(at.dayIso, { weekday: 'long', day: 'numeric', month: 'long' });
    return `${this.heading()}, ${day}, ${this.timeLabel()}`;
  });

  protected readonly inert = computed(() => (this.disabled() ? 'true' : null));

  protected readonly heading = computed(() => {
    for (const [member, value] of [
      ['id', this.id()], ['title', this.title()], ['start', this.start()], ['end', this.end()],
    ] as const) {
      if (value.trim() === '') throw new Error(`ArenaCalendarEvent: \`${member}\` is required`);
    }
    return this.title();
  });

  protected readonly styles = computed(() => arenaCalendarEventStyles());

  protected readonly chipClass = computed(() => arenaCalendarEventStyles({
    reserve: this.hasPanel() && !this.actionsBelow(),
    panelOpen: this.panelOpen(),
    clickable: this.interactive() && !this.disabled(),
    disabled: this.interactive() && this.disabled(),
  }).chip());

  protected readonly bodyClass = computed(
    () => arenaCalendarEventStyles({ disabled: this.interactive() && this.disabled() }).chipBody(),
  );

  protected readonly kebabClass = computed(
    () => arenaCalendarEventStyles({ actionsBelow: this.actionsBelow() }).kebabWrap(),
  );

  constructor() {
    this.state.register(this, {
      domId: this.domId,
      focus: () => this.focusable()?.nativeElement.focus(),
      times: this.times,
    });
    this.destroyRef.onDestroy(() => this.state.release(this));

    afterRenderEffect(() => {
      if (!this.panelOpen() || !this.openedByUser) return;
      this.openedByUser = false;
      this.panel()?.nativeElement.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    });
  }

  protected togglePanel(): void {
    this.openedByUser = !this.panelOpen();
    this.panelOpen.update((open) => !open);
  }

  protected onActivate(event: MouseEvent): void {
    event.stopPropagation();
    if (this.interactive() && !this.disabled()) this.click.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const kebab = this.kebabWrap()?.nativeElement.querySelector<HTMLElement>('button');
    if (event.key === 'Escape' && this.panelOpen()) {
      event.stopPropagation();
      this.panelOpen.set(false);
      kebab?.focus();
      return;
    }
    if (!kebab) return;
    if (event.key === 'ArrowRight' && event.target !== kebab) {
      event.preventDefault();
      event.stopPropagation();
      kebab.focus();
    } else if (event.key === 'ArrowLeft' && event.target === kebab) {
      event.preventDefault();
      event.stopPropagation();
      this.focusable()?.nativeElement.focus();
    }
  }
}
