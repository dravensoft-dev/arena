import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaErrorState.classes.generated.ts';
import { ArenaButton } from '../../forms/arena-button/ArenaButton.tsx';

import type { ArenaHeadingLevel } from '../../../Api.generated';

export interface ArenaErrorStateProps {
  /** A Phosphor class name for the danger glyph Arena draws. */
  icon?: string;
  /** The headline: what failed. */
  title?: string;
  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h3`, the card rung of the title ladder, for the reason an empty state does: a failure fills the body of a region something above it already names. `none` takes the headline out of the outline, which is what a failure inside a small surface wants, and it is available here because `title` carries a default rather than being required. */
  headingLevel?: ArenaHeadingLevel;
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

export function ArenaErrorState({ icon, title = 'Something went wrong', headingLevel = 'h3', message, code, retryLabel, onRetry, secondaryAction }: ArenaErrorStateProps) {
  const styles = errorStyles();
  const Heading = headingLevel === 'none' ? 'div' : headingLevel;
  return (
    <div role="alert" className={styles.root()} data-arena-part={manifest.parts.root}>
      {icon && <div className={styles.icon()} data-arena-part={manifest.parts.icon}><i className={icon} aria-hidden="true" /></div>}
      <Heading className={styles.title()} data-arena-part={manifest.parts.title}>{title}</Heading>
      {message && <div className={styles.message()} data-arena-part={manifest.parts.message}>{message}</div>}
      {code && <code className={styles.code()} data-arena-part={manifest.parts.code}>{code}</code>}
      <div className={styles.actions()} data-arena-part={manifest.parts.actions}>
        {retryLabel && <ArenaButton variant="primary" onClick={onRetry}>{retryLabel}</ArenaButton>}
        {secondaryAction}
      </div>
    </div>
  );
}
