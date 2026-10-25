import React, { useId, useRef, useState } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaSlider.classes.generated.ts';

import type { ArenaNumberFormat, ArenaSliderOrientation } from '../../../Api.generated';
import type { ArenaSliderClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import { arenaValueWriter } from '../../../DataVisuals.ts';
import { arenaPhrase } from '../../../Phrase.ts';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import {
  arenaFractionAt, arenaNearestThumb, arenaSliderBounds, arenaSliderFraction, arenaSliderKey, arenaSliderMove,
  arenaSliderPair, arenaSnapToStep, arenaValueAtFraction,
} from '../NumberRules.ts';

export interface ArenaSliderProps {
  className?: ArenaSliderClass;

  /** Names what is being set, such as "Volume", and names each thumb. Required, and guarded at runtime: a blank one throws, because nothing can derive what a range measures. */
  label: string;

  /** Draws the label above the track. False drops the drawn text and keeps the accessible name. */
  showLabel?: boolean;

  /** A line of help under the track, and each thumb's description. */
  hint?: string;

  /** Draws two thumbs that choose a span: `value` is its start and `valueEnd` its end. Each thumb stops against the other, and each is named by the label and its own word. Without it, `valueEnd` and its two events are ignored, and a bound `valueEnd` is warned once. */
  range?: boolean;

  /** The number the thumb stands at, or the start of the span in range mode. Snapped to `step` and held inside the bounds. Absent, the slider holds its own number, starting at `min`; present, it controls the slider. */
  value?: number;

  /** The end of the span in range mode. Absent, the slider holds its own end, starting at the highest step inside `max`. A `value` above it is drawn at it, and nothing is reported. */
  valueEnd?: number;

  /** The lower bound. */
  min?: number;

  /** The upper bound. A range whose `max` is not above `min` reads as 0 to 100. */
  max?: number;

  /** The increment every value snaps to, counted from `min`; Page Up and Page Down move ten of it. When it does not divide the range, the highest step inside `max` is the top. A step that is not a positive number reads as 1. */
  step?: number;

  /** Which way the track runs. A vertical slider fills the height its container gives it, at least four control heights, and announces that it stands vertically. */
  orientation?: ArenaSliderOrientation;

  /** How the readout and each thumb's reading write the number. With no `locale` it follows `ArenaLocale.locale`; absent, the number is written as it is. */
  valueFormat?: ArenaNumberFormat;

  /** Static text drawn and spoken before the number, such as `$`. */
  valuePrefix?: string;

  /** Static text drawn and spoken after the number, such as `%`. */
  valueSuffix?: string;

  /** Whether the readout is drawn beside the label. */
  showValue?: boolean;

  /** Takes each thumb out of the Tab sequence, ignores the pointer and dims the slider. */
  disabled?: boolean;

  /** Submitted with the form through a hidden input carrying the number. In range mode two hidden inputs share it, the start first, so a form posts a repeated field. */
  name?: string;

  /** The thumb moved, or the start thumb in range mode; carries its number on every step of a drag and every key. Never fires for a move that leaves the number where it was. */
  onValueChange?: (value: number) => void;

  /** The move settled: the pointer was released, or a key stepped the thumb. Carries the number, and fires only when it differs from where the move began. For an effect too costly to run on every step of a drag. */
  onCommit?: (value: number) => void;

  /** The end thumb moved, in range mode; carries its number as `onValueChange` does. */
  onValueEndChange?: (value: number) => void;

  /** The end thumb's move settled, in range mode; carries its number as `onCommit` does. */
  onCommitEnd?: (value: number) => void;
}

const arenaSliderStyles = arenaStyles(manifest);

type Thumb = 'start' | 'end';

const mirroredAt = (element: Element) => {
  const dir = element.closest('[dir]')?.getAttribute('dir');
  return dir ? dir.toLowerCase() === 'rtl' : element.ownerDocument.defaultView?.getComputedStyle(element).direction === 'rtl';
};

export function ArenaSlider({
  className, label, showLabel = true, hint, range = false, value, valueEnd, min = 0, max = 100, step = 1,
  orientation = 'horizontal', valueFormat, valuePrefix, valueSuffix, showValue = true, disabled = false, name,
  onValueChange, onCommit, onValueEndChange, onCommitEnd,
}: ArenaSliderProps) {
  if (!label?.trim()) throw new Error('ArenaSlider: `label` is required, and names what the range measures');
  if (!range && valueEnd !== undefined) {
    arenaWarnOnce('ArenaSlider: `valueEnd` is set on a slider without `range`, so it is ignored. Set `range` for two thumbs, or drop `valueEnd`.');
  }
  const locale = useArenaLocale();
  const base = useId();
  const ids = { label: `${base}-label`, start: `${base}-start`, end: `${base}-end`, hint: `${base}-hint` };
  const bounds = arenaSliderBounds(min, max, step);
  const vertical = orientation === 'vertical';

  const [heldStart, setHeldStart] = useState<number | undefined>(value);
  const [heldEnd, setHeldEnd] = useState<number | undefined>(valueEnd);
  const [given, setGiven] = useState({ value, valueEnd });
  if (given.value !== value || given.valueEnd !== valueEnd) {
    setGiven({ value, valueEnd });
    if (given.value !== value) setHeldStart(value);
    if (given.valueEnd !== valueEnd) setHeldEnd(valueEnd);
  }
  const startAt = value ?? heldStart ?? bounds.min;
  const endAt = valueEnd ?? heldEnd ?? bounds.last;
  const pair = range ? arenaSliderPair(startAt, endAt, bounds) : { start: arenaSnapToStep(startAt, bounds), end: bounds.last };
  const live = useRef(pair);
  live.current = pair;

  const track = useRef<HTMLDivElement>(null);
  const thumbs = { start: useRef<HTMLSpanElement>(null), end: useRef<HTMLSpanElement>(null) };
  const drag = useRef<{ thumb: Thumb | null; from: number; pointer: number } | null>(null);

  const format = valueFormat ? { ...valueFormat, locale: valueFormat.locale ?? locale.locale } : undefined;
  const write = arenaValueWriter({ prefix: valuePrefix, suffix: valueSuffix, format });

  const limits = (thumb: Thumb, now: { start: number; end: number }) => (!range
    ? { lower: bounds.min, upper: bounds.last }
    : thumb === 'start' ? { lower: bounds.min, upper: now.end } : { lower: now.start, upper: bounds.last });

  const move = (thumb: Thumb, next: number) => {
    const now = live.current;
    const { lower, upper } = limits(thumb, now);
    const kept = Math.min(Math.max(next, lower), upper);
    if (kept === now[thumb]) return false;
    live.current = { ...now, [thumb]: kept };
    if (thumb === 'start') { setHeldStart(kept); onValueChange?.(kept); }
    else { setHeldEnd(kept); onValueEndChange?.(kept); }
    return true;
  };

  const settle = (thumb: Thumb, from: number) => {
    const now = live.current[thumb];
    if (now === from) return;
    if (thumb === 'start') onCommit?.(now);
    else onCommitEnd?.(now);
  };

  const valueAt = (event: React.PointerEvent) => {
    const box = track.current!.getBoundingClientRect();
    const size = thumbs.start.current?.getBoundingClientRect()[vertical ? 'height' : 'width'] ?? 0;
    const fraction = vertical
      ? arenaFractionAt(event.clientY, box.top + size / 2, box.height - size, true)
      : arenaFractionAt(event.clientX, box.left + size / 2, box.width - size, mirroredAt(track.current!));
    return arenaValueAtFraction(fraction, bounds);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    const pressed = event.target as Node;
    const at = valueAt(event);
    const now = live.current;
    const meeting = range && now.start === now.end
      && (thumbs.start.current?.contains(pressed) || thumbs.end.current?.contains(pressed) || at === now.start);
    const held: Thumb | null = meeting ? null : !range ? 'start' : thumbs.start.current?.contains(pressed) ? 'start'
      : thumbs.end.current?.contains(pressed) ? 'end' : arenaNearestThumb(at, now);
    drag.current = { thumb: held, from: now[held ?? 'end'], pointer: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    thumbs[held ?? 'end'].current?.focus();
    if (held && !thumbs[held].current?.contains(pressed)) move(held, at);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const held = drag.current;
    if (!held || held.pointer !== event.pointerId) return;
    const at = valueAt(event);
    if (held.thumb === null) {
      const shared = live.current.start;
      if (at === shared) return;
      held.thumb = at < shared ? 'start' : 'end';
      thumbs[held.thumb].current?.focus();
    }
    move(held.thumb, at);
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const held = drag.current;
    if (!held || held.pointer !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (held.thumb) settle(held.thumb, held.from);
  };

  const onKeyDown = (thumb: Thumb) => (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) return;
    const key = arenaSliderKey(event.key, !vertical && mirroredAt(event.currentTarget));
    if (key === null) return;
    event.preventDefault();
    const now = live.current;
    const { lower, upper } = limits(thumb, now);
    const next = key === 'home' ? lower : key === 'end' ? upper : arenaSliderMove(now[thumb], key, bounds, lower, upper);
    const from = now[thumb];
    if (move(thumb, next)) settle(thumb, from);
  };

  const styles = arenaSliderStyles({ orientation, range, disabled });
  const readout = range ? arenaPhrase(locale.sliderRange, { start: write(pair.start), end: write(pair.end) }) : write(pair.start);
  const fill = { '--arena-slider-from': range ? arenaSliderFraction(pair.start, bounds) : 0, '--arena-slider-to': arenaSliderFraction(range ? pair.end : pair.start, bounds) } as React.CSSProperties;

  const thumb = (which: Thumb) => {
    const now = pair[which];
    const { lower, upper } = limits(which, pair);
    const at = { '--arena-slider-at': arenaSliderFraction(now, bounds) } as React.CSSProperties;
    return (
      <span ref={thumbs[which]} role="slider" tabIndex={disabled ? -1 : 0}
        aria-labelledby={range ? `${ids.label} ${ids[which]}` : ids.label}
        aria-describedby={hint ? ids.hint : undefined}
        aria-valuenow={now} aria-valuemin={lower} aria-valuemax={upper} aria-valuetext={write(now)}
        aria-orientation={vertical ? 'vertical' : undefined} aria-disabled={disabled || undefined}
        className={styles.thumb()} data-arena-part={manifest.parts.thumb} {...styles.$data.thumb()} style={at}
        onKeyDown={onKeyDown(which)} />
    );
  };

  return (
    <div className={arenaClassName('ArenaSlider', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      {(showLabel || showValue) && (
        <div className={styles.head()} data-arena-part={manifest.parts.head} {...styles.$data.head()}>
          {showLabel && <span id={ids.label} className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>{label}</span>}
          {showValue && <span className={styles.value()} data-arena-part={manifest.parts.value} {...styles.$data.value()}>{readout}</span>}
        </div>
      )}
      {!showLabel && <span id={ids.label} className={styles.thumbLabel()} data-arena-part={manifest.parts.thumbLabel} {...styles.$data.thumbLabel()}>{label}</span>}
      {range && <span id={ids.start} className={styles.thumbLabel()} data-arena-part={manifest.parts.thumbLabel} {...styles.$data.thumbLabel()}>{locale.sliderStart}</span>}
      {range && <span id={ids.end} className={styles.thumbLabel()} data-arena-part={manifest.parts.thumbLabel} {...styles.$data.thumbLabel()}>{locale.sliderEnd}</span>}
      <div ref={track} className={styles.track()} data-arena-part={manifest.parts.track} {...styles.$data.track()} style={fill}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
        <span className={styles.rail()} data-arena-part={manifest.parts.rail} {...styles.$data.rail()} />
        <span className={styles.fill()} data-arena-part={manifest.parts.fill} {...styles.$data.fill()} />
        {thumb('start')}
        {range && thumb('end')}
      </div>
      {name && <input type="hidden" name={name} value={String(pair.start)} disabled={disabled} />}
      {name && range && <input type="hidden" name={name} value={String(pair.end)} disabled={disabled} />}
      {hint && <span id={ids.hint} className={styles.hint()} data-arena-part={manifest.parts.hint} {...styles.$data.hint()}>{hint}</span>}
    </div>
  );
}
