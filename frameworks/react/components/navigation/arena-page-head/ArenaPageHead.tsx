import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaPageHead.classes.generated.ts';
import { useArenaContainerWidth, arenaReadBreakpoint } from '../../../UseArenaContainerWidth.ts';

import type { ArenaPageHeadAlign } from '../../../Api.generated';

export interface ArenaPageHeadProps {

  /** The page title. Required: a page head with no title is a bug, not a state. */
  title: string;

  /** A muted line under the title. */
  subtitle?: string;

  /** Page-level controls, right-aligned in the head. */
  actions?: React.ReactNode;

  /** Cross-axis alignment of the actions block against the title, wide layout only. */
  align?: ArenaPageHeadAlign;
}


const arenaPageHeadStyles = arenaStyles(manifest);

export function ArenaPageHead({ title, subtitle, actions, align = 'start' }: ArenaPageHeadProps) {
  if (!title) throw new Error('ArenaPageHead: `title` is required');
  const [ref, width] = useArenaContainerWidth();
  const narrow = width !== null && width < arenaReadBreakpoint('sm');
  const styles = arenaPageHeadStyles({ narrow, align });

  return (
    <div ref={ref} className={styles.root()} data-arena-part={manifest.parts.root}>
      <div className={styles.titles()} data-arena-part={manifest.parts.titles}>
        <h1 className={styles.title()} data-arena-part={manifest.parts.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle()} data-arena-part={manifest.parts.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions()} data-arena-part={manifest.parts.actions}>{actions}</div>}
    </div>
  );
}
