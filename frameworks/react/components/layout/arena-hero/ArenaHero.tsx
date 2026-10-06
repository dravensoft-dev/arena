import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaHero.classes.generated.ts';

import type { ArenaHeadingLevel } from '../../../Api.generated';
import type { ArenaHeroClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaHeroProps {
  className?: ArenaHeroClass;


  /** The one line the page is built around. Required, and guarded at runtime after trimming: a hero is that line plus its setting, and a hero without it is a figure with buttons under it. The guard trims first because the value it exists to catch is a present and useless one, not an absent one, which the type already refuses. */
  title: string;

  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h1` because a hero opens the page it sits on and a landing page carries no other title. A page carrying a hero AND a page head has two candidates for one rung, and the ladder settles which yields rather than the markup order: the hero is the rung above, so it keeps the `h1` and the page head is what steps down. Nothing here reads the page to work that out, because what a component renders is never derived from what sits above it. `none` is refused at runtime, the rule every component whose `title` is required follows: a title required because it names the thing it draws cannot also be told that the name is not one. */
  headingLevel?: ArenaHeadingLevel;

  /** A line above the title saying what kind of page this is. Same register as every other eyebrow in the system, so a style plugin that takes them out of the console's mono capitals takes this one with them. */
  eyebrow?: string;

  /** The paragraph under the title, held to a reading width rather than to the column's, because a line that runs the whole width of a hero loses its return sweep. Named lede and not description, since this is the sentence that carries the page and not a note about the heading. */
  lede?: string;

  /** What the page asks the reader to do, in a wrapping row under the lede. Arena draws the row; the consumer draws what sits in it, and one primary action beside one secondary is the shape this is sized for. */
  actions?: React.ReactNode;

  /** The picture, the mark or the shape beside the words, or behind them under the bleed layout. It is a slot rather than a source, so an ArenaFigure, an illustration or a single glyph all land the same way. */
  figure?: React.ReactNode;
}

const arenaHeroStyles = arenaStyles(manifest);
export function ArenaHero({ className, 
  title, headingLevel = 'h1', eyebrow, lede, actions, figure,
}: ArenaHeroProps) {
  if (!title?.trim()) {
    throw new Error('ArenaHero: `title` is required, and names the page it opens');
  }
  if (headingLevel === 'none') {
    throw new Error('ArenaHero: `headingLevel` cannot be none, because `title` is required and is the line the page is built around');
  }
  const Heading = headingLevel;
  const styles = arenaHeroStyles();

  return (
    <section className={arenaClassName('ArenaHero', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <div className={styles.words()} data-arena-part={manifest.parts.words} {...styles.$data.words()}>
        {eyebrow && <p className={styles.eyebrow()} data-arena-part={manifest.parts.eyebrow} {...styles.$data.eyebrow()}>{eyebrow}</p>}
        <Heading className={styles.title()} data-arena-part={manifest.parts.title} {...styles.$data.title()}>{title}</Heading>
        {lede && <p className={styles.lede()} data-arena-part={manifest.parts.lede} {...styles.$data.lede()}>{lede}</p>}
        {actions && <div className={styles.actions()} data-arena-part={manifest.parts.actions} {...styles.$data.actions()} data-arena-boundary="">{actions}</div>}
      </div>
      {figure && <div className={styles.figure()} data-arena-part={manifest.parts.figure} {...styles.$data.figure()} data-arena-boundary="">{figure}</div>}
    </section>
  );
}
