import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-people-list/ArenaPeopleList.classes.generated.ts';
import { ArenaAvatar } from '../arena-avatar/ArenaAvatar.tsx';

import { arenaClassName } from '../../../VocabularyClass.ts';
import { ARENA_CONTEXT_VOCABULARY, type ArenaPersonRowClass } from '../../../Vocabulary.generated.ts';

export interface ArenaPersonRowProps {
  className?: ArenaPersonRowClass;


  /** The person or entity. The name is the row's own text and the face's initials when there is no image, which is why one member carries both. A name spelt differently in either is the same person drawn as two. The face sets `nameShown`, so the row announces the name once, from its text. Required and guarded at runtime rather than defaulted, because nothing can derive who a row is about. A blank name draws a face, a rank and a figure around nobody. */
  name: string;

  /** The face's image. Absent, the row draws the initials `name` gives it, which is the same fallback ArenaAvatar states and the reason a row needs no second member for the picture. */
  src?: string;

  /** One line under the name: a handle, a role, a team, why this person is being suggested. Prose rather than a value, so it is set in the body register and never in the numeric one. */
  secondary?: string;

  /** The position this row holds, drawn in front of the face in a column wide enough for the list's longest. The rank is the number a standings list is read by, so it is set in the numeric register. The rank says nothing about the order the rows are in, which belongs to `ArenaPeopleList.ordered`. */
  rank?: number;

  /** The quantity this row is about, drawn at the end: a score, a count, a share. A string rather than a number because the unit travels with it. A row reading "1815 XP" is one value and not two, which also keeps the formatting where the data is. */
  figure?: string;

  /** Whether this row is the reader's own. The row is filled so it can be found without reading it. The row says so rather than only showing it, because a highlight nothing announces is a highlight half the readers do not get. */
  current?: boolean;

  /** One control at the end of the row: follow, invite, remove. The control sits after the figure, and the row draws nothing for it beyond the space it takes. */
  action?: React.ReactNode;
}


const peopleStyles = arenaStyles(manifest);

export function ArenaPersonRow({ className, name, src, secondary, rank, figure, current = false, action }: ArenaPersonRowProps) {
  if (!name?.trim()) throw new Error('ArenaPersonRow: `name` is required (it is the row\'s text and the face\'s initials at once)');
  const styles = peopleStyles({ current });
  return (
    <li className={arenaClassName('ArenaPersonRow', styles.row(), className, ARENA_CONTEXT_VOCABULARY)} data-arena-part={manifest.parts.row} {...styles.$data.row()} aria-current={current ? 'true' : undefined}>
      {rank !== undefined && <span className={styles.rank()} data-arena-part={manifest.parts.rank} {...styles.$data.rank()}>{rank}</span>}
      <ArenaAvatar name={name} src={src} nameShown face />
      <span className={styles.text()} data-arena-part={manifest.parts.text} {...styles.$data.text()}>
        <span className={styles.name()} data-arena-part={manifest.parts.name} {...styles.$data.name()}>{name}</span>
        {secondary && <span className={styles.secondary()} data-arena-part={manifest.parts.secondary} {...styles.$data.secondary()}>{secondary}</span>}
      </span>
      {figure && <span className={styles.figure()} data-arena-part={manifest.parts.figure} {...styles.$data.figure()}>{figure}</span>}
      <span className={styles.action()} data-arena-part={manifest.parts.action} {...styles.$data.action()} data-arena-boundary="">{action}</span>
    </li>
  );
}
