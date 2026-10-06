import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaToastHost.classes.generated.ts';

import type { ArenaToastHostClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaToastHostProps {
  className?: ArenaToastHostClass;


  /** The notices, in the order they are read. The stack is a plain column and the visual order is the source order, whatever the corner: a reversed one would put the newest notice first on screen and last in the reading order, and the two must agree. Nothing here caps the count or times a dismissal, because the queue that produced these notices already holds their identity and their order, and a cap applied by the box that draws them would fight the queue that owns them. */
  children?: React.ReactNode;
}

const arenaToastHostStyles = arenaStyles(manifest);

export function ArenaToastHost({ className, children }: ArenaToastHostProps) {
  return <div className={arenaClassName('ArenaToastHost', arenaToastHostStyles().root(), className)} data-arena-part={manifest.parts.root} {...arenaToastHostStyles().$data.root()} data-arena-boundary="" data-arena-surface="floating">{children}</div>;
}
