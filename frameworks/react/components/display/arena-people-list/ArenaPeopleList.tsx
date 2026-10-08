import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaPeopleList.classes.generated.ts';

import type { ArenaPeopleListClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaPeopleListProps {
  className?: ArenaPeopleListClass;


  /** Names the list for assistive technology: what these people are a list OF, never that they are people. "Ruby league standings", "Suggested accounts", never "People". Required and guarded at runtime rather than defaulted, because nothing can derive it and a name that only says what the component is satisfies the requirement mechanically while telling a screen-reader user nothing: two lists on one page announce identically. */
  label: string;

  /** Whether the order is part of the meaning. A standings table read in any other order is a different claim, and its rows are numbered; a set of suggestions is a set. It is a declared input rather than something inferred from the rows carrying a `rank`, because Arena never derives what it draws from what a consumer happened to pass, and a numbered list whose numbers are decoration is a lie told to a screen reader. */
  ordered?: boolean;


  /** The rows. One ArenaPersonRow per person; a row is what says who and how much, and the list decides only where each one goes. */
  children?: React.ReactNode;
}


const peopleStyles = arenaStyles(manifest);

export function ArenaPeopleList({ className, label, ordered = false, children }: ArenaPeopleListProps) {
  if (!label?.trim()) throw new Error('ArenaPeopleList: `label` is required (it names what these people are a list of, and nothing can derive that)');
  const List = ordered ? 'ol' : 'ul';
  return (
    <List aria-label={label} className={arenaClassName('ArenaPeopleList', peopleStyles({}).root(), className)} data-arena-part={manifest.parts.root} {...peopleStyles({}).$data.root()} data-arena-boundary="">
      {children}
    </List>
  );
}
