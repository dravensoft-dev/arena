import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import { ARENA_MAIN_ID } from '../arena-main/ArenaMain.tsx';
import manifest from './ArenaSkipLink.classes.generated.ts';

export interface ArenaSkipLinkProps {

  /** The words a reader reads when the link appears. Required, and guarded at runtime after trimming, the shape ArenaSideNav.ariaLabel carries for the same reason: this is text a person reads and nothing can derive it, and the guard trims first because the value it exists to catch is a present and useless one rather than an absent one, which the type already refuses. There is a defensible default in English and it is deliberately not given, because a default in one language is a wrong answer everywhere else and it is wrong silently. */
  label: string;
}

const arenaSkipLinkStyles = arenaStyles(manifest);

export function ArenaSkipLink({ label }: ArenaSkipLinkProps) {
  if (!label?.trim()) {
    throw new Error('ArenaSkipLink: `label` is required, and is the words a reader reads when the link appears');
  }
  return (
    <a href={`#${ARENA_MAIN_ID}`}
      className={arenaSkipLinkStyles().root()} data-arena-part={manifest.parts.root}>
      {label}
    </a>
  );
}
