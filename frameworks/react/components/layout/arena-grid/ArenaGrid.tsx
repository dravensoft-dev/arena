import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaGrid.classes.generated.ts';

import type { ArenaGridClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaGridProps {
  className?: ArenaGridClass;

  /** The cells, one per child. Nothing is wrapped and nothing is measured: a child is a grid item exactly as it was written, so a card, a chart or a definition list all lay out the same way. */
  children?: React.ReactNode;
}

const arenaGridStyles = arenaStyles(manifest);
export function ArenaGrid({ className, children }: ArenaGridProps) {
  const styles = arenaGridStyles({});
  return (
    <div className={arenaClassName('ArenaGrid', styles.root(), className)} data-arena-part={manifest.parts.root}
      {...styles.$data.root()} data-arena-boundary="">
      {children}
    </div>
  );
}
