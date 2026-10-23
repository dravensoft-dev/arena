import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaPageHead.classes.generated.ts';
import { useArenaContainerWidth, arenaReadBreakpoint } from '../../../UseArenaContainerWidth.ts';

import type { ArenaHeadingLevel } from '../../../Api.generated';
import type { ArenaPageHeadClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaPageHeadProps {
  className?: ArenaPageHeadClass;


  /** The page title. Required: a page head with no title is a bug, not a state. */
  title: string;

  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. The member defaults to `h1` because a page head is the page's own title and the screen it heads carries no other. Under a hero, the one rung above it on the title ladder, the page head takes `h2` and leaves the page's single `h1` to the hero. That arrangement is the one where the default is wrong. The level is a member rather than something read off the page, because what a component renders is never derived from what sits above it. The value `none` is refused at runtime, as it is for every component whose `title` is required. This title is required, since it names the thing it draws. Such a title cannot also be told that its name is not one. */
  headingLevel?: ArenaHeadingLevel;

  /** A muted line under the title. */
  subtitle?: string;

  /** Page-level controls, right-aligned in the head. */
  actions?: React.ReactNode;
}


const arenaPageHeadStyles = arenaStyles(manifest);

export function ArenaPageHead({ className, title, headingLevel = 'h1', subtitle, actions }: ArenaPageHeadProps) {
  if (!title) throw new Error('ArenaPageHead: `title` is required');
  if (headingLevel === 'none') {
    throw new Error('ArenaPageHead: `headingLevel` cannot be none, because `title` is required and is the page\'s own title');
  }
  const Heading = headingLevel;
  const [ref, width] = useArenaContainerWidth();
  const narrow = width !== null && width < arenaReadBreakpoint('sm');
  const styles = arenaPageHeadStyles({ narrow });

  return (
    <div ref={ref} className={arenaClassName('ArenaPageHead', styles.root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <div className={styles.titles()} data-arena-part={manifest.parts.titles} {...styles.$data.titles()}>
        <Heading className={styles.title()} data-arena-part={manifest.parts.title} {...styles.$data.title()}>{title}</Heading>
        {subtitle && <p className={styles.subtitle()} data-arena-part={manifest.parts.subtitle} {...styles.$data.subtitle()}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions()} data-arena-part={manifest.parts.actions} {...styles.$data.actions()} data-arena-boundary="">{actions}</div>}
    </div>
  );
}
