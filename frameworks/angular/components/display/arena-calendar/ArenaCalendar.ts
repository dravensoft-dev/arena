import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, afterRenderEffect,
  booleanAttribute, computed, contentChild, contentChildren, inject, input, linkedSignal,
  numberAttribute, output, signal, viewChild,
} from '@angular/core';
import type { ArenaCalendarView } from '../../../Api.generated';
import { arenaContainerWidth, arenaReadBreakpoint } from '../../../ContainerSize';
import { ArenaActions } from '../../../ProjectionMarkers';
import { ArenaCalendarEvent } from '../arena-calendar-event/ArenaCalendarEvent';
import { ArenaCalendarState, type ChipPlacement, type HourSlot } from './ArenaCalendarState';
import {
  arenaAddDays, arenaDefaultDayStart, arenaFormatDate, arenaFormatHM, arenaLayoutDay, arenaNowMinutes, arenaParseHM, arenaPlaceEvents,
  arenaRangeTitle, arenaStartOfWeek, arenaTodayIso, arenaWeekdayOf,
} from './CalendarInternals';
import { arenaCalendarStyles } from './ArenaCalendar.variants';

const MINUTE = 60000;

@Component({
  selector: 'arena-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaCalendarState],
  host: { style: 'display: contents' },
  template: `
    <section #frame [class]="styles().root()" [attr.aria-label]="'Schedule, ' + title()">
      <div [class]="styles().toolbar()">
        <button type="button" [class]="styles().nav()" aria-label="Previous" (click)="step(-1)">
          <i class="ph-bold ph-caret-left" aria-hidden="true"></i>
        </button>
        <button type="button" [class]="styles().today()" (click)="goto(today())">Today</button>
        <button type="button" [class]="styles().nav()" aria-label="Next" (click)="step(1)">
          <i class="ph-bold ph-caret-right" aria-hidden="true"></i>
        </button>
        <h2 [class]="styles().heading()">{{ title() }}</h2>
        @if (actionsSlot()) {
          <div [class]="styles().actions()"><ng-content select="[actions]" /></div>
        }
      </div>

      <div [class]="styles().headStrip()" [style.gridTemplateColumns]="tracks()">
        @for (day of days(); track day) {
          @if (dayInteractive()) {
            <button type="button" [class]="dayHeadClass()" [attr.aria-label]="dayLabel(day)"
                    (click)="onDateClick(day)">
              <div [class]="styles().weekday()">{{ arenaWeekdayOf(day) }}</div>
              <div [class]="dayNumberClass(day)">{{ dayNumberOf(day) }}</div>
            </button>
          } @else {
            <div [class]="dayHeadClass()">
              <div [class]="styles().weekday()">{{ arenaWeekdayOf(day) }}</div>
              <div [class]="dayNumberClass(day)">{{ dayNumberOf(day) }}</div>
            </div>
          }
        }
      </div>

      <div [class]="styles().scroll()">
        <div [class]="styles().body()" [style.height.px]="bodyHeight()">
          <div [class]="styles().gutter()">
            @for (hour of hours(); track hour) {
              <div [class]="styles().hourLabel()" [style.top.px]="state.y(hour)">{{ hm(hour) }}</div>
            }
          </div>

          <div role="grid" [class]="styles().grid()" [style.gridTemplateColumns]="tracks()"
               [attr.aria-label]="'Schedule grid, ' + title()" (keydown)="onKeydown($event)">
            @for (hour of hours(); track hour) {
              <div aria-hidden="true" [class]="styles().rule()" [style.top.px]="state.y(hour)"></div>
            }

            @for (day of days(); track day; let di = $index) {
              <div role="row" [class]="columnClass(di)" [attr.aria-label]="dayLabel(day)"
                   [attr.aria-owns]="state.ownedIds(day)" (click)="onDateClick(day)">
                @for (slot of slots(); track slot.start; let si = $index) {
                  <div role="gridcell" [class]="styles().cell()" [attr.aria-label]="hm(slot.start)"
                       [attr.tabindex]="state.isStop(di, si) ? 0 : -1"
                       [style.top.px]="state.y(slot.start)"
                       [style.height.px]="state.y(slot.end) - state.y(slot.start)"
                       (focus)="moveTo(di, si)"></div>
                }
              </div>
            }

            <ng-content />

            @if (showNow()) {
              <div aria-hidden="true" [class]="styles().now()" [style.top.px]="state.y(nowMin())">
                <span [class]="styles().nowDot()"></span>
              </div>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ArenaCalendar {
  /** IANA zone name. Defaults to the reader's own resolved zone, which is right whenever the schedule belongs to the person looking at it. Pass it when the calendar has a zone of its own that differs (a Madrid timetable read from Tokyo), and when server-rendering, where the reader's zone is not knowable. */
  readonly timeZone = input<string>();
  /** ISO date the view opens on. Defaults to today in `timeZone`; pass and change it to drive the date yourself. */
  readonly anchorDate = input<string>();
  /** Omit to derive from the CONTAINER width: day below --bp-md, else week. */
  readonly view = input<ArenaCalendarView>();
  /** HH:MM the grid starts at. Defaults to the earliest visible event's hour, floored. */
  readonly dayStart = input<string>();
  /** HH:MM the grid ends at. */
  readonly dayEnd = input<string, string | undefined>('23:00', { transform: (value) => value ?? '23:00' });
  /** 0 = Sunday … 6 = Saturday. */
  readonly weekStartsOn = input(1, { transform: numberAttribute });
  /** Drop Sunday from the week unless an event falls on it. */
  readonly hideEmptyWeekend = input(true, { transform: booleanAttribute });
  /** Whether a day can be activated. A boolean rather than "is `dateClick` bound?", because Arena never derives what it draws from what a consumer listens for, and the same member `ArenaTableRow.interactive` and `ArenaCalendarEvent.interactive` are for the same reason; here the derived render was the day's own cursor, and the layers diverged on screen because of it. With it on, the day header is a <button> (the keyboard's route to the date, and the one element that already names it), and the column background takes a pointer cursor; with it off both are inert and the cursor says so. The default is false because a schedule someone only reads is the ordinary calendar, and a pointer cursor over days that answer nothing is the defect this member exists to end. */
  readonly dayInteractive = input(false, { transform: booleanAttribute });
  /** A day header or column background was activated; carries the ISO date. Never emitted unless `dayInteractive`. */
  readonly dateClick = output<string>();
  /** The anchor moved via prev/Today/next; carries the new ISO date. A date rather than a delta, because Today is not a delta. */
  readonly rangeChange = output<string>();

  protected readonly state = inject(ArenaCalendarState);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  private readonly measured = arenaContainerWidth(() => this.frame().nativeElement);
  private readonly medium = arenaReadBreakpoint('md');
  private readonly tick = signal(0);

  protected readonly actionsSlot = contentChild(ArenaActions);
  protected readonly chips = contentChildren(ArenaCalendarEvent);

  protected readonly zone = computed(
    () => this.timeZone() || Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  protected readonly anchor = linkedSignal(() => this.anchorDate() ?? arenaTodayIso(this.zone()));

  protected readonly activeView = computed<ArenaCalendarView>(() => {
    const chosen = this.view();
    if (chosen) return chosen;
    const width = this.measured();
    return width !== null && width < this.medium ? 'day' : 'week';
  });

  private readonly placed = computed(() => arenaPlaceEvents(
    this.chips().flatMap((chip) => {
      const times = this.state.timesOf(chip);
      return times === null ? [] : [{ ...times, chip }];
    }),
    this.zone(),
  ));

  protected readonly days = computed<readonly string[]>(() => {
    if (this.activeView() === 'day') return [this.anchor()];
    const first = arenaStartOfWeek(this.anchor(), this.weekStartsOn());
    const all = Array.from({ length: 7 }, (_, i) => arenaAddDays(first, i));
    if (!this.hideEmptyWeekend()) return all;
    return all.filter((d) => arenaWeekdayOf(d) !== 0 || this.placed().some((p) => p.dayIso === d));
  });

  private readonly visible = computed(
    () => this.placed().filter((p) => this.days().includes(p.dayIso)),
  );

  private readonly byDay = computed(
    () => this.days().map((d) => arenaLayoutDay(this.visible().filter((p) => p.dayIso === d))),
  );

  private readonly placements = computed<ReadonlyMap<object, ChipPlacement>>(() => {
    const out = new Map<object, ChipPlacement>();
    this.byDay().forEach((laid, dayIndex) => {
      for (const p of laid) {
        out.set(p.ev.chip, {
          dayIndex, dayIso: p.dayIso, startMin: p.startMin, endMin: p.endMin,
          col: p.col, cols: p.cols,
        });
      }
    });
    return out;
  });

  private readonly endMin = computed(() => arenaParseHM(this.dayEnd(), 23 * 60));

  private readonly firstMin = computed(() => {
    const declared = this.dayStart();
    const raw = declared !== undefined ? arenaParseHM(declared, 8 * 60) : arenaDefaultDayStart(this.visible());
    return Math.max(0, Math.min(raw, this.endMin() - 60));
  });

  protected readonly hours = computed(() => {
    const out: number[] = [];
    for (let m = Math.ceil(this.firstMin() / 60) * 60; m <= this.endMin(); m += 60) out.push(m);
    return out;
  });

  protected readonly slots = computed<readonly HourSlot[]>(() => {
    const hours = this.hours();
    return hours
      .map((start, i) => ({ start, end: i + 1 < hours.length ? hours[i + 1] : this.endMin() }))
      .filter((slot) => slot.end > slot.start);
  });

  protected readonly today = computed(() => arenaTodayIso(this.zone()));

  protected readonly nowMin = computed(() => {
    this.tick();
    return arenaNowMinutes(this.zone());
  });

  protected readonly showNow = computed(
    () => this.days().includes(this.today())
      && this.nowMin() >= this.firstMin() && this.nowMin() <= this.endMin(),
  );

  protected readonly title = computed(() => arenaRangeTitle(this.days()));

  protected readonly tracks = computed(
    () => `repeat(${this.days().length}, minmax(0, 1fr))`,
  );

  protected readonly bodyHeight = computed(() => this.state.y(this.endMin()));

  protected readonly styles = computed(() => arenaCalendarStyles());

  constructor() {
    this.state.zone = this.zone;
    this.state.days = this.days;
    this.state.slots = this.slots;
    this.state.startMin = this.firstMin;
    this.state.width = this.measured;
    this.state.placements = this.placements;
    this.state.focusCursorCell = () => this.focusCursorCell();

    afterNextRender(() => {
      const id = setInterval(() => this.tick.update((n) => n + 1), MINUTE);
      this.destroyRef.onDestroy(() => clearInterval(id));
    });

    afterRenderEffect(() => {
      this.state.clamped();
      const grid = this.host.nativeElement.querySelector('[role="grid"]');
      if (!grid) return;
      const active = grid.ownerDocument.activeElement;
      if (!active || !grid.contains(active)) return;
      if (active.getAttribute('role') !== 'gridcell') return;
      const stop = grid.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]');
      if (stop && stop !== active) stop.focus();
    });
  }

  protected hm(min: number): string {
    return arenaFormatHM(min);
  }

  protected arenaWeekdayOf(day: string): string {
    return arenaFormatDate(day, { weekday: 'short' });
  }

  protected dayNumberOf(day: string): string {
    return arenaFormatDate(day, { day: 'numeric' });
  }

  protected dayLabel(day: string): string {
    return arenaFormatDate(day, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  protected dayNumberClass(day: string): string {
    return arenaCalendarStyles({ today: day === this.today() }).dayNumber();
  }

  protected dayHeadClass(): string {
    return arenaCalendarStyles({ dayInteractive: this.dayInteractive() }).dayHead();
  }

  protected columnClass(index: number): string {
    return arenaCalendarStyles({
      firstColumn: index === 0, dayInteractive: this.dayInteractive(),
    }).column();
  }

  protected goto(iso: string): void {
    this.anchor.set(iso);
    this.rangeChange.emit(iso);
  }

  protected step(direction: number): void {
    this.goto(arenaAddDays(this.anchor(), direction * (this.activeView() === 'day' ? 1 : 7)));
  }

  protected onDateClick(day: string): void {
    if (this.dayInteractive()) this.dateClick.emit(day);
  }

  protected moveTo(day: number, hour: number): void {
    if (!this.state.isStop(day, hour)) this.state.cursor.set({ day, hour });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as Element | null;
    if (target?.getAttribute?.('role') !== 'gridcell') {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.focusCursorCell();
      }
      return;
    }

    const at = this.state.clamped();
    let { day, hour } = at;
    const lastDay = Math.max(this.days().length - 1, 0);
    const lastHour = Math.max(this.slots().length - 1, 0);

    if (event.key === 'ArrowLeft') day = Math.max(0, day - 1);
    else if (event.key === 'ArrowRight') day = Math.min(lastDay, day + 1);
    else if (event.key === 'ArrowUp') hour = Math.max(0, hour - 1);
    else if (event.key === 'ArrowDown') hour = Math.min(lastHour, hour + 1);
    else if (event.key === 'Home') hour = 0;
    else if (event.key === 'End') hour = lastHour;
    else if (event.key === 'Enter') {
      event.preventDefault();
      const slot = this.slots()[at.hour];
      if (slot) this.state.focusOverlapping(at.day, slot.start, slot.end);
      return;
    } else return;

    event.preventDefault();
    this.moveTo(day, hour);
  }

  private focusCursorCell(): void {
    const cell = this.host.nativeElement
      .querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]');
    if (cell) cell.focus();
  }
}
