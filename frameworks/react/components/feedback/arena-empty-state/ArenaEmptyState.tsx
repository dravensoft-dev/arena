import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaEmptyState.classes.generated.ts';

import type { ArenaHeadingLevel } from '../../../Api.generated';

export interface ArenaEmptyStateProps {

  /** A Phosphor class name for the glyph Arena draws, muted. */
  icon?: string;

  /** The headline: what is empty. */
  title: string;

  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h3`, the card rung of the title ladder, because an empty state fills the body of a region something above it already names, so its headline sits under that name rather than beside it. `none` is refused at runtime, the rule every component whose `title` is required follows: a title required because it names the thing it draws cannot also be told that the name is not one. */
  headingLevel?: ArenaHeadingLevel;
  /** A sentence of guidance under the title. */
  message?: string;
  /** A single call-to-action control, centred under the message. */
  action?: React.ReactNode;
}


const emptyStyles = arenaStyles(manifest);

export function ArenaEmptyState({ icon, title, headingLevel = 'h3', message, action }: ArenaEmptyStateProps) {
  if (!title) throw new Error('ArenaEmptyState: `title` is required');
  if (headingLevel === 'none') {
    throw new Error('ArenaEmptyState: `headingLevel` cannot be none, because `title` is required and is the headline a reader lands on');
  }
  const styles = emptyStyles();
  const Heading = headingLevel;
  return (
    <div className={styles.root()} data-arena-part={manifest.parts.root}>
      {icon && <div className={styles.icon()} data-arena-part={manifest.parts.icon}><i className={icon} aria-hidden="true" /></div>}
      {title && <Heading className={styles.title()} data-arena-part={manifest.parts.title}>{title}</Heading>}
      {message && <div className={styles.message()} data-arena-part={manifest.parts.message}>{message}</div>}
      {action && <div className={styles.action()} data-arena-part={manifest.parts.action}>{action}</div>}
    </div>
  );
}
