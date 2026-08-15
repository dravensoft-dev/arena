import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaProgressBar.classes.generated.ts';

import type { ArenaControlSize, ArenaProgressShape, ArenaProgressTone } from '../../../Api.generated';

export interface ArenaProgressBarProps {

  /** What sits in the middle of a ring, in place of the percentage: a glyph, a mark, or the control the ring measures. A bar has no middle, so a bar draws nothing for it. The ring's own `progressbar` element is the drawing rather than the box around it, because that role's children are presentational and a control projected inside it would be drawn and never announced; here it is a sibling of the meter and keeps everything it came with. */
  children?: React.ReactNode;

  /** How far along, 0-100. Clamped and rounded. Ignored when `indeterminate`. */
  progressPercentage?: number;

  /** A wait with no percentage; the bar sweeps instead of filling. */
  indeterminate?: boolean;

  /** The bar's colour. */
  tone?: ArenaProgressTone;

  /** Names what is progressing. Drawn above the bar or under the ring, and it is the meter's accessible name. Required and guarded rather than defaulted: nothing can derive what is progressing, and a fallback of "Progress" satisfies roles.label mechanically while telling a screen-reader user only what the component is -- two of them on one page announce identically. */
  label: string;

  /** Draws the label beside the meter. False leaves the meter alone and keeps the accessible name, which is carried by aria-label on the progressbar element rather than by the text. For a bar in a table cell or a card row, where the row already names what is progressing and repeating it is noise. `label` stays required either way, on the reading it already carries: what a screen reader announces is not a decision about what is drawn. It is the same escape ArenaIconButton.showLabel offers, and it is here because the two components pose one question. */
  showLabel?: boolean;

  /** Shows the percentage: beside the label on a bar, and in the middle of a ring, which is the figure a meter in a tile is read by. Determinate only. Turn it off when `content` fills a ring's middle: the two share that space, and Arena never derives what it draws from what a consumer projected, because projected content is not inspectable in at least one layer. */
  showPercentage?: boolean;

  /** How heavy the meter is: the bar's thickness, and a ring's diameter with a band the same weight as the bar it replaces. */
  size?: ArenaControlSize;

  /** Whether the meter is drawn as a bar or as a ring. A ring puts the percentage inside its own track and the label under it, which is the arrangement a tile wants and the one a row cannot give: a bar is as wide as its row and reads along it, while a ring is as wide as it is tall and reads at a glance. It is a shape rather than a second component because everything else is the same question answered once: the percentage, the tone, the required name, the announcement and the sweep a wait draws. */
  shape?: ArenaProgressShape;
}


const progressStyles = arenaStyles(manifest);
const RING_CENTRE = 50;
const RING_RADIUS = 42;
const RING_SWEEP = 25;

export function ArenaProgressBar({ children, progressPercentage = 0, indeterminate = false, tone = 'accent', label, showLabel = true, showPercentage = true, size = 'md', shape = 'linear' }: ArenaProgressBarProps) {
  if (!label) throw new Error('ArenaProgressBar: `label` is required (it names what is progressing, and nothing can derive that)');
  const styles = progressStyles({ shape, tone, size });
  const pct = Math.max(0, Math.min(100, Math.round(progressPercentage)));
  const showValue = showPercentage && !indeterminate;
  const meter = {
    role: 'progressbar' as const,
    'aria-valuenow': indeterminate ? undefined : pct,
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-label': label,
  };
  const live = { 'aria-live': 'polite' as const };

  if (shape === 'radial') {
    return (
      <div className={styles.root()} data-arena-part={manifest.parts.root}>
        <div {...live} className={styles.ring()} data-arena-part={manifest.parts.ring}>
          <svg {...meter} className={styles.ringGeometry()} data-arena-part={manifest.parts.ringGeometry} viewBox="0 0 100 100">
            <circle className={styles.ringTrack()} data-arena-part={manifest.parts.ringTrack}
              cx={RING_CENTRE} cy={RING_CENTRE} r={RING_RADIUS} pathLength={100} />
            <circle className={indeterminate ? `${styles.ringFill()} ${styles.ringIndeterminate()}` : styles.ringFill()}
              data-arena-part={manifest.parts.ringFill}
              cx={RING_CENTRE} cy={RING_CENTRE} r={RING_RADIUS} pathLength={100}
              style={{ strokeDashoffset: indeterminate ? 100 - RING_SWEEP : 100 - pct }} />
          </svg>
          {!indeterminate && <span className={styles.announcement()} data-arena-part={manifest.parts.announcement}>{pct}%</span>}
          <span className={styles.ringContent()} data-arena-part={manifest.parts.ringContent}>{children}</span>
          {showValue && <span className={styles.value()} data-arena-part={manifest.parts.value}>{pct}%</span>}
        </div>
        {showLabel && <span className={styles.label()} data-arena-part={manifest.parts.label}>{label}</span>}
      </div>
    );
  }

  return (
    <div className={styles.root()} data-arena-part={manifest.parts.root}>
      {(showLabel || showValue) && (
        <div className={styles.head()} data-arena-part={manifest.parts.head}>
          {showLabel && <span className={styles.label()} data-arena-part={manifest.parts.label}>{label}</span>}
          {showValue && <span className={styles.value()} data-arena-part={manifest.parts.value}>{pct}%</span>}
        </div>
      )}
      <div {...meter} {...live}
        className={indeterminate ? `${styles.track()} ${styles.indeterminate()}` : styles.track()}
        data-arena-part={manifest.parts.track}>
        {!indeterminate && (
          <>
            <span className={styles.announcement()} data-arena-part={manifest.parts.announcement}>{pct}%</span>
            <span className={styles.fill()} data-arena-part={manifest.parts.fill} style={{ width: `${pct}%` }} />
          </>
        )}
      </div>
    </div>
  );
}
