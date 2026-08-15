import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaProgressBar.classes.generated.ts';

import type { ArenaControlSize, ArenaProgressTone } from '../../../Api.generated';

export interface ArenaProgressBarProps {

  /** How far along, 0-100. Clamped and rounded. Ignored when `indeterminate`. */
  progressPercentage?: number;

  /** A wait with no percentage; the bar sweeps instead of filling. */
  indeterminate?: boolean;

  /** The bar's colour. */
  tone?: ArenaProgressTone;

  /** Names what is progressing. Drawn above the bar, and it is the bar's accessible name. Required and guarded rather than defaulted: nothing can derive what is progressing, and a fallback of "Progress" satisfies roles.label mechanically while telling a screen-reader user only what the component is -- two of them on one page announce identically. */
  label: string;

  /** Shows the percentage beside the label. Determinate only. */
  showPercentage?: boolean;

  /** The bar's thickness. */
  size?: ArenaControlSize;
}


const progressStyles = arenaStyles(manifest);

export function ArenaProgressBar({ progressPercentage = 0, indeterminate = false, tone = 'accent', label, showPercentage = true, size = 'md' }: ArenaProgressBarProps) {
  if (!label) throw new Error('ArenaProgressBar: `label` is required (it names what is progressing, and nothing can derive that)');
  const styles = progressStyles({ tone, size });
  const pct = Math.max(0, Math.min(100, Math.round(progressPercentage)));
  return (
    <div className={styles.root()} data-arena-part={manifest.parts.root}>
      <div className={styles.head()} data-arena-part={manifest.parts.head}>
        <span className={styles.label()} data-arena-part={manifest.parts.label}>{label}</span>
        {showPercentage && !indeterminate && <span className={styles.value()} data-arena-part={manifest.parts.value}>{pct}%</span>}
      </div>
      <div role="progressbar" aria-live="polite" aria-valuenow={indeterminate ? undefined : pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}
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
