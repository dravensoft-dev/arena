export const AUTHORED_ROOT_PX = 16;

export function arenaTextScaleOf(rootFontSize: string | undefined): number {
  const px = Number.parseFloat(rootFontSize ?? '');
  return Number.isFinite(px) && px > 0 ? px / AUTHORED_ROOT_PX : 1;
}

function parseBreakpoint(raw: string): { value: number; unit: 'rem' | 'px' } | null {
  const text = raw.trim();
  const value = Number.parseFloat(text);
  if (!Number.isFinite(value)) return null;
  if (text.endsWith('rem')) return { value, unit: 'rem' };
  if (text.endsWith('px')) return { value, unit: 'px' };
  return null;
}

export function arenaBreakpointPx(raw: string, rootFontSize: string | undefined): number {
  const parsed = parseBreakpoint(raw);
  if (!parsed) return Number.NaN;
  return parsed.unit === 'rem' ? parsed.value * AUTHORED_ROOT_PX * arenaTextScaleOf(rootFontSize) : parsed.value;
}

export function arenaBelowQuery(raw: string): string | null {
  const parsed = parseBreakpoint(raw);
  if (!parsed) return null;
  return `not all and (min-width: ${parsed.value}${parsed.unit === 'rem' ? 'em' : 'px'})`;
}
