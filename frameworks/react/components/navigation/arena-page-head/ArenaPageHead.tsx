import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaPageHead.classes.generated.ts';
import { useArenaContainerWidth, arenaReadBreakpoint } from '../../../UseArenaContainerWidth.ts';

import type { ArenaHeadingLevel, ArenaPageHeadAlign } from '../../../Api.generated';

export interface ArenaPageHeadProps {

  /** The page title. Required: a page head with no title is a bug, not a state. */
  title: string;

  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h1` because a page head is the page's own title and the screen it heads carries no other. Under a hero, the one rung above it on the title ladder, it takes `h2` and leaves the page's single `h1` to the hero; that is the one arrangement where the default is wrong, and it is a member rather than something read off the page, because what a component renders is never derived from what sits above it. `none` is refused at runtime, the rule every component whose `title` is required follows: a title required because it names the thing it draws cannot also be told that the name is not one. */
  headingLevel?: ArenaHeadingLevel;

  /** A muted line under the title. */
  subtitle?: string;

  /** Page-level controls, right-aligned in the head. */
  actions?: React.ReactNode;

  /** Cross-axis alignment of the actions block against the title, wide layout only. */
  align?: ArenaPageHeadAlign;
}


const arenaPageHeadStyles = arenaStyles(manifest);

export function ArenaPageHead({ title, headingLevel = 'h1', subtitle, actions, align = 'start' }: ArenaPageHeadProps) {
  if (!title) throw new Error('ArenaPageHead: `title` is required');
  if (headingLevel === 'none') {
    throw new Error('ArenaPageHead: `headingLevel` cannot be none, because `title` is required and is the page\'s own title');
  }
  const Heading = headingLevel;
  const [ref, width] = useArenaContainerWidth();
  const narrow = width !== null && width < arenaReadBreakpoint('sm');
  const styles = arenaPageHeadStyles({ narrow, align });

  return (
    <div ref={ref} className={styles.root()} data-arena-part={manifest.parts.root}>
      <div className={styles.titles()} data-arena-part={manifest.parts.titles}>
        <Heading className={styles.title()} data-arena-part={manifest.parts.title}>{title}</Heading>
        {subtitle && <p className={styles.subtitle()} data-arena-part={manifest.parts.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions()} data-arena-part={manifest.parts.actions}>{actions}</div>}
    </div>
  );
}
