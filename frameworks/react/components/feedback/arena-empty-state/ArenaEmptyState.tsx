import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaEmptyState.classes.generated.ts';

export interface ArenaEmptyStateProps {

  /** A Phosphor class name for the glyph Arena draws, muted. */
  icon?: string;

  /** The headline: what is empty. */
  title: string;
  /** A sentence of guidance under the title. */
  message?: string;
  /** A single call-to-action control, centred under the message. */
  action?: React.ReactNode;
}


const emptyStyles = arenaStyles(manifest);

export function ArenaEmptyState({ icon, title, message, action }: ArenaEmptyStateProps) {
  if (!title) throw new Error('ArenaEmptyState: `title` is required');
  const styles = emptyStyles();
  return (
    <div className={styles.root()} data-arena-part={manifest.parts.root}>
      {icon && <div className={styles.icon()} data-arena-part={manifest.parts.icon}><i className={icon} aria-hidden="true" /></div>}
      {title && <div className={styles.title()} data-arena-part={manifest.parts.title}>{title}</div>}
      {message && <div className={styles.message()} data-arena-part={manifest.parts.message}>{message}</div>}
      {action && <div className={styles.action()} data-arena-part={manifest.parts.action}>{action}</div>}
    </div>
  );
}
