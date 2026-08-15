import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaScrollerItem.classes.generated.ts';

export interface ArenaScrollerItemProps {

  /** What the cell holds, exactly as it was written. The item draws no surface, no line and no padding: it is a width and a snap point, and everything visible inside it is the consumer's or another component's. */
  children?: React.ReactNode;
}

const arenaScrollerItemStyles = arenaStyles(manifest);

export function ArenaScrollerItem({ children }: ArenaScrollerItemProps) {
  return <div className={arenaScrollerItemStyles().root()}>{children}</div>;
}
