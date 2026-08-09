import { Injectable, type Signal, computed, signal } from '@angular/core';
import { calendarGutterW, calendarHourH } from '../../../Tokens.generated';
import type { EventTimes } from './CalendarInternals';

export interface CalendarCursor {
  day: number;
  hour: number;
}

export interface HourSlot {
  start: number;
  end: number;
}

export interface ChipPlacement {
  dayIndex: number;
  dayIso: string;
  startMin: number;
  endMin: number;
  col: number;
  cols: number;
}

export interface ChipEntry {
  domId: string;
  focus: () => void;
  /** The chip's own times, as the CHIP published them. ArenaCalendar cannot read the three
   * required inputs off the instance: it places events while ONE projected sibling renders, and a
   * sibling further down the same `@for` has no binding yet. See `ProjectedInputs.ts`. */
  times: Signal<EventTimes | null>;
}

@Injectable()
export class ArenaCalendarState {
  zone: Signal<string> = signal('UTC');
  days: Signal<readonly string[]> = signal([]);
  slots: Signal<readonly HourSlot[]> = signal([]);
  startMin: Signal<number> = signal(0);
  width: Signal<number | null> = signal(null);
  placements: Signal<ReadonlyMap<object, ChipPlacement>> = signal(new Map());

  focusCursorCell: () => void = () => {};

  readonly cursor = signal<CalendarCursor>({ day: 0, hour: 0 });

  readonly clamped = computed<CalendarCursor>(() => {
    const days = Math.max(this.days().length - 1, 0);
    const hours = Math.max(this.slots().length - 1, 0);
    const at = this.cursor();
    return {
      day: Math.min(Math.max(at.day, 0), days),
      hour: Math.min(Math.max(at.hour, 0), hours),
    };
  });

  private readonly entries = signal<ReadonlyMap<object, ChipEntry>>(new Map());

  register(chip: object, entry: ChipEntry): void {
    this.entries.update((current) => new Map(current).set(chip, entry));
  }

  release(chip: object): void {
    this.entries.update((current) => {
      const next = new Map(current);
      next.delete(chip);
      return next;
    });
  }

  isStop(day: number, hour: number): boolean {
    const at = this.clamped();
    return at.day === day && at.hour === hour;
  }

  placementOf(chip: object): ChipPlacement | null {
    return this.placements().get(chip) ?? null;
  }

  timesOf(chip: object): EventTimes | null {
    return this.entries().get(chip)?.times() ?? null;
  }

  y(min: number): number {
    return ((min - this.startMin()) / 60) * calendarHourH;
  }

  slotWidth(cols: number): number | null {
    const measured = this.width();
    const columns = this.days().length;
    if (measured === null || columns === 0 || cols === 0) return null;
    return (measured - calendarGutterW) / columns / cols;
  }

  ownedIds(dayIso: string): string | null {
    const placements = this.placements();
    const ids: string[] = [];
    for (const [chip, entry] of this.entries()) {
      if (placements.get(chip)?.dayIso === dayIso) ids.push(entry.domId);
    }
    return ids.length ? ids.join(' ') : null;
  }

  focusOverlapping(dayIndex: number, from: number, to: number): boolean {
    const placements = this.placements();
    const hits: Array<{ at: ChipPlacement; entry: ChipEntry }> = [];
    for (const [chip, entry] of this.entries()) {
      const at = placements.get(chip);
      if (at && at.dayIndex === dayIndex && at.startMin < to && at.endMin > from) {
        hits.push({ at, entry });
      }
    }
    if (!hits.length) return false;
    hits.sort((a, b) => a.at.startMin - b.at.startMin || a.at.col - b.at.col);
    hits[0].entry.focus();
    return true;
  }
}
