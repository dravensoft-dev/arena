import {
  chartLegendMin, chartLegendMax, chartLegendGap, chartLabelGap, chartBubbleRMax,
} from '../../Tokens.generated';
import { ARENA_TEXT_ROOM } from '../../DataVisuals';
import type { ArenaTextRoom } from '../../DataVisuals';
import type { ArenaChartLegendLayout } from '../../Api.generated';

export interface ArenaLegendStrip {
  plotH: number;
  stripH: number;
  sizeH: number;
}

export function arenaLegendColumnWidth(width: number): number {
  return Math.min(chartLegendMax, Math.max(chartLegendMin, width * 0.34));
}

export function arenaLegendPlotWidth(width: number): number {
  return Math.max(1, width - arenaLegendColumnWidth(width) - chartLegendGap);
}

export function arenaLegendStacked(layout: ArenaChartLegendLayout, width: number): boolean {
  if (layout !== 'auto') return layout === 'stacked';
  return arenaLegendColumnWidth(width) < chartLegendMax;
}

export function arenaLegendShows(seriesCount: number): boolean {
  return seriesCount > 1;
}

export function arenaSizeKeyHeight(shows: boolean): number {
  return shows ? chartBubbleRMax * 2 + chartLabelGap : 0;
}

export function arenaLegendStrip(
  height: number, seriesCount: number, sizeKey = false, room: ArenaTextRoom = ARENA_TEXT_ROOM,
): ArenaLegendStrip {
  const stripH = arenaLegendShows(seriesCount) ? room.legendStrip : 0;
  const sizeH = arenaSizeKeyHeight(sizeKey);
  return { plotH: Math.max(1, height - stripH - sizeH), stripH, sizeH };
}

export function arenaHeatLegendStrip(
  height: number, room: ArenaTextRoom = ARENA_TEXT_ROOM,
): { plotH: number; stripH: number } {
  return { plotH: Math.max(1, height - room.legendStrip), stripH: room.legendStrip };
}
