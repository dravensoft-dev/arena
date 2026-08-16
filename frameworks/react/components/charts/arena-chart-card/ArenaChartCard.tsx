import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaChartCard.classes.generated.ts';

import type { ArenaHeadingLevel } from '../../../Api.generated';

export interface ArenaChartCardProps {

  /** The card heading. Absent renders no head unless `actions` is present. */
  title?: string;

  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it, the micro register this title is drawn in included. It is the one title on the ladder that defaults to `none`, because the ordinary chart card is a tile in a dashboard grid and a dozen tiles each opening a rung invents an outline where a page has one region; the chart inside carries its own accessible name, so nothing goes unnamed. A tile that genuinely IS a region of the page says which rung it takes, and `h3` is the card rung a chart card inside a section would want. */
  headingLevel?: ArenaHeadingLevel;

  /** Controls in the head row, right-aligned beside the title. */
  actions?: React.ReactNode;
  /** The chart (or any body) the card frames. */
  children?: React.ReactNode;
}


const arenaChartCardStyles = arenaStyles(manifest);

export function ArenaChartCard({ title, headingLevel = 'none', actions, children }: ArenaChartCardProps) {
  const styles = arenaChartCardStyles();
  const Heading = headingLevel === 'none' ? 'span' : headingLevel;
  return (
    <div className={styles.root()} data-arena-part={manifest.parts.root}>
      {(title || actions) && (
        <div className={styles.head()} data-arena-part={manifest.parts.head}>
          {title && <Heading className={styles.title()} data-arena-part={manifest.parts.title}>{title}</Heading>}
          {actions && <div className={styles.actions()} data-arena-part={manifest.parts.actions}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
