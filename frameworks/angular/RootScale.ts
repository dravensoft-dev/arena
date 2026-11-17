/* The px the sources are authored against, and the one figure CSS Fonts 4 gives `medium`, the initial
 * font-size, so a browser left alone has a root of this size. */
export const AUTHORED_ROOT_PX = 16;

/* How much larger than the authored root the user's root is: 1 at the browser default, 2 at 32px. A root
 * that does not parse, or is not positive, reads as the default. */
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

/* A breakpoint token in pixels: `rem` follows the root font size, `px` stays px, anything else is NaN. */
export function arenaBreakpointPx(raw: string, rootFontSize: string | undefined): number {
  const parsed = parseBreakpoint(raw);
  if (!parsed) return Number.NaN;
  return parsed.unit === 'rem' ? parsed.value * AUTHORED_ROOT_PX * arenaTextScaleOf(rootFontSize) : parsed.value;
}

/* The media query that is the complement of the `md:` variant: `em` follows the browser default, never the
 * page's own root size, exactly as the `em` breakpoint in the stylesheet does. */
export function arenaBelowQuery(raw: string): string | null {
  const parsed = parseBreakpoint(raw);
  if (!parsed) return null;
  return `not all and (min-width: ${parsed.value}${parsed.unit === 'rem' ? 'em' : 'px'})`;
}
