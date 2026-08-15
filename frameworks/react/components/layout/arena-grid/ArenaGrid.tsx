import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaGrid.classes.generated.ts';

import type { ArenaGridGap } from '../../../Api.generated';

export interface ArenaGridProps {

  /** The narrowest a cell may be before the count drops. It is the one number this component takes and it is page geometry rather than a step on the spacing scale, which models rhythm and not the width of a card. It is clamped against the container, so a minimum wider than the room available yields one full-width column instead of overflowing it. The default is a role rather than the arithmetic it used to spell, so a style plugin can answer how many cards a viewport shows: a gallery wants a dense wall and a ledger wants a wide column, from the same markup. */
  min?: string;

  /** The air between cells, on both axes. Named steps rather than a length, because rhythm is what the spacing scale is for and a grid is where a hand-picked one shows worst. Its steps are the page rhythm scale itself, so sm groups related cells, md sets two peers apart and lg reads as two sections, and none closes the gap entirely; a grid is that rhythm plus a grid, and nothing here is a number this component chose. */
  gap?: ArenaGridGap;

  /** A ceiling on the grid's own width, centred in whatever contains it. Absent, it fills its container, which is what a grid nested inside a page should do; a page's own reading width is what this is for. */
  maxWidth?: string;

  /** The cells, one per child. Nothing is wrapped and nothing is measured: a child is a grid item exactly as it was written, so a card, a chart or a definition list all lay out the same way. */
  children?: React.ReactNode;
}

const arenaGridStyles = arenaStyles(manifest);
const GAPS = Object.keys(manifest.variants.gap);
const gapOf = (gap: string | undefined): ArenaGridGap =>
  (gap && GAPS.includes(gap) ? gap as ArenaGridGap : 'md');

export function ArenaGrid({ min = 'var(--grid-min)', gap = 'md', maxWidth, children }: ArenaGridProps) {
  return (
    <div className={arenaGridStyles({ gap: gapOf(gap), centred: maxWidth !== undefined }).root()} data-arena-part={manifest.parts.root}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}, 100%), 1fr))`,
        maxWidth,
      }}>
      {children}
    </div>
  );
}
