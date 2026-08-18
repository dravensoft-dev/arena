import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaBoard.classes.generated.ts';

export interface ArenaBoardProps {

  /** Names the board to assistive technology: what the columns are columns OF. "Sprint 32 tasks by status", never "Board". Required and guarded at runtime after trimming, the shape ArenaScroller.label carries for the same reason, since a group announced as a group tells a reader that focus moved and nothing about where it landed. */
  label: string;

  /** The columns, one ArenaBoardColumn each. Required and guarded at runtime: a board with no columns is a tab stop over nothing, which is the dead stop a component with a group role must not ship. */
  children: React.ReactNode;

  /** The narrowest a column may be before the board scrolls rather than squeezing. Columns share the room equally above it, so a board of four fills the width it is given and a board of twelve scrolls. It is a length rather than a step on the spacing scale, for the reason ArenaGrid.min is one: this is page geometry and the spacing scale models rhythm. The default is the same role a grid's cell reads, so a card is one width across a wall, a rail and a board. */
  minColumn?: string;
}


const boardStyles = arenaStyles(manifest);

export function ArenaBoard({ label, children, minColumn = 'var(--grid-min)' }: ArenaBoardProps) {
  if (!label?.trim()) throw new Error('ArenaBoard: `label` is required (it names what the columns are columns of, and nothing can derive that)');
  if (React.Children.toArray(children).length === 0) throw new Error('ArenaBoard: `children` is required (a board with no columns is a tab stop over nothing)');
  return (
    <div role="group" aria-label={label} tabIndex={0}
      className={boardStyles().root()} data-arena-part={manifest.parts.root}
      style={{ '--arena-board-column': minColumn } as React.CSSProperties}>
      {children}
    </div>
  );
}
