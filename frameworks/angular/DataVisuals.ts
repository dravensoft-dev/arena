import {
  chartHeight, chartPadTop, chartPadRight, chartPadBottom, chartPadLeft, catSlots,
  tintArea, tintSoft, tintEdge,
} from './Tokens.generated';
import type { ArenaNumberFormat, ArenaSeriesTone, ArenaTone } from './Api.generated';
import { arenaWarnOnce } from './WarnOnce';

export const ARENA_CAT_SLOTS = catSlots;

export const ARENA_CHART_HEIGHT = chartHeight;

export const ARENA_PAD = {
  t: chartPadTop, r: chartPadRight, b: chartPadBottom, l: chartPadLeft,
} as const;

export const ARENA_SR_ONLY = {
  position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px',
  overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap', border: '0',
} as const satisfies Readonly<Record<string, string>>;

export function arenaCatIndex(slot: number): number {
  return Math.min(ARENA_CAT_SLOTS, Math.max(1, Math.round(slot) || 1));
}

export function arenaCatColor(slot: number): string {
  return `var(--color-cat-${arenaCatIndex(slot)})`;
}

export function arenaCatSlotFor(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return (hash % ARENA_CAT_SLOTS) + 1;
}

export interface ArenaCatSurface {
  fill: string;
  border: string;
}

export function arenaCatTint(colour: string): string {
  return `color-mix(in oklab, ${colour} ${tintSoft}%, var(--fill-surface))`;
}

export function arenaCatSurface(slot: number): ArenaCatSurface {
  const colour = arenaCatColor(slot);
  return {
    fill: arenaCatTint(colour),
    border: `color-mix(in oklab, ${colour} ${tintEdge}%, transparent)`,
  };
}

export function arenaAreaFill(colour: string): string {
  return `color-mix(in oklab, ${colour} ${tintArea}%, transparent)`;
}

export const ARENA_INK_BODY = 'color-mix(in oklab,var(--ink-body) var(--level-ink-body),transparent)';

export const ARENA_INK_MUTED = 'color-mix(in oklab,var(--ink-muted) var(--level-ink-muted),transparent)';

const TONE_VARS: Record<ArenaTone, string> = {
  neutral: ARENA_INK_BODY,
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
};

export function arenaToneColor(tone: ArenaTone): string {
  return TONE_VARS[tone];
}

export interface ArenaValueWriterOptions {
  prefix?: string;
  suffix?: string;
  format?: ArenaNumberFormat;
}

export function arenaValueWriter({ prefix, suffix, format }: ArenaValueWriterOptions): (value: number) => string {
  const head = prefix ?? '';
  const tail = suffix ?? '';
  if (!format) return (value) => `${head}${value}${tail}`;

  const options: Intl.NumberFormatOptions = {};
  if (format.fractionDigits !== undefined) {
    options.minimumFractionDigits = format.fractionDigits;
    options.maximumFractionDigits = format.fractionDigits;
  }
  if (format.grouping === false) options.useGrouping = false;
  if (format.compact) options.notation = 'compact';

  let intl: Intl.NumberFormat | null = null;
  try {
    intl = new Intl.NumberFormat(format.locale, options);
  } catch {
    arenaWarnOnce(`chart: valueFormat.locale "${format.locale}" is not a tag Intl accepts, so every number`
      + ' the chart writes falls back to the raw JavaScript one. A tick, a tooltip and the accessible'
      + ' table all read differently from the table beside them until it is a BCP-47 tag.');
  }
  return (value) => `${head}${intl ? intl.format(value) : value}${tail}`;
}

export function arenaPlotWidth(available: number, count: number, minPointSpacing: number | undefined): number {
  if (!minPointSpacing || !(minPointSpacing > 0) || count < 2) return available;
  const needed = ARENA_PAD.l + ARENA_PAD.r + minPointSpacing * (count - 1);
  return Math.max(available, needed);
}
export const ARENA_RAIL_STYLE = {
  overflowX: 'auto', overflowY: 'hidden', display: 'block', outlineOffset: 'var(--focus-offset)',
} as const satisfies Readonly<Record<string, string>>;

