import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaErrorState.classes.generated.ts';
import { ArenaButton } from '../../forms/arena-button/ArenaButton.tsx';

export interface ArenaErrorStateProps {
  /** A Phosphor class name for the danger glyph Arena draws. */
  icon?: string;
  /** The headline: what failed. */
  title?: string;
  /** A sentence of detail under the title. */
  message?: string;
  /** A diagnostic/support code, shown monospaced. */
  code?: string;
  /** The label of the retry button Arena draws. Absent renders no retry. */
  retryLabel?: string;
  /** The retry button was activated. */
  onRetry?: () => void;
  /** An extra control beside the retry (e.g. a link to logs). */
  secondaryAction?: React.ReactNode;
}


const errorStyles = arenaStyles(manifest);

export function ArenaErrorState({ icon, title = 'Something went wrong', message, code, retryLabel, onRetry, secondaryAction }: ArenaErrorStateProps) {
  const styles = errorStyles();
  return (
    <div role="alert" className={styles.root()} data-arena-part={manifest.parts.root}>
      {icon && <div className={styles.icon()} data-arena-part={manifest.parts.icon}><i className={icon} aria-hidden="true" /></div>}
      <div className={styles.title()} data-arena-part={manifest.parts.title}>{title}</div>
      {message && <div className={styles.message()} data-arena-part={manifest.parts.message}>{message}</div>}
      {code && <code className={styles.code()} data-arena-part={manifest.parts.code}>{code}</code>}
      <div className={styles.actions()} data-arena-part={manifest.parts.actions}>
        {retryLabel && <ArenaButton variant="primary" onClick={onRetry}>{retryLabel}</ArenaButton>}
        {secondaryAction}
      </div>
    </div>
  );
}
