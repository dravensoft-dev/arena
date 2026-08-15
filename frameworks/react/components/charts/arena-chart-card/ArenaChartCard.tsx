import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaChartCard.classes.generated.ts';

export interface ArenaChartCardProps {

  /** The card heading. Absent renders no head unless `actions` is present. */
  title?: string;

  /** Controls in the head row, right-aligned beside the title. */
  actions?: React.ReactNode;
  /** The chart (or any body) the card frames. */
  children?: React.ReactNode;
}


const arenaChartCardStyles = arenaStyles(manifest);

export function ArenaChartCard({ title, actions, children }: ArenaChartCardProps) {
  const styles = arenaChartCardStyles();
  return (
    <div className={styles.root()} data-arena-part={manifest.parts.root}>
      {(title || actions) && (
        <div className={styles.head()} data-arena-part={manifest.parts.head}>
          {title && <span className={styles.title()} data-arena-part={manifest.parts.title}>{title}</span>}
          {actions && <div className={styles.actions()} data-arena-part={manifest.parts.actions}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
