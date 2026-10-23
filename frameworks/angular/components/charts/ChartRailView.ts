import { signal, untracked, type Signal } from '@angular/core';
import type { ArenaRailView } from './ChartTooltip';

export interface ArenaRailViewState {
  readonly view: Signal<ArenaRailView>;
  readonly sync: () => void;
}

/** The rail's scroll position and visible width, held in a signal. `sync` reads the rail and is called from its scroll event and wherever the plot moves it, so the view stays current when the container narrows with no scroll or key. */
export function arenaRailView(rail: () => HTMLElement | undefined): ArenaRailViewState {
  const view = signal<ArenaRailView>({ left: 0, visible: 0 });
  const sync = (): void => {
    const region = rail();
    if (!region) return;
    const was = untracked(() => view());
    if (was.left !== region.scrollLeft || was.visible !== region.clientWidth) {
      view.set({ left: region.scrollLeft, visible: region.clientWidth });
    }
  };
  return { view: view.asReadonly(), sync };
}

/** The scroll position that puts the span `[start, end]` inside the rail's visible width: `scrollLeft` unchanged when the span is already inside, `start` when it begins before the view, otherwise `end - visible` when it ends past the view. A span wider than the view that begins before it shows its start; one that begins inside it is scrolled to its end. */
export function arenaRailReveal(start: number, end: number, scrollLeft: number, visible: number): number {
  if (start < scrollLeft) return start;
  if (end > scrollLeft + visible) return end - visible;
  return scrollLeft;
}
