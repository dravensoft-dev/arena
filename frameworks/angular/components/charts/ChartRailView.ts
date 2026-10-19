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
