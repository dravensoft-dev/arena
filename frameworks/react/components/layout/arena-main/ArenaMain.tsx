import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaMain.classes.generated.ts';

export const ARENA_MAIN_ID = 'arena-main';

export interface ArenaMainProps {

  /** What the page is for, once the furniture around it is taken away. It is optional and unguarded rather than required: a router that has not resolved its route yet renders nothing, and a landmark that threw during that frame would fail on the ordinary case rather than on a mistake. */
  children?: React.ReactNode;
}

const arenaMainStyles = arenaStyles(manifest);

export function ArenaMain({ children }: ArenaMainProps) {
  return (
    <main id={ARENA_MAIN_ID} tabIndex={-1}
      className={arenaMainStyles().root()} data-arena-part={manifest.parts.root}>
      {children}
    </main>
  );
}
