import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaStatCard.classes.generated.ts';

import type { ArenaStatDelta, ArenaTone } from '../../../Api.generated';

export type { ArenaStatDelta };

export interface ArenaStatCardProps {

  /** Short uppercase microlabel, two words at most. */
  label: string;

  /** Preformatted, e.g. "1,284" or "99.9%". ArenaStatCard never formats. */
  value: string;

  /** What state the number IS in right now, as against how it moved. ArenaBadge's vocabulary. */
  tone?: ArenaTone;
  /** How the number moved. Absent renders no marker. */
  delta?: ArenaStatDelta;

  /** Small muted line under the value: context, e.g. "vs last week". */
  sub?: string;

  /** A Phosphor class name for a small glyph beside the label, drawn muted. Arena renders the aria-hidden wrapper and the `<i>`. */
  icon?: string;
}


const arenaStatCardStyles = arenaStyles(manifest);

export function ArenaStatCard({ label, value, tone = 'neutral', delta, sub, icon }: ArenaStatCardProps) {
  if (!label || !value) throw new Error('ArenaStatCard: `label` and `value` are required');
  const styles = arenaStatCardStyles({ tone, deltaTone: delta?.tone ?? 'neutral' });
  return (
    <div className={styles.root()} data-arena-part={manifest.parts.root}>
      <div className={styles.head()} data-arena-part={manifest.parts.head}>
        <span className={styles.label()} data-arena-part={manifest.parts.label}>{label}</span>
        {icon && <span aria-hidden="true" className={styles.icon()} data-arena-part={manifest.parts.icon}><i className={icon} /></span>}
      </div>
      <div className={styles.value()} data-arena-part={manifest.parts.value}>{value}</div>
      {delta?.value && (
        <span className={styles.delta()} data-arena-part={manifest.parts.delta}>
          <i className={delta.direction === 'down' ? 'ph-bold ph-arrow-down' : 'ph-bold ph-arrow-up'} aria-hidden="true" />
          {delta.value}
        </span>
      )}
      {sub && <span className={styles.sub()} data-arena-part={manifest.parts.sub}>{sub}</span>}
    </div>
  );
}
