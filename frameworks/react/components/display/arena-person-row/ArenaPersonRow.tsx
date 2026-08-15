import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-people-list/ArenaPeopleList.classes.generated.ts';
import { ArenaAvatar } from '../arena-avatar/ArenaAvatar.tsx';

import type { ArenaAvatarSize, ArenaControlSize } from '../../../Api.generated';

export interface ArenaPersonRowInjected {
  size: ArenaControlSize;
}

export interface ArenaPersonRowProps {

  /** The person or entity. It is the row's own text, the face's initials when there is no image, and that image's alt text, which is why one member carries all three: a name spelt differently in any of them is the same person announced as two. Required and guarded at runtime rather than defaulted, because nothing can derive who a row is about and a blank one draws a face, a rank and a figure around nobody. */
  name: string;

  /** The face's image. Absent, the row draws the initials `name` gives it, which is the same fallback ArenaAvatar states and the reason a row needs no second member for the picture. */
  src?: string;

  /** One line under the name: a handle, a role, a team, why this person is being suggested. Prose rather than a value, so it is set in the body register and never in the numeric one. */
  secondary?: string;

  /** The position this row holds, drawn in front of the face in a column wide enough for the list's longest. It is the number a standings list is read by, so it is set in the numeric register, and it says nothing about the order the rows are in: that is `ArenaPeopleList.ordered`. */
  rank?: number;

  /** The quantity this row is about, drawn at the end: a score, a count, a share. A string rather than a number because the unit travels with it and a row reading "1815 XP" is one value and not two, which also keeps the formatting where the data is. */
  figure?: string;

  /** Whether this row is the reader's own. It fills the row so it can be found without reading it, and it says so rather than only showing it, because a highlight nothing announces is a highlight half the readers do not get. */
  current?: boolean;

  /** One control at the end of the row: follow, invite, remove. It sits after the figure, and the row draws nothing for it beyond the space it takes. */
  action?: React.ReactNode;
}


const peopleStyles = arenaStyles(manifest);
const FACE: Record<ArenaControlSize, ArenaAvatarSize> = { sm: 'xs', md: 'sm', lg: 'md' };

export function ArenaPersonRow({ name, src, secondary, rank, figure, current = false, action, size = 'md' }: ArenaPersonRowProps & Partial<ArenaPersonRowInjected>) {
  if (!name?.trim()) throw new Error('ArenaPersonRow: `name` is required (it is the row, the initials and the image\'s alt text at once)');
  const styles = peopleStyles({ size, current });
  return (
    <li className={styles.row()} data-arena-part={manifest.parts.row} aria-current={current ? 'true' : undefined}>
      {rank !== undefined && <span className={styles.rank()} data-arena-part={manifest.parts.rank}>{rank}</span>}
      <ArenaAvatar name={name} src={src} size={FACE[size]} />
      <span className={styles.text()} data-arena-part={manifest.parts.text}>
        <span className={styles.name()} data-arena-part={manifest.parts.name}>{name}</span>
        {secondary && <span className={styles.secondary()} data-arena-part={manifest.parts.secondary}>{secondary}</span>}
      </span>
      {figure && <span className={styles.figure()} data-arena-part={manifest.parts.figure}>{figure}</span>}
      <span className={styles.action()} data-arena-part={manifest.parts.action}>{action}</span>
    </li>
  );
}
