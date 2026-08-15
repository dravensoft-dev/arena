import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaToastHost.classes.generated.ts';

import type { ArenaToastPlacement } from '../../../Api.generated';

export interface ArenaToastHostProps {

  /** Which corner the stack is pinned to. A bottom placement clears the device's own bottom inset, so a stack on a phone never lands under the home indicator. */
  placement?: ArenaToastPlacement;

  /** The notices, in the order they are read. The stack is a plain column and the visual order is the source order, whatever the corner: a reversed one would put the newest notice first on screen and last in the reading order, and the two must agree. Nothing here caps the count or times a dismissal, because the queue that produced these notices already holds their identity and their order, and a cap applied by the box that draws them would fight the queue that owns them. */
  children?: React.ReactNode;
}

const arenaToastHostStyles = arenaStyles(manifest);
const PLACEMENTS = Object.keys(manifest.variants.placement);
const placementOf = (placement: string | undefined): ArenaToastPlacement | undefined =>
  (placement && PLACEMENTS.includes(placement) ? placement as ArenaToastPlacement : undefined);

export function ArenaToastHost({ placement = 'bottom-end', children }: ArenaToastHostProps) {
  return <div className={arenaToastHostStyles({ placement: placementOf(placement) }).root()} data-arena-part={manifest.parts.root}>{children}</div>;
}
