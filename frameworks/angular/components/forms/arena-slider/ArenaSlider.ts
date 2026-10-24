import {
  ChangeDetectionStrategy, Component, ElementRef, booleanAttribute, computed, effect, inject, input, linkedSignal,
  output, viewChild,
} from '@angular/core';
import type { ArenaNumberFormat, ArenaSliderOrientation } from '../../../Api.generated';
import { arenaSliderStyles } from './ArenaSlider.variants';
import manifest from './ArenaSlider.classes.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaControlBinding, arenaWarnDoubleBinding } from '../../../ControlBinding';
import { ArenaIdGenerator } from '../../../ArenaIds';
import { ArenaSlotAttributes } from '../../../SlotData';
import { arenaValueWriter } from '../../../DataVisuals';
import { arenaPhrase } from '../../../Phrase';
import { arenaWarnOnce } from '../../../WarnOnce';
import {
  arenaFractionAt, arenaNearestThumb, arenaSliderBounds, arenaSliderFraction, arenaSliderKey, arenaSliderMove,
  arenaSliderPair, arenaSnapToStep, arenaValueAtFraction,
} from '../NumberRules';

type Thumb = 'start' | 'end';
type Pair = { start: number; end: number };
type Drag = { thumb: Thumb | null; from: number; pointer: number };
type Limits = { lower: number; upper: number };

const mirroredAt = (element: Element) => {
  const dir = element.closest('[dir]')?.getAttribute('dir');
  return dir ? dir.toLowerCase() === 'rtl' : element.ownerDocument.defaultView?.getComputedStyle(element).direction === 'rtl';
};

const bindingPair = (value: unknown): { start?: number; end?: number } => {
  if (Array.isArray(value)) return { start: value[0] ?? undefined, end: value[1] ?? undefined };
  return { start: typeof value === 'number' && !Number.isNaN(value) ? value : undefined };
};

@Component({
  selector: 'arena-slider',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaControlBinding],
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-orientation]': "styles().$data.root()['data-arena-orientation'] ?? null",
    '[attr.data-arena-disabled]': "styles().$data.root()['data-arena-disabled'] ?? null",
    '[attr.data-arena-part]': 'parts.root',
    '[attr.name]': 'null',
  },
  template: `
    @if (showLabel() || showValue()) {
      <div [class]="styles().head()" [attr.data-arena-part]="parts.head">
        @if (showLabel()) {
          <span [id]="ids.label" [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ label() }}</span>
        }
        @if (showValue()) {
          <span [class]="styles().value()" [attr.data-arena-part]="parts.value">{{ readout() }}</span>
        }
      </div>
    }
    @if (!showLabel()) {
      <span [id]="ids.label" [class]="styles().thumbLabel()" [attr.data-arena-part]="parts.thumbLabel">{{ label() }}</span>
    }
    @if (range()) {
      <span [id]="ids.start" [class]="styles().thumbLabel()" [attr.data-arena-part]="parts.thumbLabel">{{ locale.sliderStart }}</span>
      <span [id]="ids.end" [class]="styles().thumbLabel()" [attr.data-arena-part]="parts.thumbLabel">{{ locale.sliderEnd }}</span>
    }
    <div #track [class]="styles().track()" [arenaSlotData]="styles().$data.track()" [attr.data-arena-part]="parts.track"
         [style.--arena-slider-from]="fromFraction()" [style.--arena-slider-to]="toFraction()"
         (pointerdown)="onPointerDown($event)" (pointermove)="onPointerMove($event)"
         (pointerup)="onPointerEnd($event)" (pointercancel)="onPointerEnd($event)">
      <span [class]="styles().rail()" [arenaSlotData]="styles().$data.rail()" [attr.data-arena-part]="parts.rail"></span>
      <span [class]="styles().fill()" [arenaSlotData]="styles().$data.fill()" [attr.data-arena-part]="parts.fill"></span>
      <span #startThumb role="slider" [attr.tabindex]="off() ? -1 : 0" [attr.aria-labelledby]="namedBy('start')"
            [attr.aria-describedby]="hint() ? ids.hint : null" [attr.aria-valuenow]="pair().start"
            [attr.aria-valuemin]="limits('start').lower" [attr.aria-valuemax]="limits('start').upper"
            [attr.aria-valuetext]="write()(pair().start)" [attr.aria-orientation]="vertical() ? 'vertical' : null"
            [attr.aria-disabled]="off() ? 'true' : null" [style.--arena-slider-at]="fraction(pair().start)"
            [class]="styles().thumb()" [arenaSlotData]="styles().$data.thumb()" [attr.data-arena-part]="parts.thumb"
            (keydown)="onKeyDown('start', $event)"></span>
      @if (range()) {
        <span #endThumb role="slider" [attr.tabindex]="off() ? -1 : 0" [attr.aria-labelledby]="namedBy('end')"
              [attr.aria-describedby]="hint() ? ids.hint : null" [attr.aria-valuenow]="pair().end"
              [attr.aria-valuemin]="limits('end').lower" [attr.aria-valuemax]="limits('end').upper"
              [attr.aria-valuetext]="write()(pair().end)" [attr.aria-orientation]="vertical() ? 'vertical' : null"
              [attr.aria-disabled]="off() ? 'true' : null" [style.--arena-slider-at]="fraction(pair().end)"
              [class]="styles().thumb()" [arenaSlotData]="styles().$data.thumb()" [attr.data-arena-part]="parts.thumb"
              (keydown)="onKeyDown('end', $event)"></span>
      }
    </div>
    @if (name(); as field) {
      <input type="hidden" [attr.name]="field" [value]="pair().start" [disabled]="off()" />
      @if (range()) {
        <input type="hidden" [attr.name]="field" [value]="pair().end" [disabled]="off()" />
      }
    }
    @if (hint(); as text) {
      <span [id]="ids.hint" [class]="styles().hint()" [attr.data-arena-part]="parts.hint">{{ text }}</span>
    }
  `,
})
export class ArenaSlider {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);
  private readonly binding = inject(ArenaControlBinding);
  private readonly base = inject(ArenaIdGenerator).next('arena-slider');
  protected readonly ids = { label: `${this.base}-label`, start: `${this.base}-start`, end: `${this.base}-end`, hint: `${this.base}-hint` };
  protected readonly off = computed(() => this.disabled() || this.binding.disabled());
  private readonly warned = effect(() => {
    if (this.binding.bound() && (this.value() !== undefined || this.valueEnd() !== undefined)) {
      arenaWarnDoubleBinding('ArenaSlider', this.value() !== undefined ? 'value' : 'valueEnd');
    }
    if (!this.range() && this.valueEnd() !== undefined) {
      arenaWarnOnce('ArenaSlider: `valueEnd` is set on a slider without `range`, so it is ignored. Set `range` for two thumbs, or drop `valueEnd`.');
    }
  });

  /** Names what is being set, such as "Volume", and names each thumb. Required, and guarded at runtime: a blank one throws, because nothing can derive what a range measures. */
  readonly label = input.required<string>();
  /** Draws the label above the track. False drops the drawn text and keeps the accessible name. */
  readonly showLabel = input(true, { transform: booleanAttribute });
  /** A line of help under the track, and each thumb's description. */
  readonly hint = input<string>();
  /** Draws two thumbs that choose a span: `value` is its start and `valueEnd` its end. Each thumb stops against the other, and each is named by the label and its own word. Without it, `valueEnd` and its two events are ignored, and a bound `valueEnd` is warned once. */
  readonly range = input(false, { transform: booleanAttribute });
  /** The number the thumb stands at, or the start of the span in range mode. Snapped to `step` and held inside the bounds. Absent, the slider holds its own number, starting at `min`; present, it controls the slider. */
  readonly value = input<number>();
  /** The end of the span in range mode. Absent, the slider holds its own end, starting at the highest step inside `max`. A `value` above it is drawn at it, and nothing is reported. */
  readonly valueEnd = input<number>();
  /** The lower bound. */
  readonly min = input<number, number | undefined>(0, { transform: (value) => value ?? 0 });
  /** The upper bound. A range whose `max` is not above `min` reads as 0 to 100. */
  readonly max = input<number, number | undefined>(100, { transform: (value) => value ?? 100 });
  /** The increment every value snaps to, counted from `min`; Page Up and Page Down move ten of it. When it does not divide the range, the highest step inside `max` is the top. A step that is not a positive number reads as 1. */
  readonly step = input<number, number | undefined>(1, { transform: (value) => value ?? 1 });
  /** Which way the track runs. A vertical slider fills the height its container gives it, at least four control heights, and announces that it stands vertically. */
  readonly orientation = input<ArenaSliderOrientation, ArenaSliderOrientation | undefined>(
    'horizontal',
    { transform: (value) => value ?? 'horizontal' },
  );
  /** How the readout and each thumb's reading write the number. With no `locale` it follows `ArenaLocale.locale`; absent, the number is written as it is. */
  readonly valueFormat = input<ArenaNumberFormat>();
  /** Static text drawn and spoken before the number, such as `$`. */
  readonly valuePrefix = input<string>();
  /** Static text drawn and spoken after the number, such as `%`. */
  readonly valueSuffix = input<string>();
  /** Whether the readout is drawn beside the label. */
  readonly showValue = input(true, { transform: booleanAttribute });
  /** Takes each thumb out of the Tab sequence, ignores the pointer and dims the slider. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Submitted with the form through a hidden input carrying the number. In range mode two hidden inputs share it, the start first, so a form posts a repeated field. */
  readonly name = input<string>();
  /** The thumb moved, or the start thumb in range mode; carries its number on every step of a drag and every key. Never fires for a move that leaves the number where it was. */
  readonly valueChange = output<number>();
  /** The move settled: the pointer was released, or a key stepped the thumb. Carries the number, and fires only when it differs from where the move began. For an effect too costly to run on every step of a drag. */
  readonly commit = output<number>();
  /** The end thumb moved, in range mode; carries its number as `valueChange` does. */
  readonly valueEndChange = output<number>();
  /** The end thumb's move settled, in range mode; carries its number as `commit` does. */
  readonly commitEnd = output<number>();

  private readonly heldStart = linkedSignal<number | undefined>(() => this.value());
  private readonly heldEnd = linkedSignal<number | undefined>(() => this.valueEnd());
  private readonly bounds = computed(() => {
    if (this.label().trim() === '') throw new Error('ArenaSlider: `label` is required, and names what the range measures');
    return arenaSliderBounds(this.min(), this.max(), this.step());
  });
  protected readonly vertical = computed(() => this.orientation() === 'vertical');
  protected readonly pair = computed<Pair>(() => {
    const bounds = this.bounds();
    const formed = this.binding.bound() ? bindingPair(this.binding.value()) : undefined;
    const start = formed ? formed.start : this.heldStart();
    const end = formed ? formed.end : this.heldEnd();
    return this.range()
      ? arenaSliderPair(start ?? bounds.min, end ?? bounds.last, bounds)
      : { start: arenaSnapToStep(start ?? bounds.min, bounds), end: bounds.last };
  });
  protected readonly write = computed(() => {
    const format = this.valueFormat();
    return arenaValueWriter({
      prefix: this.valuePrefix(), suffix: this.valueSuffix(),
      format: format ? { ...format, locale: format.locale ?? this.locale.locale } : undefined,
    });
  });
  protected readonly readout = computed(() => {
    const pair = this.pair();
    const write = this.write();
    return this.range() ? arenaPhrase(this.locale.sliderRange, { start: write(pair.start), end: write(pair.end) }) : write(pair.start);
  });
  protected readonly fromFraction = computed(() => (this.range() ? arenaSliderFraction(this.pair().start, this.bounds()) : 0));
  protected readonly toFraction = computed(() => arenaSliderFraction(this.range() ? this.pair().end : this.pair().start, this.bounds()));
  protected readonly styles = computed(() => arenaSliderStyles({
    orientation: this.orientation(),
    range: this.range(),
    disabled: this.off(),
  }));

  private readonly track = viewChild<ElementRef<HTMLDivElement>>('track');
  private readonly startThumb = viewChild<ElementRef<HTMLSpanElement>>('startThumb');
  private readonly endThumb = viewChild<ElementRef<HTMLSpanElement>>('endThumb');
  private drag: Drag | null = null;
  private live: Pair | null = null;

  protected fraction(value: number): number {
    return arenaSliderFraction(value, this.bounds());
  }

  protected namedBy(thumb: Thumb): string {
    return this.range() ? `${this.ids.label} ${this.ids[thumb]}` : this.ids.label;
  }

  protected limits(thumb: Thumb, now: Pair = this.pair()): Limits {
    const bounds = this.bounds();
    if (!this.range()) return { lower: bounds.min, upper: bounds.last };
    return thumb === 'start' ? { lower: bounds.min, upper: now.end } : { lower: now.start, upper: bounds.last };
  }

  private thumbOf(thumb: Thumb): HTMLSpanElement | undefined {
    return (thumb === 'start' ? this.startThumb() : this.endThumb())?.nativeElement;
  }

  private move(thumb: Thumb, next: number): boolean {
    const now = this.live ?? this.pair();
    const { lower, upper } = this.limits(thumb, now);
    const kept = Math.min(Math.max(next, lower), upper);
    if (kept === now[thumb]) return false;
    this.live = { ...now, [thumb]: kept };
    if (thumb === 'start') this.heldStart.set(kept);
    else this.heldEnd.set(kept);
    if (this.binding.bound()) {
      const reported = this.range() ? [this.live.start, this.live.end] : kept;
      this.binding.value.set(reported);
      this.binding.onChange(reported);
    }
    if (thumb === 'start') this.valueChange.emit(kept);
    else this.valueEndChange.emit(kept);
    return true;
  }

  private settle(thumb: Thumb, from: number): void {
    const now = (this.live ?? this.pair())[thumb];
    this.live = null;
    if (now === from) return;
    if (thumb === 'start') this.commit.emit(now);
    else this.commitEnd.emit(now);
  }

  private valueAt(event: PointerEvent): number {
    const track = this.track()!.nativeElement;
    const box = track.getBoundingClientRect();
    const vertical = this.vertical();
    const size = this.startThumb()?.nativeElement.getBoundingClientRect()[vertical ? 'height' : 'width'] ?? 0;
    const fraction = vertical
      ? arenaFractionAt(event.clientY, box.top + size / 2, box.height - size, true)
      : arenaFractionAt(event.clientX, box.left + size / 2, box.width - size, mirroredAt(track));
    return arenaValueAtFraction(fraction, this.bounds());
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.off() || event.button !== 0) return;
    event.preventDefault();
    const pressed = event.target as Node;
    const at = this.valueAt(event);
    const now = this.pair();
    const meeting = this.range() && now.start === now.end
      && (this.thumbOf('start')?.contains(pressed) || this.thumbOf('end')?.contains(pressed) || at === now.start);
    const held: Thumb | null = meeting ? null : !this.range() ? 'start' : this.thumbOf('start')?.contains(pressed) ? 'start'
      : this.thumbOf('end')?.contains(pressed) ? 'end' : arenaNearestThumb(at, now);
    this.live = now;
    this.drag = { thumb: held, from: now[held ?? 'end'], pointer: event.pointerId };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.thumbOf(held ?? 'end')?.focus();
    if (held && !this.thumbOf(held)?.contains(pressed)) this.move(held, at);
  }

  protected onPointerMove(event: PointerEvent): void {
    const held = this.drag;
    if (!held || held.pointer !== event.pointerId) return;
    const at = this.valueAt(event);
    if (held.thumb === null) {
      const shared = (this.live ?? this.pair()).start;
      if (at === shared) return;
      held.thumb = at < shared ? 'start' : 'end';
      this.thumbOf(held.thumb)?.focus();
    }
    this.move(held.thumb, at);
  }

  protected onPointerEnd(event: PointerEvent): void {
    const held = this.drag;
    if (!held || held.pointer !== event.pointerId) return;
    this.drag = null;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    if (held.thumb) this.settle(held.thumb, held.from);
    else this.live = null;
  }

  protected onKeyDown(thumb: Thumb, event: KeyboardEvent): void {
    if (this.off()) return;
    const key = arenaSliderKey(event.key, !this.vertical() && mirroredAt(event.currentTarget as Element));
    if (key === null) return;
    event.preventDefault();
    const now = this.pair();
    this.live = now;
    const { lower, upper } = this.limits(thumb, now);
    const next = key === 'home' ? lower : key === 'end' ? upper : arenaSliderMove(now[thumb], key, this.bounds(), lower, upper);
    if (this.move(thumb, next)) this.settle(thumb, now[thumb]);
    else this.live = null;
  }
}
