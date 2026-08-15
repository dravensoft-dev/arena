import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaHero.classes.generated.ts';

import type { ArenaHeroAlign, ArenaHeroLayout } from '../../../Api.generated';

export interface ArenaHeroProps {

  /** The one line the page is built around. Required, and guarded at runtime after trimming: a hero is that line plus its setting, and a hero without it is a figure with buttons under it. The guard trims first because the value it exists to catch is a present and useless one, not an absent one, which the type already refuses. */
  title: string;

  /** A line above the title saying what kind of page this is. Same register as every other eyebrow in the system, so a voice that takes them out of the console's mono capitals takes this one with them. */
  eyebrow?: string;

  /** The paragraph under the title, held to a reading width rather than to the column's, because a line that runs the whole width of a hero loses its return sweep. Named lede and not description, since this is the sentence that carries the page and not a note about the heading. */
  lede?: string;

  /** What the page asks the reader to do, in a wrapping row under the lede. Arena draws the row; the consumer draws what sits in it, and one primary action beside one secondary is the shape this is sized for. */
  actions?: React.ReactNode;

  /** The picture, the mark or the shape beside the words, or behind them under the bleed layout. It is a slot rather than a source, so an ArenaFigure, an illustration or a single glyph all land the same way. */
  figure?: React.ReactNode;

  /** How the words sit against the figure. Split puts them side by side and falls to one column when the room runs out, with no breakpoint deciding when; stacked keeps them in one column at every width, for a hero whose figure is a band rather than a partner; bleed lays the words on the figure, over the wash the media overlay role paints, which is the arrangement that needs that role to be readable. */
  layout?: ArenaHeroLayout;

  /** Whether the words run from the start edge or are centred in their column. Centred is what a bleed hero usually wants and a split one usually does not, and it is a separate decision from the layout because a stacked hero can want either. */
  align?: ArenaHeroAlign;
}

const arenaHeroStyles = arenaStyles(manifest);
const LAYOUTS = Object.keys(manifest.variants.layout);
const ALIGNS = Object.keys(manifest.variants.align);

const layoutOf = (layout: string | undefined): ArenaHeroLayout =>
  (layout && LAYOUTS.includes(layout) ? layout as ArenaHeroLayout : 'split');
const alignOf = (align: string | undefined): ArenaHeroAlign =>
  (align && ALIGNS.includes(align) ? align as ArenaHeroAlign : 'start');

const SPLIT_MIN = 'calc(var(--grid-min) * 1.5)';

export function ArenaHero({
  title, eyebrow, lede, actions, figure, layout = 'split', align = 'start',
}: ArenaHeroProps) {
  if (!title?.trim()) {
    throw new Error('ArenaHero: `title` is required, and names the page it opens');
  }
  const chosen = layoutOf(layout);
  const styles = arenaHeroStyles({ layout: chosen, align: alignOf(align) });
  const tracks = chosen === 'split'
    ? `repeat(auto-fit, minmax(min(${SPLIT_MIN}, 100%), 1fr))`
    : undefined;

  return (
    <section className={styles.root()} style={{ gridTemplateColumns: tracks }}>
      <div className={styles.words()}>
        {eyebrow && <p className={styles.eyebrow()}>{eyebrow}</p>}
        <h1 className={styles.title()}>{title}</h1>
        {lede && <p className={styles.lede()}>{lede}</p>}
        {actions && <div className={styles.actions()}>{actions}</div>}
      </div>
      {figure && <div className={styles.figure()}>{figure}</div>}
    </section>
  );
}
