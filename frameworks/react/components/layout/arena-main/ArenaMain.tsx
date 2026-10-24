import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaMain.classes.generated.ts';
import type { ArenaMainClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { ARENA_MAIN_ID } from '../MainRegion.ts';

export { ARENA_MAIN_ID } from '../MainRegion.ts';

export interface ArenaMainProps {
  className?: ArenaMainClass;


  /** What the page is for, once the furniture around it is taken away. The slot is optional and unguarded rather than required. A router that has not resolved its route yet renders nothing, and a landmark that threw during that frame would fail on the ordinary case rather than on a mistake. */
  children?: React.ReactNode;
}

const arenaMainStyles = arenaStyles(manifest);

export function ArenaMain({ className, children }: ArenaMainProps) {
  return (
    <main id={ARENA_MAIN_ID} tabIndex={-1}
      className={arenaClassName('ArenaMain', arenaMainStyles().root(), className, manifest.vocabulary)} data-arena-part={manifest.parts.root} {...arenaMainStyles().$data.root()} data-arena-boundary="">
      {children}
    </main>
  );
}
