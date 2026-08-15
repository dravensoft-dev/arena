import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaPeopleList.classes.generated.ts';

import type { ArenaControlSize } from '../../../Api.generated';

export interface ArenaPeopleListProps {

  /** Names the list for assistive technology: what these people are a list OF, never that they are people. "Ruby league standings", "Suggested accounts", never "People". Required and guarded at runtime rather than defaulted, because nothing can derive it and a name that only says what the component is satisfies the requirement mechanically while telling a screen-reader user nothing: two lists on one page announce identically. */
  label: string;

  /** Whether the order is part of the meaning. A standings table read in any other order is a different claim, and its rows are numbered; a set of suggestions is a set. It is a declared input rather than something inferred from the rows carrying a `rank`, because Arena never derives what it draws from what a consumer happened to pass, and a numbered list whose numbers are decoration is a lie told to a screen reader. */
  ordered?: boolean;

  /** How big every row in the list is: the face, the name and the figure move together. It sits on the list rather than on the row because rows in one list that disagree about their size are a defect and never a design, and how the list hands it down is each layer's business rather than this contract's. */
  size?: ArenaControlSize;

  /** The rows. One ArenaPersonRow per person; a row is what says who and how much, and the list decides only where each one goes. */
  children?: React.ReactNode;
}


const peopleStyles = arenaStyles(manifest);

export function ArenaPeopleList({ label, ordered = false, size = 'md', children }: ArenaPeopleListProps) {
  if (!label?.trim()) throw new Error('ArenaPeopleList: `label` is required (it names what these people are a list of, and nothing can derive that)');
  const List = ordered ? 'ol' : 'ul';
  const rows = React.Children.map(children, (child) =>
    (React.isValidElement(child) ? React.cloneElement(child, { size } as Partial<{ size: ArenaControlSize }>) : child));
  return (
    <List aria-label={label} className={peopleStyles({ size }).root()} data-arena-part={manifest.parts.root}>
      {rows}
    </List>
  );
}
