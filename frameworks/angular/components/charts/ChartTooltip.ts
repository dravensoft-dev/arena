export interface ArenaTooltipAnchor {
  left: number;
  top: string;
}

export function arenaTooltipAnchor(x: number, y: number): ArenaTooltipAnchor {
  return { left: x, top: `calc(${y}px - var(--chart-tooltip-offset))` };
}

export function arenaScrolledAnchorX(x: number, scrollLeft: number, visible: number): number {
  return Math.min(Math.max(x - scrollLeft, 0), Math.max(visible, 0));
}

export interface ArenaRailView {
  left: number;
  visible: number;
}

/** The tooltip's x when the plot scrolls in a rail: a rail that scrolls anchors the mark in the rail's visible span, and one that fits keeps the mark's own x. A rail not yet measured reads as `available` wide. */
export function arenaRailAnchorX(x: number, scrolls: boolean, view: ArenaRailView, available: number): number {
  return scrolls ? arenaScrolledAnchorX(x, view.left, view.visible || available) : x;
}
