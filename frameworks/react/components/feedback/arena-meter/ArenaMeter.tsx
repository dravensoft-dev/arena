import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaMeter.classes.generated.ts';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import type { ArenaMeterClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import {
  arenaMeterRange, arenaMeterReadout, arenaMeterShare, arenaMeterStanding, arenaMeterValue, arenaMeterValueText, arenaMeterWord,
} from './MeterStanding.ts';

export interface ArenaMeterProps {
  className?: ArenaMeterClass;


  /** Names what is measured. Drawn above the track and the meter's accessible name. Required, and guarded at runtime after trimming: nothing can derive what is measured, and a fallback of Meter tells a reader only what the component is. */
  label: string;

  /** The measurement, in the range's own unit. The drawing and aria-valuenow clamp it into the range, and a value that is not a finite number reads as min. The readout shows the number as passed. */
  value: number;

  /** The lower bound of the range. */
  min?: number;

  /** The upper bound of the range. A max below min reads as min, so the range is never inverted. */
  max?: number;

  /** The top of the low region, clamped into the range. Absent, it is min. A value equal to it is in the region above it. */
  low?: number;

  /** The bottom of the high region, clamped into the range and never below low. Absent, it is max. A value equal to it is in the high region, except at max, where no high region opens and the value stays in the middle. */
  high?: number;

  /** Where the best reading sits, which decides which region is good. Absent, it is the midpoint. With none of low, high and optimum given, no standing is derived and the fill paints the accent. */
  optimum?: number;

  /** Draws the label above the track. False keeps the accessible name on the meter and hides the drawn label, for a cell whose row already says what is measured. */
  showLabel?: boolean;

  /** The reading as a person says it, such as 62 of 100 GB. The drawn readout shows this text, and aria-valuetext starts with it. Absent, the readout is the value written as a plain number. */
  valueText?: string;
}

const meterStyles = arenaStyles(manifest);

export function ArenaMeter({ className, label, value, min = 0, max = 100, low, high, optimum, showLabel = true, valueText }: ArenaMeterProps) {
  if (!label?.trim()) throw new Error('ArenaMeter: `label` is required (it names what is measured, and nothing can derive that)');
  const locale = useArenaLocale();
  const range = arenaMeterRange(min, max, low, high, optimum);
  const standing = arenaMeterStanding(value, range);
  const word = arenaMeterWord(standing, locale);
  const readout = arenaMeterReadout(value, range, valueText);
  const styles = meterStyles({ standing });
  return (
    <div className={arenaClassName('ArenaMeter', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <div className={styles.head()} data-arena-part={manifest.parts.head} {...styles.$data.head()}>
        {showLabel && <span className={styles.label()} data-arena-part={manifest.parts.label} {...styles.$data.label()}>{label}</span>}
        <span className={styles.value()} data-arena-part={manifest.parts.value} {...styles.$data.value()}>{readout}</span>
        {word !== undefined && <span className={styles.standing()} data-arena-part={manifest.parts.standing} {...styles.$data.standing()}>{word}</span>}
      </div>
      <div role="meter" aria-label={label} aria-valuenow={arenaMeterValue(value, range)} aria-valuemin={range.min} aria-valuemax={range.max}
        aria-valuetext={arenaMeterValueText(readout, word)}
        className={styles.track()} data-arena-part={manifest.parts.track} {...styles.$data.track()}>
        <span className={styles.fill()} data-arena-part={manifest.parts.fill} {...styles.$data.fill()} style={{ width: `${arenaMeterShare(value, range)}%` }} />
      </div>
    </div>
  );
}
