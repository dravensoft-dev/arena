import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaSection.classes.generated.ts';

import type { ArenaHeadingLevel, ArenaSectionRhythm } from '../../../Api.generated';

export interface ArenaSectionProps {

  /** Names the region, both on screen and to assistive technology. Required, and guarded at runtime after trimming: a section is a heading over a group, and one with no heading is a stack, which css/rhythm.css already ships as a class. The guard trims first because the value it exists to catch is a present and useless one, not an absent one, which the type already refuses. */
  title: string;

  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h2` because the section register is already a step under a page's title and a step over a card's, and this is that register said as structure rather than as a size. `none` is refused at runtime, the rule every component whose `title` is required follows: a title required because it names the thing it draws cannot also be told that the name is not one. */
  headingLevel?: ArenaHeadingLevel;

  /** What the region holds. Required, and guarded at runtime: a section renders a heading naming a group, so a childless one renders a label for nothing. The guard counts the way the render path counts, so a child that is a false conditional counts as absent rather than as one. */
  children: React.ReactNode;

  /** A line above the title saying which part of the page this is. Same register as every other eyebrow in the system, so a style plugin that takes them out of the console's mono capitals takes this one with them. */
  eyebrow?: string;

  /** A line under the title, in the muted ink. It sits below the head row rather than beside the title, because a sentence and an action competing for the same row is what makes a head wrap on a narrow screen. */
  description?: string;

  /** Trailing content in the head row, aligned to the end and to the title's own baseline. Arena draws the row; the consumer draws what sits in it. A link that leads to the whole of what the section shows a slice of is the ordinary case. */
  action?: React.ReactNode;

  /** How far the head stands from the body. The steps are the page rhythm scale itself, so sm reads as one unit, md as a head over its own content and lg as a head over a region of the page, and none closes the distance entirely for a section whose body carries its own top edge. Nothing here is a number this component chose. */
  rhythm?: ArenaSectionRhythm;
}

const arenaSectionStyles = arenaStyles(manifest);
const RHYTHMS = Object.keys(manifest.variants.rhythm);
const rhythmOf = (rhythm: string | undefined): ArenaSectionRhythm =>
  (rhythm && RHYTHMS.includes(rhythm) ? rhythm as ArenaSectionRhythm : 'md');

export function ArenaSection({
  title, headingLevel = 'h2', children, eyebrow, description, action, rhythm = 'md',
}: ArenaSectionProps) {
  if (!title?.trim()) {
    throw new Error('ArenaSection: `title` is required, and names the region its heading introduces');
  }
  if (headingLevel === 'none') {
    throw new Error('ArenaSection: `headingLevel` cannot be none, because `title` is required and names the region its heading introduces');
  }
  if (React.Children.toArray(children).length === 0) {
    throw new Error('ArenaSection: a section with no children is not a legal shape, because its heading would name nothing');
  }
  const styles = arenaSectionStyles({ rhythm: rhythmOf(rhythm) });
  const Heading = headingLevel;

  return (
    <section className={styles.root()} data-arena-part={manifest.parts.root}>
      <div className={styles.head()} data-arena-part={manifest.parts.head}>
        <div className={styles.titles()} data-arena-part={manifest.parts.titles}>
          {eyebrow && <div className={styles.eyebrow()} data-arena-part={manifest.parts.eyebrow}>{eyebrow}</div>}
          <Heading className={styles.title()} data-arena-part={manifest.parts.title}>{title}</Heading>
          {description && <p className={styles.description()} data-arena-part={manifest.parts.description}>{description}</p>}
        </div>
        {action && <div className={styles.action()} data-arena-part={manifest.parts.action}>{action}</div>}
      </div>
      <div className={styles.body()} data-arena-part={manifest.parts.body}>{children}</div>
    </section>
  );
}
