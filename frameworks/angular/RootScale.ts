/* The px the sources are authored against, and the one figure CSS Fonts 4 gives `medium`, the initial
 * font-size, so a browser left alone has a root of this size. */
export const AUTHORED_ROOT_PX = 16;

/* How much larger than the authored root the user's root is: 1 at the browser default, 2 at 32px. A root
 * that does not parse, or is not positive, reads as the default. */
export function arenaTextScaleOf(rootFontSize: string | undefined): number {
  const px = Number.parseFloat(rootFontSize ?? '');
  return Number.isFinite(px) && px > 0 ? px / AUTHORED_ROOT_PX : 1;
}

/* A breakpoint token in pixels: `rem` follows the root font size, `px` stays px, anything else is NaN. */
export function arenaBreakpointPx(raw: string, rootFontSize: string | undefined): number {
  const text = raw.trim();
  const value = Number.parseFloat(text);
  if (!Number.isFinite(value)) return Number.NaN;
  if (text.endsWith('rem')) return value * AUTHORED_ROOT_PX * arenaTextScaleOf(rootFontSize);
  if (text.endsWith('px')) return value;
  return Number.NaN;
}

/* The media query that is the complement of the `md:` variant: `em` follows the browser default, never the
 * page's own root size, exactly as the `em` breakpoint in the stylesheet does. */
export function arenaBelowQuery(raw: string): string | null {
  const text = raw.trim();
  const value = Number.parseFloat(text);
  if (!Number.isFinite(value)) return null;
  if (text.endsWith('rem')) return `not all and (min-width: ${value}em)`;
  if (text.endsWith('px')) return `not all and (min-width: ${value}px)`;
  return null;
}
