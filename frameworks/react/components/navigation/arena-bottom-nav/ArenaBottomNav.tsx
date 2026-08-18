import React from 'react';
import { arenaInjectInto } from './BottomNavInject.tsx';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaBottomNav.classes.generated.ts';

export interface ArenaBottomNavProps {

  /** The id of the current destination. The ArenaBottomNavItem whose id matches is marked aria-current="page" and draws its glyph in the filled weight, and no item is marked when it names none of them. */
  active?: string;

  /** Names this navigation landmark. Required, and **guarded at runtime**: the guard trims before it decides, so a blank name is refused as well as an absent one, because a landmark present with no accessible name is the defect arriving through a value. A phone shell usually carries this bar AND a sidebar or a header, so two navigation landmarks share a page and the pattern asks each for a unique name; a constant default would satisfy the existence half and leave them indistinguishable. */
  ariaLabel: string;

  /** The destinations. One ArenaBottomNavItem each; which id is active and how each reports `nav` are the parent's to settle, and none of it is a member here. */
  children?: React.ReactNode;

  /** A destination was activated, carrying its id. Where the item has an href, Arena has already cancelled the anchor by the time this fires, so a listener routes and does not double-navigate; a modified click, a middle click and open-in-new-tab are the browser's and fire nothing, so a consumer who wires no listener still has a bar of real links. */
  onNav?: (id: string) => void;
}

const arenaBottomNavStyles = arenaStyles(manifest);

export function ArenaBottomNav({ active, ariaLabel, children, onNav }: ArenaBottomNavProps) {

  if (!ariaLabel?.trim()) throw new Error('ArenaBottomNav: `ariaLabel` is required, and names which navigation this landmark is');
  return (
    <nav aria-label={ariaLabel} className={arenaBottomNavStyles().root()} data-arena-part={manifest.parts.root}>
      {arenaInjectInto(children, { activeId: active, onActivate: onNav })}
    </nav>
  );
}
