import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaScroller.classes.generated.ts';

import type { ArenaScrollerBehaviour } from '../../../Api.generated';

export interface ArenaScrollerProps {

  /** Names the row to assistive technology, and nothing else supplies it: a group announced as a group tells a reader that focus moved and nothing about where it landed. Required, and guarded at runtime after trimming, the shape ArenaTable.label carries for the same reason, since the value the guard exists to catch is a present and useless one. */
  label: string;

  /** The items in the row, one per child. Nothing is wrapped: a child is laid out exactly as it was written, at the width itemWidth names. Required, and guarded at runtime: an empty row is a tab stop over nothing, which is the dead stop a component with a group role must not ship. */
  children: React.ReactNode;

  /** How wide each item is laid out, which a rail has to answer and a grid answers with the same role: the width of a card is one decision, and a wall of them and a row of them should not disagree about it. It is a length rather than a step on the spacing scale, for the reason ArenaGrid.min is one, and it reaches the children as a custom property because a row sets its items' width and cannot reach inside them. */
  itemWidth?: string;

  /** Whether the row settles on an item or wherever it was left. Snap by default, because a rail of equal-width cards left halfway across one is a card the reader has to finish scrolling by hand. Nothing moves on its own under either value, so neither answers prefers-reduced-motion and no pause control is owed. */
  behaviour?: ArenaScrollerBehaviour;
}

const arenaScrollerStyles = arenaStyles(manifest);
const BEHAVIOURS = Object.keys(manifest.variants.behaviour);
const behaviourOf = (behaviour: string | undefined): ArenaScrollerBehaviour =>
  (behaviour && BEHAVIOURS.includes(behaviour) ? behaviour as ArenaScrollerBehaviour : 'snap');

export function ArenaScroller({
  label, children, itemWidth = 'var(--grid-min)', behaviour = 'snap',
}: ArenaScrollerProps) {
  if (!label?.trim()) {
    throw new Error('ArenaScroller: `label` is required, and names the row a reader lands on');
  }
  if (React.Children.toArray(children).length === 0) {
    throw new Error('ArenaScroller: a row with no children is a tab stop over nothing');
  }

  return (
    <div role="group" aria-label={label} tabIndex={0}
      className={arenaScrollerStyles({ behaviour: behaviourOf(behaviour) }).root()}
      style={{ '--arena-scroller-item': itemWidth } as React.CSSProperties}>
      {children}
    </div>
  );
}
