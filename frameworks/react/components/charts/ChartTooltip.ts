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
