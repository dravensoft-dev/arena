import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaScrollerItem.classes.generated.ts';
import type { ArenaScrollerItemClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaScrollerItemProps {
  className?: ArenaScrollerItemClass;


  /** What the cell holds, exactly as it was written. The item draws no surface, no line and no padding: it is a width and a snap point, and everything visible inside it is the consumer's or another component's. */
  children?: React.ReactNode;
}

const arenaScrollerItemStyles = arenaStyles(manifest);

export function ArenaScrollerItem({ className, children }: ArenaScrollerItemProps) {
  return <div className={arenaClassName('ArenaScrollerItem', arenaScrollerItemStyles().root(), className)} data-arena-part={manifest.parts.root} data-arena-boundary="">{children}</div>;
}
