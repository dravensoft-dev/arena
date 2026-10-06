import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaBoard.classes.generated.ts';
import type { ArenaBoardClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaBoardProps {
  className?: ArenaBoardClass;


  /** Names the board to assistive technology: what the columns are columns OF. "Sprint 32 tasks by status", never "Board". Required and guarded at runtime after trimming, the shape ArenaScroller.label carries for the same reason, since a group announced as a group tells a reader that focus moved and nothing about where it landed. */
  label: string;

  /** The columns, one ArenaBoardColumn each. Required and guarded at runtime: a board with no columns is a tab stop over nothing, which is the dead stop a component with a group role must not ship. */
  children: React.ReactNode;
}


const boardStyles = arenaStyles(manifest);

export function ArenaBoard({ className, label, children }: ArenaBoardProps) {
  if (!label?.trim()) throw new Error('ArenaBoard: `label` is required (it names what the columns are columns of, and nothing can derive that)');
  if (React.Children.toArray(children).length === 0) throw new Error('ArenaBoard: `children` is required (a board with no columns is a tab stop over nothing)');
  return (
    <div role="group" aria-label={label} tabIndex={0}
      className={arenaClassName('ArenaBoard', boardStyles().root(), className)} data-arena-part={manifest.parts.root} {...boardStyles().$data.root()} data-arena-boundary="">
      {children}
    </div>
  );
}
