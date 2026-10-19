import { useEffect, useState, type RefObject } from 'react';
import type { ArenaRailView } from './ChartTooltip.ts';

/** The rail's scroll position and visible width, kept in state. `syncView` reads the rail and is called from its scroll event and wherever the plot moves it; the hook calls it after any render whose `resync` values changed, so a container that narrows refreshes the view with no scroll or key. */
export function useArenaRailView(
  rail: RefObject<HTMLElement | null>,
  resync: readonly unknown[],
): readonly [ArenaRailView, () => void] {
  const [view, setView] = useState<ArenaRailView>({ left: 0, visible: 0 });
  const syncView = () => {
    const region = rail.current;
    if (!region) return;
    setView((was) => (was.left === region.scrollLeft && was.visible === region.clientWidth
      ? was : { left: region.scrollLeft, visible: region.clientWidth }));
  };
  useEffect(syncView, resync);
  return [view, syncView];
}
