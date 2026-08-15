import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaSiteFooter.classes.generated.ts';

export interface ArenaSiteFooterProps {

  /** The columns, one per child, laid out by a grid that decides its own count from the room it is given rather than from a breakpoint anyone picked. A column of links, a signup, an address and a mark all land the same way. */
  children?: React.ReactNode;

  /** The line under the columns, in the muted ink: the licence, the year, the company. Absent, the footer renders no line at all rather than an empty one. */
  note?: string;
}

const arenaSiteFooterStyles = arenaStyles(manifest);
const TRACKS = 'repeat(auto-fit, minmax(min(var(--grid-min), 100%), 1fr))';
const PAGE = 'var(--container-max)';

export function ArenaSiteFooter({ children, note }: ArenaSiteFooterProps) {
  const styles = arenaSiteFooterStyles();

  return (
    <footer className={styles.root()}>
      <div className={styles.band()} style={{ maxWidth: PAGE }}>
        {children && (
          <div className={styles.columns()} style={{ gridTemplateColumns: TRACKS }}>{children}</div>
        )}
        {note && <p className={styles.note()}>{note}</p>}
      </div>
    </footer>
  );
}
